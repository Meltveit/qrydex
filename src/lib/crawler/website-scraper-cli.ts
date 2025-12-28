import { createServerClient } from '../supabase';
import { scrapeWebsite } from './website-scraper';
import { analyzeBusinessCredibility } from '../ai/scam-detector';

// CLI execution - RUNS CONTINUOUSLY
if (require.main === module) {
    console.log('🤖 Website Scraper - CONTINUOUS MODE');
    console.log('   Continuously scraping business websites');
    console.log('   Press Ctrl+C to stop\n');

    let cycleCount = 0;

    async function runContinuously() {
        const supabase = createServerClient();

        // eslint-disable-next-line no-constant-condition
        while (true) {
            cycleCount++;
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔄 CYCLE ${cycleCount} - ${new Date().toLocaleString()}`);
            console.log(`${'='.repeat(60)}\n`);

            try {
                // Get businesses with domains but no scraped data
                const { data: businesses, count } = await supabase
                    .from('businesses')
                    .select('id, domain, legal_name, org_number, registry_data, quality_analysis', { count: 'exact' })
                    .not('domain', 'is', null)
                    .is('company_description', null)
                    .limit(20); // Process 20 per cycle

                if (!businesses || businesses.length === 0) {
                    console.log('✅ All websites scraped! Waiting for new websites...');
                } else {
                    console.log(`Found ${count} unscraped websites`);
                    console.log(`Processing ${businesses.length} in this cycle...\n`);

                    for (const business of businesses) {
                        try {
                            console.log(`  🌐 Scraping: ${business.domain}`);
                            const data = await scrapeWebsite(`https://${business.domain}`);

                            if (data) {
                                // Run AI Credibility Analysis
                                const analysis = await analyzeBusinessCredibility(
                                    business,
                                    business.registry_data as any,
                                    data
                                );

                                // Merge quality analysis
                                const existingQuality = (business.quality_analysis as any) || {};
                                const enrichedData = data.enrichedData;

                                const updatedQuality = {
                                    ...existingQuality,
                                    ...analysis, // isScam, confidence, redFlags, trustSignals, riskLevel, summary
                                    // Add enriched data from deep crawl
                                    website_url: enrichedData?.homepage_url || existingQuality?.website_url,
                                    contact_email: enrichedData?.contact_info?.emails?.[0] || existingQuality?.contact_email,
                                    contact_phone: enrichedData?.contact_info?.phones?.[0] || existingQuality?.contact_phone,
                                    industry_category: enrichedData?.industry_category || existingQuality?.industry_category,
                                    ai_summary: enrichedData?.company_description || data.description || existingQuality?.ai_summary,
                                    has_ssl: enrichedData?.has_ssl ?? existingQuality?.has_ssl,
                                    professional_email: enrichedData?.contact_info?.emails?.some((e: string) => !e.includes('gmail') && !e.includes('hotmail')) ?? false,
                                    detected_language: data.detectedLanguage,
                                    scraped_at: new Date().toISOString()
                                };

                                // Update database
                                await supabase
                                    .from('businesses')
                                    .update({
                                        company_description: enrichedData?.company_description || data.description,
                                        products: enrichedData?.products?.en || data.products,
                                        services: enrichedData?.services?.en || data.services,
                                        logo_url: enrichedData?.logo_url || data.logoUrl,
                                        social_media: enrichedData?.contact_info?.social_media || data.socialMedia,
                                        quality_analysis: updatedQuality,
                                        last_scraped_at: new Date().toISOString()
                                    })
                                    .eq('id', business.id);

                                console.log(`  ✅ Success: ${business.legal_name}`);
                            }

                            // Rate limiting
                            console.log('  ⏳ Cooling down (60s)...');
                            await new Promise(resolve => setTimeout(resolve, 60000));

                        } catch (error: any) {
                            console.error(`  ❌ Error scraping ${business.domain}:`, error.message);
                        }
                    }
                }

                console.log('\n⏱️  Sleeping 20 minutes before next cycle...');
                await new Promise(resolve => setTimeout(resolve, 20 * 60 * 1000)); // 20 min

            } catch (err: any) {
                console.error('❌ Error in cycle:', err.message);
                console.log('   Retrying in 5 minutes...');
                await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
            }
        }
    }

    runContinuously().catch((err) => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
}
