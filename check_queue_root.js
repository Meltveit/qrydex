
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQueue() {
    console.log("Starting DB check (JS)...");

    // Check count of 'needs_rescue'
    const { count, error } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('website_status', 'needs_rescue');

    if (error) {
        console.error("DB Error:", error.message);
    } else {
        console.log(`\n📊 STATUS REPORT:`);
        console.log(`   Items waiting for rescue: ${count}`);
    }

    // Check recent updates
    const { data: recent } = await supabase
        .from('businesses')
        .select('legal_name, last_scraped_at, website_status, org_number')
        .order('last_scraped_at', { ascending: false })
        .limit(5);

    console.log(`   Latest 5 updates:`);
    recent?.forEach(b => console.log(`   - ${b.legal_name}: ${b.website_status} @ ${b.last_scraped_at} (Org: ${b.org_number})`));
}

checkQueue().catch(console.error);
