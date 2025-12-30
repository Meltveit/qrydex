
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
    const startTime = Date.now();

    const rootHostname = new URL(baseUrl).hostname;

    while (queue.length > 0 && visited.size < maxPages) {
        const currentUrl = queue.shift();
        if (!currentUrl || visited.has(currentUrl)) continue;

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

            // Extract Links for crawling
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
                content,
                html, // Store raw HTML for deeper analysis if needed
                links,
                headings: { h1, h2, h3 },
                meta: {
                    description,
                    language: lang
                },
                structuredData
            });

        } catch (error) {
            // console.error(`Failed to crawl ${currentUrl}`, error);
            failedUrls.push(currentUrl);
        }
    }

    const endTime = Date.now();

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
        sitelinks = extractSitelinks(allDiscoveredUrls, baseUrl);

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
        businessHours
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

function extractSitelinks(urls: Set<string>, baseUrl: string): SiteLink[] {
    const links: SiteLink[] = [];
    const seenTypes = new Set<string>();

    const patterns: Record<string, RegExp> = {
        contact: /\/(contact|kontakt|contact-us|get-in-touch|kontakt-oss)$/i,
        about: /\/(about|om-oss|about-us|who-we-are|our-story)$/i,
        products: /\/(products|produkter|catalog|shop|store|nettbutikk)$/i,
        services: /\/(services|tjenester|solutions|losninger)$/i,
        careers: /\/(careers|jobs|vacancies|jobb|karriere)$/i,
        locations: /\/(locations|offices|find-us|butikker)$/i
    };

    for (const url of urls) {
        // Simple logic: if URL matches pattern, add it
        // We prioritize shortest URLs for each type (e.g. /contact over /contact/form)

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
                seenTypes.add(type); // Only one link per type to avoid clutter
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
