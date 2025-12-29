import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServerClient } from './src/lib/supabase';

async function checkRecentScrapes() {
    const supabase = createServerClient();

    console.log('🔍 Checking recently scraped businesses...\n');

    // Get businesses scraped in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('businesses')
        .select('legal_name, domain, company_description, product_categories, indexed_pages_count, last_scraped_at, scrape_count')
        .gte('last_scraped_at', oneHourAgo)
        .order('last_scraped_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('❌ No businesses scraped in the last hour');
        return;
    }

    console.log(`✅ Found ${data.length} recently scraped businesses:\n`);

    for (const biz of data) {
        console.log(`📊 ${biz.legal_name}`);
        console.log(`   Domain: ${biz.domain}`);
        console.log(`   Description: ${biz.company_description ? '✅ ' + biz.company_description.substring(0, 80) + '...' : '❌ Missing'}`);
        console.log(`   Categories: ${biz.product_categories?.length || 0} items`);
        console.log(`   Pages Indexed: ${biz.indexed_pages_count || 0}`);
        console.log(`   Scrape Count: ${biz.scrape_count || 0}`);
        console.log(`   Last Scraped: ${biz.last_scraped_at}`);
        console.log('');
    }

    // Check Harvest Gold specifically
    console.log('\n🔍 Checking Harvest Gold Corp position in queue...\n');

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: queue, count } = await supabase
        .from('businesses')
        .select('legal_name, domain, last_scraped_at', { count: 'exact' })
        .not('domain', 'is', null)
        .is('company_description', null)
        .or(`last_scraped_at.is.null,last_scraped_at.lt.${yesterday}`)
        .order('created_at', { ascending: false })
        .limit(50);

    console.log(`📋 Total businesses in queue: ${count}`);

    if (queue) {
        const harvestIndex = queue.findIndex(b => b.legal_name?.includes('HARVEST') && b.legal_name?.includes('GOLD'));
        if (harvestIndex >= 0) {
            console.log(`✅ Harvest Gold Corp found at position ${harvestIndex + 1} in queue`);
            console.log(`   (Will be processed in ${Math.ceil((harvestIndex + 1) / 20)} cycles from now)`);
        } else {
            console.log('❌ Harvest Gold Corp NOT in queue (might not match criteria)');
        }
    }
}

checkRecentScrapes().catch(console.error);
