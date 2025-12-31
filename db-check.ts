
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkNvidia() {
    // Nvidia CIK is 1045810, usually padded to 0001045810
    // But let's search by name to be sure
    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .ilike('legal_name', '%NVIDIA%')
        .eq('country_code', 'US');

    if (error) {
        console.error(error);
        return;
    }

    console.log('--- DB RECORDS FOUND ---');
    data.forEach(b => {
        console.log(`Name: ${b.legal_name}`);
        console.log(`OrgNum: ${b.org_number}`);
        console.log(`Registry Data Keys:`, Object.keys(b.registry_data || {}));
        console.log(`Registry Data FULL:`, JSON.stringify(b.registry_data, null, 2));
    });
}

checkNvidia();
