
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServerClient } from '../supabase';
import { scrapeWebsite } from './website-scraper';
import { analyzeBusinessCredibility } from '../ai/scam-detector';

async function testSingle() {
    const supabase = createServerClient();
    const orgNr = '912676951'; // Advokatene i Valdres

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

        // --- SAVE TO DB ---
        console.log("\n💾 SAVING TO DATABASE...");
        const enriched = websiteData.enrichedData || {};
        // Calculate Professional Email (Simple heuristic)
        const emails = websiteData.contactInfo?.emails || [];
        const genericDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'online.no', 'live.no'];
        const hasProfessionalEmail = emails.some(e => {
            const domain = e.split('@')[1]?.toLowerCase();
            return domain && !genericDomains.includes(domain);
        });

        const hasSsl = websiteData.homepage?.url?.startsWith('https') || false;

        const updates = {
            company_description: websiteData.description || enriched.company_description,
            logo_url: websiteData.logoUrl || enriched.logo_url,
            social_media: websiteData.socialMedia || enriched.contact_info?.social_media,
            website_status: 'active',
            website_last_crawled: new Date().toISOString(),
            last_scraped_at: new Date().toISOString(),
            quality_analysis: {
                isScam: analysis?.isScam,
                riskScore: analysis?.riskLevel,
                confidence: analysis?.confidence,
                scamReasons: analysis?.redFlags,
                trustScore: analysis?.credibilityScore,
                contact_info: websiteData.contactInfo,
                sitelinks: websiteData.sitelinks,
                scraped_at: new Date().toISOString(),
                has_ssl: hasSsl, // ADDED
                professional_email: hasProfessionalEmail, // ADDED
                contact_email: emails[0] || null
            },
            sitelinks: websiteData.sitelinks,
            trust_score: analysis?.credibilityScore || 0,
            trust_score_breakdown: {},
            indexed_pages_count: websiteData.subpages.length + 1
        };

        const { error: updateError } = await supabase
            .from('businesses')
            .update(updates)
            .eq('id', business.id);

        if (updateError) {
            console.error("❌ DB Update Failed:", updateError.message);
        } else {
            console.log("✅ DB Update Successful! Check the UI.");
        }

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
