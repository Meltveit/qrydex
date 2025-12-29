

import { createServerClient } from '../supabase';
import { analyzeBusinessCredibility } from '../ai/scam-detector';
import { scrapeWebsite } from './website-scraper';
import { calculateTrustScore } from '../trust-score';
import { verifyBusiness } from '../registry-apis';
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
                    .select('id, domain, legal_name, company_description, org_number, country_code, registry_data, quality_analysis, logo_url')
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
                        .select('id, domain, legal_name, company_description, org_number, country_code, registry_data, quality_analysis, logo_url')
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
                        .select('id, domain, legal_name, company_description, org_number, country_code, registry_data, quality_analysis, logo_url')
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

                            // CRITICAL FIX: Save scraped data BEFORE analysis
                            // Extract enriched data from deep crawl
                            const enrichedData = websiteData.enrichedData;
                            const updates: any = {};

                            // Save company description
                            if (enrichedData?.company_description && !business.company_description) {
                                updates.company_description = enrichedData.company_description;
                            }

                            // Save logo
                            if (enrichedData?.logo_url && !business.logo_url) {
                                updates.logo_url = enrichedData.logo_url;
                            }

                            // Save social media
                            if (enrichedData?.contact_info?.social_media) {
                                updates.social_media = enrichedData.contact_info.social_media;
                            }

                            // Save products & services
                            if (enrichedData?.products) {
                                updates.products = enrichedData.products.en || [];
                            }
                            if (enrichedData?.services) {
                                updates.services = enrichedData.services.en || [];
                            }

                            const analysis = await analyzeBusinessCredibility(
                                business,
                                business.registry_data as any,
                                websiteData
                            );

                            if (analysis) {
                                // Merge logic - preserve existing quality analysis and add new data
                                const updatedQuality = {
                                    ...qa,
                                    ...analysis,
                                    // Add enriched data from deep crawl
                                    website_url: enrichedData?.homepage_url || qa?.website_url,
                                    contact_email: enrichedData?.contact_info?.emails?.[0] || qa?.contact_email,
                                    all_emails: enrichedData?.contact_info?.emails || qa?.all_emails,
                                    contact_phone: enrichedData?.contact_info?.phones?.[0] || qa?.contact_phone,
                                    industry_category: enrichedData?.industry_category || qa?.industry_category,
                                    ai_summary: enrichedData?.company_description || qa?.ai_summary,
                                    has_ssl: enrichedData?.has_ssl ?? qa?.has_ssl,
                                    professional_email: enrichedData?.contact_info?.emails?.some((e: string) => !e.includes('gmail') && !e.includes('hotmail')) ?? false,
                                    scam_checked_at: new Date().toISOString()
                                };

                                // Calculate trust score based on data completeness
                                const { score, breakdown } = calculateTrustScore({
                                    registry_data: business.registry_data,
                                    company_description: updates.company_description || business.company_description,
                                    logo_url: updates.logo_url || business.logo_url,
                                    social_media: updates.social_media || enrichedData?.contact_info?.social_media,
                                    sitelinks: enrichedData?.sitelinks,
                                    product_categories: [
                                        ...(enrichedData?.products?.en || []),
                                        ...(enrichedData?.services?.en || [])
                                    ],
                                    translations: (business as any).translations,
                                    industry_category: enrichedData?.industry_category,
                                    quality_analysis: updatedQuality,
                                    indexed_pages_count: enrichedData?.total_pages_indexed
                                });

                                // Verify org_number against registry (periodically - once per week)
                                let registryUpdate: any = {};
                                const lastVerified = business.registry_data?.last_verified_at;
                                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                                if (!lastVerified || new Date(lastVerified) < oneWeekAgo) {
                                    console.log(`   🔍 Verifying org_number against ${business.country_code} registry...`);
                                    try {
                                        const verifyResult = await verifyBusiness(
                                            business.org_number,
                                            business.country_code || 'NO'
                                        );

                                        if (verifyResult.success && verifyResult.data) {
                                            registryUpdate.registry_data = {
                                                ...business.registry_data,
                                                ...verifyResult.data,
                                                last_verified_at: new Date().toISOString()
                                            };

                                            // Check if business status changed
                                            if (verifyResult.data.company_status !== (business.registry_data as any)?.company_status) {
                                                console.log(`   📋 Status changed: ${(business.registry_data as any)?.company_status} → ${verifyResult.data.company_status}`);
                                            }
                                        }
                                    } catch (e) {
                                        console.log(`   ⚠️ Registry verification failed (might be rate limited)`);
                                    }
                                }

                                // Update with both quality_analysis AND scraped fields
                                await supabase
                                    .from('businesses')
                                    .update({
                                        quality_analysis: updatedQuality,
                                        trust_score: score,
                                        trust_score_breakdown: breakdown,
                                        industry_category: enrichedData?.industry_category || null,
                                        ...updates,
                                        ...registryUpdate
                                    })
                                    .eq('id', business.id);

                                console.log(`  ✅ Success: ${business.legal_name} (Trust Score: ${score}/100)`);
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
