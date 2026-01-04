
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createServerClient } from './src/lib/supabase';

async function checkQueue() {
    console.log("Starting DB check...");
    const supabase = createServerClient();

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
