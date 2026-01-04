
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

// ============================================================================
// MULTI-PAGE NAVIGATION HELPERS
// ============================================================================

interface VisitedPage {
    url: string;
    title: string;
    content: string;
    html: string;
    type: 'home' | 'contact' | 'about' | 'team' | 'products' | 'services' | 'other';
    emails: string[];
    socialMedia: {
        linkedin?: string;
        facebook?: string;
        twitter?: string;
        instagram?: string;
        youtube?: string;
    };
    links: Array<{ url: string; text: string; priority: 'high' | 'low'; type?: string }>;
    headings: { h1: string[]; h2: string[]; h3: string[] };
    meta: { description?: string; language?: string };
}

/**
 * Classify links by importance and type (multilingual)
 */
function classifyLinks(links: any[], baseUrl: string): Array<{ url: string; text: string; type: string; priority: number }> {
    const baseDomain = new URL(baseUrl).hostname;

    const keywords = {
        contact: ['contact', 'get-in-touch', 'kontakt', 'kundeservice', 'yhteystiedot', 'contacto', 'contactez'],
        about: ['about', 'om-oss', 'om-os', 'company', 'yritys', 'über-uns', 'á-propos'],
        products: ['product', 'produkt', 'tuotteet', 'service', 'tjeneste', 'losning', 'lösung', 'produit'],
        team: ['team', 'ansatte', 'people', 'henkilöstö', 'employees', 'medarbetare', 'équipe']
    };

    const classified = links
        .filter(link => {
            try {
                const linkDomain = new URL(link.url).hostname;
                return linkDomain === baseDomain || linkDomain.endsWith(`.${baseDomain}`);
            } catch {
                return false;
            }
        })
        .map(link => {
            const urlLower = link.url.toLowerCase();
            const textLower = link.text.toLowerCase();

            let type = 'other';
            let priority = 10;

            for (const [typeName, kws] of Object.entries(keywords)) {
                if (kws.some(kw => urlLower.includes(kw) || textLower.includes(kw))) {
                    type = typeName;
                    priority = typeName === 'contact' ? 1 : typeName === 'about' ? 2 : typeName === 'products' ? 3 : 4;
                    break;
                }
            }

            return { ...link, type, priority };
        })
        .sort((a, b) => a.priority - b.priority);

    return classified;
}

/**
 * Scrape individual page with Puppeteer
 */
async function scrapePage(page: any, url: string): Promise<VisitedPage> {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    const title = await page.title();
    const content = await page.content();
    const $ = cheerio.load(content);

    // Clean content
    $('script, style, noscript, svg, iframe').remove();
    const cleanText = $('body').text().replace(/\s+/g, ' ').trim();

    // Extract emails
    const extractedEmails: string[] = [];
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const textMatches = cleanText.match(emailRegex) || [];
    textMatches.forEach(e => extractedEmails.push(e.toLowerCase()));

    $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
            const e = href.replace('mailto:', '').split('?')[0].trim();
            if (e.includes('@')) extractedEmails.push(e.toLowerCase());
        }
    });

    // Extract links
    const extractedLinks: any[] = [];
    const importantKeywords = [
        'contact', 'about', 'kontakt', 'om oss', 'support', 'help', 'hjelp', 'team', 'ansatte', 'kundeservice', 'faq',
        'product', 'produkt', 'service', 'tjeneste', 'tjänst', 'solution', 'losning', 'løsning', 'price', 'pris',
        'shop', 'butikk', 'butik', 'store', 'katalog', 'leistungen', 'produkte', 'offer', 'tilbud'
    ];

    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();

        if (href && text.length > 2 && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
            try {
                const fullUrl = new URL(href, url).toString();
                const isImportant = importantKeywords.some(k =>
                    text.toLowerCase().includes(k) || href.toLowerCase().includes(k)
                );

                extractedLinks.push({
                    url: fullUrl,
                    text: text,
                    priority: isImportant ? 'high' : 'low'
                });
            } catch (e) { /* ignore */ }
        }
    });

    // Extract Social Media Links
    const socialMedia: any = {};
    const socialPatterns = {
        linkedin: /linkedin\.com\/(company|in)\/[a-zA-Z0-9-_]+/i,
        facebook: /facebook\.com\/[a-zA-Z0-9-_\.]+/i,
        instagram: /instagram\.com\/[a-zA-Z0-9-_\.]+/i,
        twitter: /(twitter\.com|x\.com)\/[a-zA-Z0-9-_]+/i,
        youtube: /youtube\.com\/(channel|c|user|@)[a-zA-Z0-9-_]+/i
    };

    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;

        for (const [platform, regex] of Object.entries(socialPatterns)) {
            if (regex.test(href)) {
                try {
                    const fullUrl = new URL(href).toString();
                    socialMedia[platform] = fullUrl;
                } catch (e) { /* ignore */ }
            }
        }
    });

    return {
        url: page.url(),
        title,
        content: cleanText,
        html: content,
        type: 'other',
        emails: [...new Set(extractedEmails)],
        socialMedia,
        links: extractedLinks,
        headings: {
            h1: $('h1').map((i, el) => $(el).text().trim()).get(),
            h2: $('h2').map((i, el) => $(el).text().trim()).get(),
            h3: $('h3').map((i, el) => $(el).text().trim()).get()
        },
        meta: {
            description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'),
            language: $('html').attr('lang')
        }
    };
}

/**
 * Scrape LinkedIn company page for employee count
 */
async function scrapeLinkedInEmployeeCount(page: any, linkedinUrl: string): Promise<number | null> {
    try {
        console.log(`   🔍 Checking LinkedIn for employee count...`);
        await page.goto(linkedinUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        await sleep(2000);

        const content = await page.content();
        const $ = cheerio.load(content);

        // LinkedIn shows employee count in various formats:
        // "X employees on LinkedIn"
        // "X-Y employees"
        // "X medarbeidere" (Norwegian)
        const text = $('body').text();

        // Pattern 1: "X employees" or "X-Y employees"
        const employeeMatch = text.match(/(\d{1,6})(?:-\d{1,6})?\s+(employees|medarbeidere|ansatte|työntekijät)/i);
        if (employeeMatch) {
            const count = parseInt(employeeMatch[1], 10);
            console.log(`   👥 Found ${count}+ employees on LinkedIn`);
            return count;
        }

        // Pattern 2: Look for structured data
        const jsonLdMatch = content.match(/<script type="application\/ld\+json">(.*?)<\/script>/g);
        if (jsonLdMatch) {
            for (const script of jsonLdMatch) {
                try {
                    const json = JSON.parse(script.replace(/<\/?script[^>]*>/g, ''));
                    if (json.numberOfEmployees || json.employee) {
                        const count = typeof json.numberOfEmployees === 'number'
                            ? json.numberOfEmployees
                            : parseInt(json.numberOfEmployees, 10);
                        if (!isNaN(count)) {
                            console.log(`   👥 Found ${count} employees (from JSON-LD)`);
                            return count;
                        }
                    }
                } catch (e) { /* ignore parse errors */ }
            }
        }

        console.log(`   ⚠️ Could not extract employee count from LinkedIn`);
        return null;
    } catch (e: any) {
        console.log(`   ⚠️ LinkedIn scrape failed: ${e.message}`);
        return null;
    }
}


// Return type for navigateAndExtract with metadata
interface NavigationResult {
    visitedPages: VisitedPage[];
    employeeCount: number | null;
    socialMedia: Record<string, string>;
}

/**
 * Navigate and extract from multiple pages
 */
async function navigateAndExtract(page: any, url: string): Promise<NavigationResult> {
    const visitedPages: VisitedPage[] = [];
    const maxPages = 5;

    console.log('   📄 Scraping homepage...');
    const homepage = await scrapePage(page, url);
    homepage.type = 'home';
    visitedPages.push(homepage);

    // Classify links from homepage
    const classifiedLinks = classifyLinks(homepage.links, url);

    // Visit priority pages
    const priorities = ['contact', 'about', 'products'];
    for (const priorityType of priorities) {
        if (visitedPages.length >= maxPages) break;

        const link = classifiedLinks.find(l => l.type === priorityType);
        if (link) {
            try {
                console.log(`   📄 Scraping ${priorityType} page...`);
                await sleep(2000); // Polite delay
                const subpage = await scrapePage(page, link.url);
                subpage.type = priorityType as any;
                visitedPages.push(subpage);
            } catch (e: any) {
                console.log(`   ⚠️ Failed to visit ${priorityType}: ${e.message}`);
            }
        }
    }

    // Merge social media from all pages (prioritize homepage)
    const mergedSocialMedia: any = {};
    for (const vp of [...visitedPages].reverse()) {  // Reverse copy so homepage overwrites
        Object.assign(mergedSocialMedia, vp.socialMedia);
    }

    // If LinkedIn company page found, try to get employee count
    let employeeCount: number | null = null;
    if (mergedSocialMedia.linkedin && mergedSocialMedia.linkedin.includes('/company/')) {
        try {
            await sleep(2000);
            employeeCount = await scrapeLinkedInEmployeeCount(page, mergedSocialMedia.linkedin);
        } catch (e) {
            console.log(`   ⚠️ LinkedIn employee extraction failed`);
        }
    }

    console.log(`   ✅ Scraped ${visitedPages.length} pages`);

    return {
        visitedPages,
        employeeCount,
        socialMedia: mergedSocialMedia
    };
}


async function runRescueMission() {
    console.log(`🚑 RESCUE BOT INITIALIZED (Worker ${WORKER_ID + 1}/${TOTAL_WORKERS})`);
    const supabase = createServerClient();


    while (true) {  // Main loop
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
        const businesses = allBusinesses!.filter((b: any) => {
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
                    // Check if Cloudflare blocked
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
                    await sleep(5000);

                    const title = await page.title();
                    if (title.includes('Just a moment') || title.includes('Attention Required') || title.includes('Cloudflare')) {
                        console.log('   ⚠️ Still blocked by Cloudflare challenge.');
                        throw new Error('Cloudflare Block');
                    }

                    // ========================================
                    // MULTI-PAGE NAVIGATION (NEW)
                    // ========================================
                    const { visitedPages, employeeCount, socialMedia } = await navigateAndExtract(page, url);
                    const hasSsl = visitedPages[0].url.startsWith('https://');

                    // Build comprehensive DeepCrawlResult from multiple pages
                    const allEmails = visitedPages.flatMap(p => p.emails);
                    const allPhones: string[] = []; // TODO: Extract phones from pages

                    const crawlResult: DeepCrawlResult = {
                        baseUrl: url,
                        totalPages: visitedPages.length,  // 🎯 NOW > 1
                        pages: visitedPages.map(vp => ({
                            url: vp.url,
                            title: vp.title,
                            content: vp.content,
                            html: vp.html,
                            links: vp.links.map(l => l.url),  // Convert to string[] for compatibility
                            emails: vp.emails,
                            headings: vp.headings,
                            meta: vp.meta,
                            structuredData: [],
                            type: vp.type
                        })),
                        allImages: [],
                        sitemapUrls: [],
                        crawlStats: { startTime: Date.now(), endTime: Date.now(), duration: 0, failedUrls: [] },
                        sitelinks: [],  // Will be extracted by processDeepCrawl
                        businessHours: null,
                        extractedContact: {
                            emails: allEmails,
                            phones: allPhones,
                            socials: socialMedia  // 🎯 NOW POPULATED
                        }
                    };

                    // Process Data
                    const enrichedData = await processDeepCrawl(crawlResult);

                    // 3. AI Analysis & Translation (CRITICAL: Added per user request)
                    console.log('   🧠 Running AI analysis & Generating description...');

                    // Use homepage (first visited page) for AI context
                    const homepage = visitedPages[0];

                    // Transform to WebsiteData format expected by AI
                    const websiteDataForAI: any = {
                        homepage: { title: homepage.title, content: homepage.content, url: homepage.url },
                        description: enrichedData.company_description,
                        subpages: visitedPages.slice(1),  // Include other pages for richer context
                        contactInfo: enrichedData.contact_info,
                        socialMedia: enrichedData.contact_info.social_media,
                        enrichedData: enrichedData
                    };

                    const scamAnalysis = await analyzeBusinessCredibility(
                        business,
                        { registration_date: null, company_status: 'Active' } as any, // Mock registry data if missing
                        websiteDataForAI
                    );

                    // Extract the single master description
                    const masterDescription = scamAnalysis.generated_descriptions?.master ||
                        Object.values(scamAnalysis.generated_descriptions || {})[0] ||
                        enrichedData.company_description;

                    // Calculate Professional Email (Simple heuristic) matches Deep Scraper Logic
                    const emails = enrichedData.contact_info?.emails || [];
                    const genericDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'online.no', 'live.no', 'icloud.com'];
                    const hasProfessionalEmail = emails.some(e => {
                        const domain = e.split('@')[1]?.toLowerCase();
                        return domain && !genericDomains.includes(domain);
                    });

                    // Merge logic for registry data
                    const updatedRegistryData = {
                        ...(business.registry_data || {}),
                        ...(employeeCount ? { employee_count: employeeCount } : {})
                    };

                    // Prepare update object
                    const updates: any = {
                        company_description: masterDescription,
                        logo_url: enrichedData.logo_url,
                        social_media: socialMedia,  // 🎯 Top level column is valid JSONB
                        website_status: 'active', // SUCCESS!
                        website_last_crawled: new Date().toISOString(),
                        // has_ssl: hasSsl, // REMOVED: Causing DB Schema Cache error
                        sitelinks: enrichedData.sitelinks, // Top level sitelinks (NOW POPULATED!)
                        indexed_pages_count: visitedPages.length,  // 🎯 Multi-page count
                        registry_data: updatedRegistryData, // 🎯 Updated with employee count

                        quality_analysis: {
                            website_scraped: true,
                            rescue_method: 'puppeteer_multipage', // Updated marker
                            scraped_at: new Date().toISOString(),
                            employee_count: employeeCount,  // 🎯 Saved here instead
                            social_media_extracted: socialMedia,

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


                        trust_score: scamAnalysis.credibilityScore,
                        last_scraped_at: new Date().toISOString(),
                        translations: {} // Disabled per user request (single description only)
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
                    console.log(`      📄 Pages: ${visitedPages.length} | 🔗 Sitelinks: ${enrichedData.sitelinks?.length || 0} | Trust: ${scamAnalysis.credibilityScore}`);
                    if (Object.keys(socialMedia).length > 0) {
                        console.log(`      📱 Social: ${Object.keys(socialMedia).join(', ')}`);
                    }
                    if (employeeCount) {
                        console.log(`      👥 Employees: ~${employeeCount}`);
                    }


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
    }  // End while loop
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
