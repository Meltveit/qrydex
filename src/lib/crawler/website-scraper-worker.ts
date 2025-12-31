import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServerClient } from '../supabase';
import { scrapeWebsite, type WebsiteData } from './website-scraper';
import { analyzeBusinessCredibility, type ScamAnalysisResult } from '../ai/scam-detector';

// Get worker ID from command line args (default to 0)
const WORKER_ID = parseInt(process.argv[2] || '0', 10);
const TOTAL_WORKERS = parseInt(process.argv[3] || '1', 10);

// CLI execution - RUNS CONTINUOUSLY WITH WORKER AWARENESS
if (require.main === module) {
    console.log(`🤖 Website Scraper Worker #${WORKER_ID} - CONTINUOUS MODE`);
    console.log(`   Worker ${WORKER_ID + 1}/${TOTAL_WORKERS}`);
    console.log(`   Assigned: IDs where (ID % ${TOTAL_WORKERS}) = ${WORKER_ID}`);
    console.log('   Press Ctrl+C to stop\n');

    let cycleCount = 0;

    const runContinuously = async () => {
        const supabase = createServerClient();

        // eslint-disable-next-line no-constant-condition
        while (true) {
            cycleCount++;
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔄 CYCLE ${cycleCount} - Worker #${WORKER_ID} - ${new Date().toLocaleString()}`);
            console.log(`${'='.repeat(60)}\n`);

            try {
                // Get businesses with domains but no scraped data
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

                // Fetch MORE businesses than we need, then filter by worker ID
                // ADDED: country_code to select
                const { data: allBusinesses, count } = await supabase
                    .from('businesses')
                    .select('id, domain, legal_name, org_number, registry_data, quality_analysis, scrape_count, country_code, website_crawl_count', { count: 'exact' })
                    .not('domain', 'is', null)
                    // .is('company_description', null) // REMOVED: Allow re-scraping of existing records to improve quality
                    .neq('website_status', 'dead') // Exclude dead sites
                    .or(`last_scraped_at.is.null,last_scraped_at.lt.${yesterday}`)
                    .order('website_crawl_count', { ascending: true, nullsFirst: true }) // Prioritize never crawled
                    .order('created_at', { ascending: false }) // Then newest
                    .limit(100);

                if (!allBusinesses || allBusinesses.length === 0) {
                    console.log('✅ All websites scraped! Waiting for new websites...');
                    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // 5 min
                    continue;
                }

                // WORKER ASSIGNMENT: Filter businesses assigned to THIS worker
                const businesses = allBusinesses.filter(b => {
                    const numericHash = parseInt(b.id.replace(/-/g, '').substring(0, 8), 16);
                    return (numericHash % TOTAL_WORKERS) === WORKER_ID;
                }).slice(0, 20); // Take first 20 assigned to this worker

                console.log(`Found ${count} total unscraped websites`);
                console.log(`Worker #${WORKER_ID} assigned: ${businesses.length} businesses\n`);

                if (businesses.length === 0) {
                    console.log(`⏭️ No businesses for worker #${WORKER_ID} in this batch. Waiting...`);
                    await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000)); // 2 min
                    continue;
                }

                for (const business of businesses) {
                    try {
                        // Check for max retries
                        if ((business.scrape_count || 0) >= 4) {
                            console.log(`⚠️ Giving up on ${business.domain} after 4 attempts. Marking as DEAD.`);
                            await supabase
                                .from('businesses')
                                .update({
                                    website_status: 'dead',
                                    last_scraped_at: new Date().toISOString()
                                })
                                .eq('id', business.id);
                            continue;
                        }

                        console.log(`  🌐 Scraping: ${business.domain} (Attempt ${(business.scrape_count || 0) + 1}/4)`);

                        const domain = business.domain;
                        const url = domain.startsWith('http') ? domain : `https://${domain}`;

                        // Scrape logic
                        let websiteData: WebsiteData | null = null;
                        try {
                            // Start deep scrape (max 30 pages for speed in worker mode)
                            websiteData = await scrapeWebsite(url, 30);
                        } catch (e: any) {
                            console.error(`Error scraping ${business.domain}: ${e.message}`);
                        }

                        // Prepare update payload structure early
                        let updates: any = {
                            website_crawl_count: (business.website_crawl_count || 0) + 1,
                            last_scraped_at: new Date().toISOString(),
                            scrape_count: (business.scrape_count || 0) + 1,
                            next_scrape_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                        };

                        if (!websiteData || Object.keys(websiteData).length === 0) {
                            console.log(`⚠️ Deep crawl failed for ${business.domain}. Using REGISTRY DATA FALLBACK.`);

                            // FALLBACK: Construct simulated "website data" from registry info
                            websiteData = {
                                homepage: {
                                    url: url,
                                    title: business.legal_name || 'Business Website',
                                    content: `Official business registry entry. Legal Name: ${business.legal_name}. Organization Number: ${business.org_number}. Address: ${JSON.stringify(business.registry_data?.registered_address || 'Unknown')}. Industry: ${business.registry_data?.industry_name || 'Unknown'}.`,
                                    links: []
                                },
                                subpages: [],
                                emails: [],
                                phones: [],
                                socialMedia: [],
                                internalLinks: [],
                                contactInfo: { emails: [], phones: [], addresses: [], social_media: {} },
                                sitelinks: [],
                                detectedLanguage: 'en',
                                description: `Business profile for ${business.legal_name}.`
                            } as unknown as WebsiteData;

                            updates.website_status = 'registry_fallback';
                        }


                        // Analyze for Scam indicators
                        const scamAnalysis = await analyzeBusinessCredibility(
                            business,
                            business.registry_data,
                            websiteData
                        );

                        const enriched = websiteData.enrichedData || {};

                        // Merge AI results
                        updates = {
                            ...updates,
                            company_description: websiteData.description || enriched.company_description,
                            logo_url: websiteData.logoUrl || enriched.logo_url,
                            social_media: websiteData.socialMedia || enriched.contact_info?.social_media,
                            country_code: business.country_code || (websiteData.potentialBusinessIds?.NO?.length ? 'NO' : 'UNKNOWN'),
                            website_status: updates.website_status || 'active',
                            website_last_crawled: new Date().toISOString(),

                            quality_analysis: {
                                isScam: scamAnalysis?.isScam,
                                riskScore: scamAnalysis?.riskLevel,
                                confidence: scamAnalysis?.confidence,
                                scamReasons: scamAnalysis?.redFlags,
                                trustScore: scamAnalysis?.credibilityScore,
                                detected_language: websiteData.detectedLanguage,
                                industry_category: enriched.industry_category,
                                contact_info: websiteData.contactInfo,
                                sitelinks: websiteData.sitelinks,
                                business_hours: enriched.business_hours,
                                search_keywords: scamAnalysis?.search_keywords,
                                scraped_at: new Date().toISOString()
                            },
                            sitelinks: websiteData.sitelinks,
                            opening_hours: enriched.business_hours,
                            trust_score: scamAnalysis?.credibilityScore || 0,
                            trust_score_breakdown: {},
                            translations: scamAnalysis?.generated_descriptions || {},
                            indexed_pages_count: websiteData.subpages.length + 1
                        };

                        // Add products/services if found
                        // Add products/services if found - TEMPORARILY DISABLED (Missing DB Columns)
                        // if (websiteData.products?.length > 0) updates.products = websiteData.products;
                        // if (websiteData.services?.length > 0) updates.services = websiteData.services;

                        // Calculate Professional Email (Simple heuristic)
                        const emails = websiteData.contactInfo?.emails || [];
                        const genericDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'online.no', 'live.no'];
                        const hasProfessionalEmail = emails.some(e => {
                            const domain = e.split('@')[1]?.toLowerCase();
                            return domain && !genericDomains.includes(domain);
                        });

                        // Determine SSL Status from scraped URL
                        const hasSsl = websiteData.homepage?.url?.startsWith('https') || false;

                        // Enrich quality_analysis with missing fields
                        const qa = updates.quality_analysis || {};
                        updates.quality_analysis = {
                            ...qa,
                            has_ssl: hasSsl, // NOW INCLUDED
                            professional_email: hasProfessionalEmail, // NOW INCLUDED
                            contact_email: emails[0] || null // Save primary email
                        };

                        // Update database
                        const { error: updateError } = await supabase
                            .from('businesses')
                            .update(updates)
                            .eq('id', business.id);

                        if (updateError) {
                            console.error(`  ❌ DB Update Error: ${updateError.message}`);
                        } else {
                            console.log(`  ✅ Success: ${business.legal_name} (Trust: ${updates.trust_score})`);
                            if (updates.quality_analysis?.contact_info?.vat_number) {
                                console.log(`     💰 VAT/Tax ID Found: ${updates.quality_analysis.contact_info.vat_number}`);
                            }
                        }

                        // Rate limiting
                        console.log('  ⏳ Cooling down (10s)...');
                        await new Promise(resolve => setTimeout(resolve, 10000));

                    } catch (error: any) {
                        console.error(`  ❌ Error processing ${business.domain}:`, error.message);
                    }
                }

                // Wait before next batch
                console.log('\n⏱️  Waiting 2 minutes before next cycle...');
                await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));

            } catch (err: any) {
                console.error('❌ Error in cycle:', err.message);
                console.log('   Retrying in 5 minutes...');
                await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
            }
        }
    };

    runContinuously().catch((err) => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
}
