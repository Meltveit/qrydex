/**
 * Production Bot Runner
 * Runs data enrichment bots in sequence
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║          🤖 QRYDEX DATA ENRICHMENT SYSTEM 🤖                 ║
║                                                               ║
║  "Building the Google for Businesses"                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Starting time: ${new Date().toLocaleString()}
`);

async function main() {
    console.log('\n📊 Phase 1: Checking current data...\n');

    // Count businesses
    const { count: totalBusinesses } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

    console.log(`  Total businesses: ${totalBusinesses}`);

    // Count by country
    const { data: byCountry } = await supabase
        .from('businesses')
        .select('country_code')
        .limit(10000);

    const countryCount = {};
    byCountry?.forEach(b => {
        countryCount[b.country_code] = (countryCount[b.country_code] || 0) + 1;
    });

    console.log('\n  Distribution by country:');
    Object.entries(countryCount)
        .sort((a, b) => b[1] - a[1])
        .forEach(([country, count]) => {
            console.log(`    ${country}: ${count}`);
        });

    // Check websites
    const { count: withDomain } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .not('domain', 'is', null);

    const { count: scraped } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .not('company_description', 'is', null);

    const { count: translated } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .not('translations', 'is', null);

    console.log(`\n  With website: ${withDomain}/${totalBusinesses} (${((withDomain / totalBusinesses) * 100).toFixed(1)}%)`);
    console.log(`  Scraped: ${scraped}/${totalBusinesses} (${((scraped / totalBusinesses) * 100).toFixed(1)}%)`);
    console.log(`  Translated: ${translated}/${totalBusinesses} (${((translated / totalBusinesses) * 100).toFixed(1)}%)`);

    console.log('\n\n✅ Data check complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Add more EU businesses (populate-nordic-eu.ts)');
    console.log('   2. Find missing websites (website-discovery-bot.ts)');
    console.log('   3. Scrape websites (parallel-scraper.ts)');
    console.log('   4. Translate content (translation-bot.ts)');
    console.log('\n💡 Tip: Bot files are in lib-external/ folder');
    console.log('    They need to be compiled or run with tsx\n');
}

main().catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
});
