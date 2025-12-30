
import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface PageResult {
    url: string;
    title: string;
    content: string;
    html: string;
    links: string[];
    headings: {
        h1: string[];
        h2: string[];
        h3: string[];
    };
    meta: {
        description?: string;
        language?: string;
    };
    structuredData?: any[]; // JSON-LD
}

export interface DeepCrawlResult {
    baseUrl: string;
    totalPages: number;
    pages: PageResult[];
    allImages: string[];
    sitemapUrls: string[];
    crawlStats: {
        startTime: number;
        endTime: number;
        duration: number;
        failedUrls: string[];
    };
    sitelinks?: SiteLink[];
    businessHours?: BusinessHours | null;
    extractedContact?: {
        emails: string[];
        phones: string[];
        socials: Record<string, string>;
    };
    technologies?: string[];
}

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
];

/**
 * Perform a deep crawl of a website
 */
export async function deepCrawlWebsite(baseUrl: string, maxPages: number = 20): Promise<DeepCrawlResult> {
    const visited = new Set<string>();
    const queue: string[] = [baseUrl];
    const pages: PageResult[] = [];
    const allImages = new Set<string>();
    const failedUrls: string[] = [];

    // Data Collection Sets
    const allEmails = new Set<string>();
    const allPhones = new Set<string>();
    const allTech = new Set<string>();
    const allSocials: Record<string, string> = {};

    const startTime = Date.now();

    const rootHostname = new URL(baseUrl).hostname;

    // 1. Robot Compliance & Sitemap Discovery
    const { disallow, sitemaps } = await checkRobotsTxt(baseUrl);

    // Check if root is disallowed
    if (disallow.some(path => new URL(baseUrl).pathname.startsWith(path))) {
        // Respect robots.txt
        return {
            baseUrl,
            totalPages: 0,
            pages: [],
            allImages: [],
            sitemapUrls: sitemaps,
            crawlStats: { startTime, endTime: Date.now(), duration: 0, failedUrls: [] },
            sitelinks: [],
            businessHours: null
        };
    }

    // Seed queue with sitemap URLs if available (High priority)
    for (const sitemap of sitemaps) {
        const urls = await fetchSitemapUrls(sitemap);
        for (const url of urls) {
            if (!queue.includes(url) && new URL(url).hostname.includes(rootHostname)) {
                queue.push(url);
            }
        }
    }

    while (queue.length > 0 && visited.size < maxPages) {
        const currentUrl = queue.shift();
        if (!currentUrl || visited.has(currentUrl)) continue;

        // Check robots.txt disallow for every URL
        const urlPath = new URL(currentUrl).pathname;
        if (disallow.some(path => urlPath.startsWith(path))) {
            continue;
        }

        visited.add(currentUrl);

        try {
            // Random delay to be polite
            await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

            const response = await fetch(currentUrl, {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 404) failedUrls.push(currentUrl);
                continue;
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('text/html')) continue;

            const html = await response.text();
            const $ = cheerio.load(html);

            // Extract Metadata
            const title = $('title').text().trim() || '';
            const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content');
            const lang = $('html').attr('lang') || 'en';

            // Extract Content (Text)
            $('script, style, noscript, svg, iframe').remove();
            const content = $('body').text().replace(/\s+/g, ' ').trim();

            // Extract Headings
            const h1 = $('h1').map((i, el) => $(el).text().trim()).get().filter(Boolean);
            const h2 = $('h2').map((i, el) => $(el).text().trim()).get().filter(Boolean);
            const h3 = $('h3').map((i, el) => $(el).text().trim()).get().filter(Boolean);

            // Extract Images
            $('img').each((i, el) => {
                const src = $(el).attr('src');
                if (src) {
                    try {
                        const absoluteSrc = new URL(src, currentUrl).toString();
                        allImages.add(absoluteSrc);
                    } catch (e) {
                        // Ignore invalid URLs
                    }
                }
            });

            // Extract JSON-LD
            const structuredData: any[] = [];
            $('script[type="application/ld+json"]').each((i, el) => {
                try {
                    const json = JSON.parse($(el).html() || '{}');
                    structuredData.push(json);
                } catch (e) {
                    // Ignore parse errors
                }
            });

            // --- ULTRA-ENRICHMENT: Extract Tokens (Emails, Phones, Socials, Tech) ---
            const textContent = $('body').text();

            // 1. Social Media
            const socialPatterns = {
                linkedin: /linkedin\.com\/(in|company)\/[a-zA-Z0-9-_]+/i,
                facebook: /facebook\.com\/[a-zA-Z0-9-_\.]+/i,
                instagram: /instagram\.com\/[a-zA-Z0-9-_\.]+/i,
                twitter: /(twitter\.com|x\.com)\/[a-zA-Z0-9-_]+/i,
                youtube: /youtube\.com\/(channel|c|user|@)[a-zA-Z0-9-_]+/i,
                tiktok: /tiktok\.com\/@[a-zA-Z0-9-_\.]+/i
            };

            // Scan all hrefs for profiles
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                if (!href) return;

                for (const [platform, regex] of Object.entries(socialPatterns)) {
                    if (regex.test(href)) {
                        allSocials[platform] = href; // Upsert social link
                    }
                }
            });

            // 2. Emails (Aggressive Regex)
            const emails = textContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
            if (emails) {
                emails.forEach(e => {
                    if (!e.includes('sentry') && !e.includes('wix') && !e.includes('example.com') && !e.endsWith('.png') && !e.endsWith('.jpg')) {
                        allEmails.add(e.toLowerCase());
                    }
                });
            }

            // 3. Phone Numbers (Nordic Focus + Int)
            // Matches: +47 123 45 678, 12 34 56 78, 800 12 345
            const phoneMatches = textContent.match(/(?:\+47|\+46|\+45|\+358|0047|0046|0045|00358)?\s?[1-9]\d{1,2}\s?\d{2}\s?\d{2,3}(?:\s?\d{2})?/g);
            if (phoneMatches) {
                phoneMatches.forEach(p => {
                    const clean = p.replace(/\s+/g, '');
                    if (clean.length >= 8 && clean.length <= 15) allPhones.add(p.trim());
                });
            }

            // 4. Technology Detection (Simple heuristics)
            if (html.includes('wp-content')) allTech.add('WordPress');
            if (html.includes('shopify')) allTech.add('Shopify');
            if (html.includes('next=')) allTech.add('Next.js');
            if (html.includes('react')) allTech.add('React');
            if (html.includes('squarespace')) allTech.add('Squarespace');
            if (html.includes('wix')) allTech.add('Wix');

            // External Links extraction (Preserved from existing)
            const links: string[] = [];
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                    try {
                        const absoluteLink = new URL(href, currentUrl).toString();
                        const linkHostname = new URL(absoluteLink).hostname;

                        // Only follow internal links
                        if (linkHostname === rootHostname || linkHostname.endsWith(`.${rootHostname}`)) {
                            links.push(absoluteLink);

                            // Add to queue if not visited
                            if (!visited.has(absoluteLink) && !queue.includes(absoluteLink)) {
                                queue.push(absoluteLink);
                            }
                        }
                    } catch (e) {
                        // Ignore invalid URLs
                    }
                }
            });

            pages.push({
                url: currentUrl,
                title,
                content: content, // Keep original content
                html,
                links,
                headings: { h1, h2, h3 },
                meta: {
                    description,
                    language: lang
                },
                structuredData
            });

        } catch (error) {
            failedUrls.push(currentUrl);
        }
    }

    const endTime = Date.now();

    // Sort emails/phones to keep clean list
    const finalEmails = Array.from(allEmails).slice(0, 5); // Top 5
    const finalPhones = Array.from(allPhones).slice(0, 3);
    const finalTech = Array.from(allTech);

    // Analyze collected pages for sitelinks and business hours
    let sitelinks: SiteLink[] = [];
    let businessHours: BusinessHours | null = null;

    if (pages.length > 0) {
        // Use the home page (first page usually) or combine data
        const homePage = pages[0];
        const $home = cheerio.load(homePage.html);

        // Extract sitelinks from home page + all discovered links
        // We look at all collected pages' URLs to find "Contact", "About", etc.
        const allDiscoveredUrls = new Set(pages.map(p => p.url));
        const rawSitelinks = extractSitelinks(allDiscoveredUrls, baseUrl);

        // VALIDATE SITELINKS (Check for 404s)
        sitelinks = await validateSitelinks(rawSitelinks);

        // Try to find business hours on any page (Home or Contact usually)
        for (const page of pages) {
            const $page = cheerio.load(page.html);
            const hours = extractBusinessHours($page, page.structuredData || []);
            if (hours) {
                businessHours = hours;
                break; // Stop once we find valid hours
            }
        }
    }

    return {
        baseUrl,
        totalPages: pages.length,
        pages,
        allImages: Array.from(allImages),
        sitemapUrls: [],
        crawlStats: {
            startTime,
            endTime,
            duration: endTime - startTime,
            failedUrls
        },
        sitelinks,
        businessHours,
        extractedContact: {
            emails: finalEmails,
            phones: finalPhones,
            socials: allSocials
        },
        technologies: finalTech
    };
}

export interface SiteLink {
    url: string;
    title: string;
    type: 'contact' | 'about' | 'products' | 'services' | 'careers' | 'locations' | 'other';
}

export interface BusinessHours {
    raw: string;
    structured?: {
        monday?: string;
        tuesday?: string;
        wednesday?: string;
        thursday?: string;
        friday?: string;
        saturday?: string;
        sunday?: string;
    };
}

// Check if links are actually alive (HEAD request)
async function validateSitelinks(links: SiteLink[]): Promise<SiteLink[]> {
    const validLinks: SiteLink[] = [];
    const checkPromises = links.map(async (link) => {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 3000); // 3s timeout
            const res = await fetch(link.url, {
                method: 'HEAD',
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0 (Compatible; QrydexBot/1.0)' }
            });
            clearTimeout(id);
            if (res.ok) return link;
            return null;
        } catch {
            return null; // Assume dead if timeout/error
        }
    });

    const results = await Promise.all(checkPromises);
    return results.filter((l): l is SiteLink => l !== null);
}

// Basic Robots.txt Parser to respect rules
async function checkRobotsTxt(baseUrl: string): Promise<{ disallow: string[], sitemaps: string[] }> {
    try {
        const robotsUrl = new URL('/robots.txt', baseUrl).toString();
        const response = await fetch(robotsUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
            headers: { 'User-Agent': 'Mozilla/5.0 (Compatible; QrydexBot/1.0)' } // Be polite
        });

        if (!response.ok) {
            console.log(`⚠️ robots.txt check failed for ${baseUrl} (Status: ${response.status})`);
            return { disallow: [], sitemaps: [] };
        }

        const text = await response.text();
        console.log(`✅ robots.txt found for ${baseUrl}`);

        const disallow: string[] = [];
        const sitemaps: string[] = [];
        let currentUserAgent = '*';

        const lines = text.split('\n');
        for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.toLowerCase().startsWith('user-agent:')) {
                currentUserAgent = cleanLine.split(':')[1].trim();
            } else if (cleanLine.toLowerCase().startsWith('disallow:') && (currentUserAgent === '*' || currentUserAgent.includes('Bot'))) {
                const path = cleanLine.split(':')[1].trim();
                if (path) disallow.push(path);
            } else if (cleanLine.toLowerCase().startsWith('sitemap:')) {
                sitemaps.push(cleanLine.split(':', 2)[1].trim() + ":" + cleanLine.split(':', 2)[2]?.trim() || ""); // Handle http: vs https: split weirdness
            }
        }
        return { disallow, sitemaps };
    } catch (e: any) {
        console.log(`⚠️ robots.txt check error for ${baseUrl}: ${e.message}`);
        return { disallow: [], sitemaps: [] };
    }
}

// Fetch URLs from Sitemap to find specific high-value pages
async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
    try {
        const response = await fetch(sitemapUrl, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) return [];
        const text = await response.text();
        const urls: string[] = [];
        // Simple regex for XML (avoiding huge XML parser dep)
        const matches = text.matchAll(/<loc>(.*?)<\/loc>/g);
        for (const match of matches) {
            urls.push(match[1]);
        }
        return urls.slice(0, 50); // Limit to top 50 to avoid crawling thousands
    } catch {
        return [];
    }
}

function extractSitelinks(urls: Set<string>, baseUrl: string): SiteLink[] {
    const links: SiteLink[] = [];
    const seenTypes = new Set<string>();

    const patterns: Record<string, RegExp> = {
        management: /\/(management|ledelse|team|board|styret|ansatte|people|employees)$/i,
        contact: /\/(contact|kontakt|contact-us|get-in-touch|kontakt-oss|kundeservice)$/i,
        about: /\/(about|om-oss|about-us|who-we-are|our-story|company)$/i,
        products: /\/(products|produkter|catalog|shop|store|nettbutikk|catalogue)$/i,
        services: /\/(services|tjenester|solutions|losninger|what-we-do)$/i,
        careers: /\/(careers|jobs|vacancies|jobb|karriere|work-with-us)$/i,
        locations: /\/(locations|offices|find-us|butikker|where-to-find)$/i,
        sustainability: /\/(sustainability|berekraft|miljo|environment|esg)$/i,
        investors: /\/(investors|investor-relations|ir|aksje)$/i
    };

    for (const url of urls) {
        for (const [type, pattern] of Object.entries(patterns)) {
            if (seenTypes.has(type)) continue;

            if (pattern.test(url)) {
                // Generate a pretty title
                const title = type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');

                links.push({
                    url,
                    title,
                    type: type as SiteLink['type']
                });
                seenTypes.add(type);
            }
        }
    }
    return links;
}

function extractBusinessHours($: cheerio.CheerioAPI, jsonLdData: any[]): BusinessHours | null {
    // 1. Check schema.org LocalBusiness
    for (const data of jsonLdData) {
        if ((data['@type'] === 'LocalBusiness' || data['@type'] === 'Store' || data['@type'] === 'Restaurant') && data.openingHours) {
            return {
                raw: Array.isArray(data.openingHours) ? data.openingHours.join(', ') : data.openingHours
                // Structured parsing could be added here later
            };
        }
        // Handle openingHoursSpecification logic if present (more complex)
    }

    // 2. HTML pattern matching
    // Look for common patterns in text
    const bodyText = $('body').text();
    // Regex for "Mon-Fri 09:00-17:00" style patterns
    const hoursRegex = /(opening hours|åpningstider|öppettider)[\s\S]{0,50}?(\w{3}\s?-\s?\w{3}|hverdager|mon-fri)[\s\S]{0,20}?(\d{1,2}[:.]\d{2}\s?-\s?\d{1,2}[:.]\d{2})/i;

    const match = bodyText.match(hoursRegex);
    if (match) {
        return {
            raw: match[0].trim().replace(/\s+/g, ' ')
        };
    }

    return null;
}
