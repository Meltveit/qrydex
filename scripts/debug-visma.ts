
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkVisma() {
    console.log('🔍 Searching for Visma...');
    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .ilike('legal_name', '%visma%')
        .limit(1);

    if (error) {
        console.error('DB Error:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('❌ Visma not found in DB.');
    } else {
        const b = data[0];
        console.log('✅ Found:', b.legal_name);
        console.log('Desc:', b.company_description);
        console.log('Prods:', JSON.stringify(b.products));
        console.log('Servs:', JSON.stringify(b.services));
        // console.log('WebData:', JSON.stringify(b.website_data));
    }
}

checkVisma();
