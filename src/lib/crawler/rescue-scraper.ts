
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServerClient } from '../supabase';
import { analyzeBusinessCredibility } from '../ai/scam-detector'; // Added import
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { processDeepCrawl } from './data-extractor';
import type { DeepCrawlResult, PageResult } from './deep-crawler';
import { URL } from 'url';

// CONFIG
const HEADLESS = true;
const BATCH_SIZE = 5; // Process 5 at a time, then restart browser to prevent leaks

// CLI Args for Sharding
const WORKER_ID = parseInt(process.argv[2] || '0', 10);
const TOTAL_WORKERS = parseInt(process.argv[3] || '1', 10);

async function runRescueMission() {
    console.log(`🚑 RESCUE BOT INITIALIZED (Worker ${WORKER_ID + 1}/${TOTAL_WORKERS})`);
    const supabase = createServerClient();

    while (true) {
        // 1. Fetch Candidates (Fetch larger batch to allow for sharding filtering)
        const { count } = await supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true })
            .eq('website_status', 'needs_rescue');

        const { data: allBusinesses, error } = await supabase
            .from('businesses')
            .select('id, domain, legal_name, registry_data, org_number, country_code')
            .eq('website_status', 'needs_rescue')
            .order('last_scraped_at', { ascending: true }) // Oldest first
            .limit(BATCH_SIZE * TOTAL_WORKERS * 2); // Fetch enough to filter

        if (error) {
            console.error('❌ DB Error:', error.message);
            await sleep(10000);
            continue;
        }

        if (!allBusinesses || allBusinesses.length === 0) {
            console.log('✅ No businesses need rescuing. Waiting 2 minutes...');
            await sleep(2 * 60 * 1000); // 2 min sleep
            continue;
        }

        // SHARDING FILTER
        const businesses = allBusinesses.filter(b => {
            const hash = parseInt(b.id.replace(/-/g, '').substring(0, 8), 16);
            return (hash % TOTAL_WORKERS) === WORKER_ID;
        }).slice(0, BATCH_SIZE);

        if (businesses.length === 0) {
            console.log(`🚑 Worker ${WORKER_ID}: No tasks in this batch. Waiting...`);
            await sleep(30000);
            continue;
        }

        console.log(`\n\x1b[41m\x1b[37m 🚑 RESCUE BOT (W${WORKER_ID}): PROCESSING BATCH OF ${businesses.length} \x1b[0m`);
        console.log(`\x1b[31m   Queue size: ${count} remaining. \x1b[0m\n`);

        // 2. Launch Browser (One instance per batch)
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: HEADLESS,
                args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for some envs
            });

            const page = await browser.newPage();

            // Set a "Human" User-Agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1366, height: 768 });

            for (const business of businesses) {
                console.log(`\n🏥 Rescuing: ${business.legal_name} (${business.domain})`);
                const url = business.domain.startsWith('http') ? business.domain : `https://${business.domain}`;

                try {
                    // ... same loop content ...

                    // Navigate
                    console.log('   Navigating...');
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

                    // Wait a bit for JS to settle (Cloudflare check often takes 5s)
                    await sleep(5000);

                    // Check if we are still blocked (Title check)
                    const title = await page.title();
                    if (title.includes('Just a moment') || title.includes('Attention Required') || title.includes('Cloudflare')) {
                        console.log('   ⚠️ Still blocked by Cloudflare challenge.');
                        throw new Error('Cloudflare Block');
                    }

                    // REAL URL (for SSL check)
                    const finalUrl = page.url();
                    const hasSsl = finalUrl.startsWith('https://');

                    // Extract Content
                    const content = await page.content();
                    const $ = cheerio.load(content);

                    // Clean content
                    $('script, style, noscript, svg, iframe').remove();
                    const cleanText = $('body').text().replace(/\s+/g, ' ').trim();

                    // EXTRACT LINKS (for Sitelinks/Product finding)
                    const extractedLinks: any[] = [];
                    $('a[href]').each((_, el) => {
                        const href = $(el).attr('href');
                        const text = $(el).text().trim();
                        if (href && text.length > 2 && !href.startsWith('#') && !href.startsWith('javascript:')) {
                            // Normalize URL
                            try {
                                const fullUrl = new URL(href, finalUrl).toString();
                                extractedLinks.push({ url: fullUrl, text: text });
                            } catch (e) { /* ignore invalid urls */ }
                        }
                    });

                    // Construct basic DeepCrawlResult (Single Page simulation)
                    const pageResult: PageResult = {
                        url: finalUrl,
                        title: title,
                        content: cleanText,
                        html: content,
                        links: extractedLinks, // NOW POPULATED
                        headings: {
                            h1: $('h1').map((i, el) => $(el).text().trim()).get(),
                            h2: $('h2').map((i, el) => $(el).text().trim()).get(),
                            h3: $('h3').map((i, el) => $(el).text().trim()).get()
                        },
                        meta: {
                            description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'),
                            language: $('html').attr('lang')
                        },
                        structuredData: []
                    };

                    const crawlResult: DeepCrawlResult = {
                        baseUrl: url,
                        totalPages: 1,
                        pages: [pageResult],
                        allImages: [],
                        sitemapUrls: [],
                        crawlStats: { startTime: Date.now(), endTime: Date.now(), duration: 0, failedUrls: [] },
                        sitelinks: [], // Will be filled by processDeepCrawl
                        businessHours: null,
                        extractedContact: { emails: [], phones: [], socials: {} } // Will be extracted by processDeepCrawl
                    };

                    // Process Data
                    const enrichedData = await processDeepCrawl(crawlResult);

                    // 3. AI Analysis & Translation (CRITICAL: Added per user request)
                    console.log('   🧠 Running AI analysis & Generating 8 translations...');
                    // Transform to WebsiteData format expected by AI
                    const websiteDataForAI: any = {
                        homepage: { title: title, content: cleanText, url: url },
                        description: enrichedData.company_description,
                        subpages: [],
                        contactInfo: enrichedData.contact_info,
                        socialMedia: enrichedData.contact_info.social_media,
                        enrichedData: enrichedData
                    };

                    const scamAnalysis = await analyzeBusinessCredibility(
                        business,
                        { registration_date: null, company_status: 'Active' } as any, // Mock registry data if missing
                        websiteDataForAI
                    );

                    // Transform translations to match frontend expectation: { en: { company_description: "..." } }
                    const formattedTranslations: any = {};
                    if (scamAnalysis.generated_descriptions) {
                        for (const [lang, desc] of Object.entries(scamAnalysis.generated_descriptions)) {
                            // Ensure we don't overwrite existing complex structure if we merge, but here we likely overwrite
                            formattedTranslations[lang] = {
                                company_description: desc
                            };
                        }
                    }

                    // Calculate Professional Email (Simple heuristic) matches Deep Scraper Logic
                    const emails = enrichedData.contact_info?.emails || [];
                    const genericDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'online.no', 'live.no', 'icloud.com'];
                    const hasProfessionalEmail = emails.some(e => {
                        const domain = e.split('@')[1]?.toLowerCase();
                        return domain && !genericDomains.includes(domain);
                    });

                    // Prepare update object
                    const updates: any = {
                        company_description: scamAnalysis.generated_descriptions?.en || enrichedData.company_description,
                        logo_url: enrichedData.logo_url,
                        website_status: 'active', // SUCCESS!
                        website_last_crawled: new Date().toISOString(),
                        has_ssl: hasSsl, // Correct SSL status
                        sitelinks: enrichedData.sitelinks, // Top level sitelinks

                        quality_analysis: {
                            website_scraped: true,
                            rescue_method: 'puppeteer', // Mark source
                            scraped_at: new Date().toISOString(),

                            // Content
                            contact_info: enrichedData.contact_info,
                            services: enrichedData.services,
                            products: enrichedData.products,
                            industry_category: enrichedData.industry_category !== 'Unknown' ? enrichedData.industry_category : (scamAnalysis.industry_category || 'Unknown'),
                            sitelinks: enrichedData.sitelinks, // Inside QA too
                            // Enriched AI fields
                            isScam: scamAnalysis.isScam,
                            riskScore: scamAnalysis.riskLevel,
                            confidence: scamAnalysis.confidence,
                            scamReasons: scamAnalysis.redFlags,
                            trustScore: scamAnalysis.credibilityScore,
                            search_keywords: scamAnalysis.search_keywords,
                            certifications: scamAnalysis.certifications,
                            has_ssl: hasSsl,

                            // Email Analysis
                            has_professional_email: hasProfessionalEmail, // Consistency with naming
                            professional_email: hasProfessionalEmail,     // Backend often checks this
                            contact_email: emails[0] || null
                        },

                        social_media: enrichedData.contact_info.social_media,
                        trust_score: scamAnalysis.credibilityScore,
                        last_scraped_at: new Date().toISOString(),
                        translations: formattedTranslations // Use the FIX from Step 1090
                    };

                    // Update DB with FULL RICH DATA
                    const { error: updateError } = await supabase
                        .from('businesses')
                        .update(updates)
                        .eq('id', business.id);

                    if (updateError) {
                        console.error(`      ❌ DB Error: ${updateError.message}`);
                        throw updateError;
                    }

                    // Success Log
                    console.log(`\u001b[32m   ✅ Rescue Successful: ${business.legal_name} (${business.domain}) \u001b[0m`);
                    console.log(`      Trust Score: ${scamAnalysis.credibilityScore} | Translations: ${Object.keys(formattedTranslations || {}).length}`);


                    // If we found a VAT number, try to update org_number column too if empty
                    const foundVat = enrichedData.contact_info?.vat_number;
                    if (foundVat && !business.org_number) {
                        const country = business.country_code || 'NO'; // Default to NO if unknown
                        const cleanOrg = validateOrgNumber(foundVat, country);

                        if (cleanOrg) {
                            await supabase.from('businesses').update({ org_number: cleanOrg }).eq('id', business.id);
                            console.log(`      🔢 Updated Org Number to: ${cleanOrg} (${country})`);
                        }
                    }

                } catch (err: any) {
                    console.error(`   ❌ Rescue Failed: ${err.message}`);

                    // Mark as rescue_failed so we don't loop forever
                    await supabase
                        .from('businesses')
                        .update({
                            website_status: 'rescue_failed',
                            last_scraped_at: new Date().toISOString()
                        })
                        .eq('id', business.id);
                }
            }
        } catch (err: any) {
            console.error('🚨 Browser Crash:', err.message);
        } finally {
            if (browser) await browser.close();
            console.log(`♻️  Batch complete. Restarting browser...`);
        }
    }
}


/**
 * Validates and extracts a pure Org/Tax Number based on Country
 */
function validateOrgNumber(vat: string, country: string): string | null {
    // Remove clean prefix/suffix specific to VAT to get the Org Number
    // e.g. "NO 123456789 MVA" -> "123456789"
    let clean = vat.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // Remove Country Code prefix if present (e.g. NO, GB, DE)
    if (clean.startsWith(country.toUpperCase())) {
        clean = clean.substring(2);
    } else if (clean.startsWith('NO') && country === 'NO') clean = clean.substring(2);
    else if (clean.startsWith('GB') && country === 'GB') clean = clean.substring(2);
    else if (clean.startsWith('DE') && country === 'DE') clean = clean.substring(2);

    // Remove suffix like 'MVA'
    clean = clean.replace('MVA', '');

    switch (country) {
        case 'NO': // Norway: 9 digits
            return /^\d{9}$/.test(clean) ? clean : null;
        case 'GB': // UK: 8 chars (often digits, but can be alphanumeric for some types)
            // Companies House is 8 chars. VAT is 9 digits usually (GB...) or 12.
            // We want the Org Number (Company Number). 
            // If we found a VAT number (9 digits), it might NOT be the Company ID (8 chars).
            // But often they are related or we just want A number.
            // Let's be strict for Company ID: 8 alphanumeric
            // But if it's 9 digits (VAT), maybe we shouldn't save it as Org Nr?
            // User wants Org Nr. 
            // Better heuristic: regex for GBR Company Number is ^([a-z]|[A-Z]){2}\d{6}$|^\d{8}$
            if (/^([A-Z]{2}\d{6}|\d{8})$/.test(clean)) return clean;
            return null;
        case 'US': // USA: EIN is 9 digits
            return /^\d{9}$/.test(clean) ? clean : null;
        case 'DK': // Denmark: CVR is 8 digits
            return /^\d{8}$/.test(clean) ? clean : null;
        case 'SE': // Sweden: 10 digits
            return /^\d{10}$/.test(clean) ? clean : null;
        case 'DE': // Germany: 9 digits (Ust-ID is DE+9, we stripped DE)
            return /^\d{9}$/.test(clean) ? clean : null;
        default:
            // Fallback: If 8-12 alphanumeric, accept it? Risk of bad data.
            // Safer to return null if unknown schema.
            return null;
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run if called directly
if (require.main === module) {
    runRescueMission().catch(console.error);
}
