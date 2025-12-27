
import { createServerClient } from '../supabase';
import { analyzeBusinessCredibility } from '../ai/scam-detector';
import { scrapeWebsite } from './website-scraper';

// CLI execution - RUNS CONTINUOUSLY
if (require.main === module) {
    console.log('🛡️ Maintenance & Scam Detector Bot - CONTINUOUS MODE');
    console.log('   Retroactively checking businesses for scam indicators');
    console.log('   Using dedicated API Key\n');

    let cycleCount = 0;

    async function runMaintenance() {
        const supabase = createServerClient();

        while (true) {
            cycleCount++;
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔄 CYCLE ${cycleCount} - ${new Date().toLocaleString()}`);
            console.log(`${'='.repeat(60)}\n`);

            try {
                // Fetch businesses that have been scraped but NOT analyzed for scams yet
                // Or businesses analyzed long ago? For now, focus on missing analysis.
                // We fetch businesses with quality_analysis but check content in JS
                const { data: businesses, count } = await supabase
                    .from('businesses')
                    .select('id, domain, legal_name, org_number, registry_data, quality_analysis', { count: 'exact' })
                    .not('quality_analysis', 'is', null)
                    .limit(50); // Fetch batch

                if (!businesses || businesses.length === 0) {
                    console.log('✅ No businesses found to check.');
                } else {
                    // Filter for those missing 'isScam' OR missing 'certifications' (enrichment backfill)
                    const toAnalyze = businesses.filter(b => {
                        const qa = b.quality_analysis as any;
                        // Needs analysis if:
                        // 1. isScam is undefined (never checked)
                        // 2. certifications is undefined (checked before enrichment update)
                        return qa && qa.scraped_at && (qa.isScam === undefined || qa.certifications === undefined);
                    });

                    if (toAnalyze.length === 0) {
                        console.log('✅ All fetched businesses are already analyzed.');
                    } else {
                        console.log(`Found ${toAnalyze.length} businesses needing scam check.`);

                        for (const business of toAnalyze) {
                            console.log(`  🛡️ Checking: ${business.legal_name}`);

                            // Re-scrape website to get deep content for enrichment
                            // We use maxPages=3 to be faster for maintenance
                            let websiteData: any = null;
                            try {
                                websiteData = await scrapeWebsite(business.domain, 3);
                            } catch (e) {
                                console.error(`   ❌ Scrape failed for ${business.domain}`);
                            }

                            if (!websiteData) {
                                console.log(`   ⚠️ Could not scrape. Skipping.`);
                                continue;
                            }

                            const analysis = await analyzeBusinessCredibility(
                                business,
                                business.registry_data as any,
                                mockWebsiteData
                            );

                            if (analysis) {
                                // Merge logic
                                const updatedQuality = {
                                    ...qa,
                                    ...analysis,
                                    scam_checked_at: new Date().toISOString()
                                };

                                await supabase
                                    .from('businesses')
                                    .update({ quality_analysis: updatedQuality })
                                    .eq('id', business.id);

                                console.log(`  ✅ Verified. Risk: ${analysis.riskLevel}`);
                            }

                            // Rate limit (Gemini Maintenance Key)
                            await new Promise(r => setTimeout(r, 2000));
                        }
                    }
                }

                console.log('\n⏱️  Sleeping 5 minutes...');
                await new Promise(resolve => setTimeout(resolve, 300000));

            } catch (err: any) {
                console.error('❌ Error:', err.message);
                await new Promise(resolve => setTimeout(resolve, 60000));
            }
        }
    }

    runMaintenance().catch(console.error);
}
