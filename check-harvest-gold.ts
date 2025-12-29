import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServerClient } from './src/lib/supabase';

async function checkHarvestGold() {
    const supabase = createServerClient();

    console.log('🔍 Checking Harvest Gold Corp data...\n');

    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .ilike('legal_name', '%harvest%gold%')
        .single();

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (!data) {
        console.log('❌ Business not found');
        return;
    }

    console.log('📊 Business Info:');
    console.log('  Name:', data.legal_name);
    console.log('  Domain:', data.domain);
    console.log('\n📝 Scraped Data:');
    console.log('  Description:', data.company_description ? `✅ ${data.company_description.substring(0, 100)}...` : '❌ Missing');
    console.log('  Product Categories:', data.product_categories?.length > 0 ? `✅ ${data.product_categories.join(', ')}` : '❌ Missing');
    console.log('  Sitelinks:', data.sitelinks?.length > 0 ? `✅ ${data.sitelinks.length} links` : '❌ Missing');
    console.log('  Logo URL:', data.logo_url ? '✅ Present' : '❌ Missing');
    console.log('  Social Media:', data.social_media && Object.keys(data.social_media).length > 0 ? `✅ ${Object.keys(data.social_media).join(', ')}` : '❌ Missing');
    console.log('  Translations:', data.translations && Object.keys(data.translations).length > 0 ? `✅ ${Object.keys(data.translations).length} languages` : '❌ Missing');

    console.log('\n📈 Scraping Stats:');
    console.log('  Pages Indexed:', data.indexed_pages_count || 0);
    console.log('  Last Crawled:', data.website_last_crawled || 'Never');
    console.log('  Scrape Count:', data.scrape_count || 0);
    console.log('  Last Scraped:', data.last_scraped_at || 'Never');
    console.log('  Next Scrape:', data.next_scrape_at || 'Not scheduled');
    console.log('  Status:', data.website_status || 'Unknown');

    console.log('\n🔬 Quality Analysis:');
    const qa = data.quality_analysis as any;
    if (qa) {
        console.log('  Trust Score:', data.trust_score || 0);
        console.log('  Has SSL:', qa.has_ssl ? '✅' : '❌');
        console.log('  Professional Email:', qa.professional_email ? '✅' : '❌');
        console.log('  Contact Email:', qa.contact_email || 'None');
        console.log('  Products in QA:', qa.products ? Object.keys(qa.products).join(', ') : 'None');
        console.log('  Services in QA:', qa.services ? Object.keys(qa.services).join(', ') : 'None');
    }
}

checkHarvestGold().catch(console.error);
