
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkVismaStatus() {
    console.log('🔍 Checking Visma status...');
    const { data: b, error } = await supabase
        .from('businesses')
        .select('legal_name, domain, website_last_crawled, created_at')
        .ilike('legal_name', '%visma%')
        .limit(1)
        .single();

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    if (b) {
        console.log('Name:', b.legal_name);
        console.log('Domain:', b.domain || 'NULL (Missing!)');
        console.log('Last Crawled:', b.website_last_crawled || 'NEVER');
        console.log('Created At:', b.created_at);
    } else {
        console.log('Visma not found.');
    }
}

checkVismaStatus();
