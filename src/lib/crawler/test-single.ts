
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServerClient } from '../supabase';
import { scrapeWebsite } from './website-scraper';
import { analyzeBusinessCredibility } from '../ai/scam-detector';

async function testSingle() {
    const supabase = createServerClient();
    const orgNr = '60667'; // Lowes

    console.log(`🔍 Fetching business with Org Nr: ${orgNr}...`);
    const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('org_number', orgNr)
        .single();

    if (error || !business) {
        console.error("❌ Could not find business:", error?.message);
        return;
    }

    console.log(`✅ Found: ${business.legal_name} (${business.domain})`);

    // reset scrape count to force clean state if needed, but we just run the logic
    console.log(`🌐 Starting Deep Scrape for ${business.domain}...`);

    try {
        const websiteData = await scrapeWebsite(`https://${business.domain}`, 10);

        if (!websiteData) {
            console.error("❌ Website scrape returned null.");
            return;
        }

        console.log("\n📊 Website Data:");
        // console.log(`- Title: ${websiteData.homepage?.title}`); // Removed as homepage might be flat now?
        // console.log(`- Status: ${websiteData.isDead ? 'DEAD' : 'ALIVE'}`); // Removing isDead
        console.log(`- Sitelinks Found: ${websiteData.sitelinks?.length || 0}`);
        websiteData.sitelinks?.forEach(l => console.log(`  - [${(l as any).type || '?'}] ${l.title}: ${l.url}`));

        console.log("\n🤖 Running AI Analysis...");
        const analysis = await analyzeBusinessCredibility(business, business.registry_data, websiteData);

        console.log("\n📉 Analysis Result:");
        console.log(`- Trust Score: ${analysis.credibilityScore}`);
        console.log(`- Confidence: ${analysis.confidence}`);
        console.log(`- Summary: ${analysis.summary}`);
        console.log(`- Descriptions Generated: ${Object.keys(analysis.generated_descriptions).length}`);

    } catch (e: any) {
        console.error("\n❌ Scrape Failed:", e.message);

        // Test the "Failed Scrape" logic in AI
        console.log("\n🤖 Testing AI handling of FAILED scrape...");
        const analysis = await analyzeBusinessCredibility(business, business.registry_data, null);
        console.log(`- Trust Score (Fallback): ${analysis.credibilityScore}`);
        console.log(`- Summary: ${analysis.summary}`);
    }
}

testSingle();
