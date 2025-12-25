
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { WebsiteScraper } from './src/lib/crawler/website-scraper';
import { analyzeWebsite } from './src/lib/ai/website-analyzer';

console.log('Ensure env loaded. URL exists?', !!process.env.NEXT_PUBLIC_SUPABASE_URL);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("❌ Fatal: NEXT_PUBLIC_SUPABASE_URL is missing!");
    process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function forceCrawlVisma() {
    console.log('🚀 Force Crawling Visma...');

    // 1. Get Visma
    const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .ilike('legal_name', '%visma%')
        .not('domain', 'is', null) // Must have domain
        .limit(1)
        .single();

    if (error || !business) {
        console.error('❌ Could not find Visma with a domain.', error);
        return;
    }

    console.log(`🎯 Target: ${business.legal_name} (${business.domain})`);

    // 2. Scrape
    console.log('🕸️ Scraping website...');
    const scraper = new WebsiteScraper();
    const scrapedData = await scraper.scrape(business.domain);

    if (!scrapedData) {
        console.error('❌ Scraping failed (no data returned).');
        return;
    }

    console.log('✅ Scraped successfully. Pages:', scrapedData.pages.length);
    console.log('📄 Main Text snippet:', scrapedData.mainText.substring(0, 100) + '...');

    // 3. Analyze (AI)
    console.log('🧠 Analyzing with AI (Gemini)...');

    try {
        const analysis = await analyzeWebsite(scrapedData, business.legal_name);

        if (!analysis) {
            console.error('❌ AI Analysis failed.');
            return;
        }

        console.log('✨ Analysis complete!');
        console.log('Description:', analysis.company_description);
        console.log('Products:', analysis.products?.length);

        // 4. Update DB
        console.log('💾 Saving to DB...');
        const { error: updateError } = await supabase
            .from('businesses')
            .update({
                company_description: analysis.company_description,
                products: analysis.products,
                services: analysis.services,
                website_data: scrapedData,
                website_last_crawled: new Date().toISOString(),
                last_checked: new Date().toISOString()
            })
            .eq('id', business.id);

        if (updateError) {
            console.error('❌ Save failed:', updateError);
        } else {
            console.log('✅ SAVED! Visma is now fully populated.');
        }

    } catch (err) {
        console.error("AI Analysis crashed:", err);
    }
}

forceCrawlVisma();
