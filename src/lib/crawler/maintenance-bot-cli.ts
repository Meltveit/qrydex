
import { createServerClient } from '../supabase';
import { analyzeBusinessCredibility } from '../ai/scam-detector';
import { scrapeWebsite } from './website-scraper';
import pLimit from 'p-limit';

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
                // Fetch businesses that either:
                // 1. Have quality_analysis (scraped) but missing scam/enrichment check
                // 2. Have NO quality_analysis (never scraped or failed) but HAVE a domain
                // 3. Have quality_analysis but NO description (failed scrape)
                // We fetch a batch and filter in code for flexibility
                // Priority 1: Virgin Targets (Domain exists, but never scraped/analyzed)
                // We fetch rows where quality_analysis IS NULL
                let { data: priorityBatch, error: pError } = await supabase
                    .from('businesses')
                    .select('id, domain, legal_name, company_description, org_number, registry_data, quality_analysis')
                    .not('domain', 'is', null)
                    .is('quality_analysis', null)
                    .limit(20);

                if (pError) console.error('Priority Fetch Error:', pError.message);

                let businesses = priorityBatch || [];
                let mode = 'RESCUE_VIRGIN';

                // Priority 2: Incomplete Targets (Scraped, but failed description)
                if (businesses.length < 10) {
                    const { data: incompleteBatch } = await supabase
                        .from('businesses')
                        .select('id, domain, legal_name, company_description, org_number, registry_data, quality_analysis')
                        .not('domain', 'is', null)
                        .not('quality_analysis', 'is', null)
                        .is('company_description', null) // Explicitly missing description
                        .limit(20);

                    if (incompleteBatch && incompleteBatch.length > 0) {
                        businesses = [...businesses, ...incompleteBatch];
                        mode = (mode === 'RESCUE_VIRGIN' && businesses.length === incompleteBatch.length) ? 'RESCUE_BROKEN' : 'HYBRID';
                    }
                }

                // Priority 3: Enrichment/Maintenance (Standard rotation)
                if (businesses.length < 50) {
                    // Get random sample or oldest updated for general maintenance
                    // Using a random order or just taking next batch to avoid getting stuck on same 50
                    // Note: Supabase random() is tricky, so we use a range or just offset based on time if possible.
                    // For now, valid "maintenance" candidates are those with old timestamps
                    const { data: maintenanceBatch } = await supabase
                        .from('businesses')
                        .select('id, domain, legal_name, company_description, org_number, registry_data, quality_analysis')
                        .not('domain', 'is', null)
                        .not('quality_analysis', 'is', null)
                        .order('updated_at', { ascending: true }) // Check oldest records first
                        .limit(30);

                    if (maintenanceBatch) {
                        businesses = [...businesses, ...maintenanceBatch];
                    }
                }

                // Deduplicate by ID
                businesses = Array.from(new Map(businesses.map(b => [b.id, b])).values());

                if (!businesses || businesses.length === 0) {
                    console.log('✅ No businesses found to check.');
                } else {
                    console.log(`🔎 Mode: ${mode} | Analyizing batch of ${businesses.length} businesses`);

                    // Filter for those needing attention (Double Check)
                    const toAnalyze = businesses.filter(b => {
                        const qa = b.quality_analysis as any;

                        // Case A: Never scraped or Scrape Failed (no QA object)
                        if (!qa) return true;

                        // Case B: Scraped but empty description (failed content extraction)
                        if (!b.company_description || b.company_description.length < 10) return true;

                        // Case C: Missing Intelligence (Scam check or Enrichment)
                        return qa.scraped_at && (qa.isScam === undefined || qa.certifications === undefined);
                    });

                    if (toAnalyze.length === 0) {
                        console.log('✅ All fetched businesses are already analyzed.');
                    } else {
                        console.log(`Found ${toAnalyze.length} businesses needing scam check.`);

                        // Process in parallel with concurrency limit
                        const limit = pLimit(3); // Run 3 sites simultaneously

                        const tasks = toAnalyze.map(business => limit(async () => {
                            console.log(`  🛡️ Checking: ${business.legal_name}`);
                            const qa = business.quality_analysis as any;

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
                                return;
                            }

                            const analysis = await analyzeBusinessCredibility(
                                business,
                                business.registry_data as any,
                                websiteData
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
                        }));

                        await Promise.all(tasks);
                    }
                }

                console.log('\n⏱️  Sleeping 2 minutes...');
                await new Promise(resolve => setTimeout(resolve, 120000));

            } catch (err: any) {
                console.error('❌ Error:', err.message);
                await new Promise(resolve => setTimeout(resolve, 60000));
            }
        }
    }

    runMaintenance().catch(console.error);
}
