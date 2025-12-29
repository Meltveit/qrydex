/**
 * Deep Website Crawler v2.0 - Production Grade
 * 
 * Features:
 * - Respects robots.txt
 * - Parses sitemap.xml
 * - Deep crawls all pages
 * - Parallel processing
 * - Full content indexing
 */

import pLimit from 'p-limit';
import * as cheerio from 'cheerio';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_PAGES_PER_SITE = 200; // Maximum pages to crawl per website
const CONCURRENCY = 10; // Parallel page fetches
const TIMEOUT_MS = 20000; // 20s for slow servers
const SITEMAP_TIMEOUT_MS = 30000; // 30s for sitemaps (can be huge!)
const USER_AGENT = 'QrydexBot/2.0 (+https://qrydex.com/bot)';

// ============================================================================
// ROBOTS.TXT PARSER
// ============================================================================

interface RobotsRules {
    allowed: RegExp[];
    disallowed: RegExp[];
    crawlDelay?: number;
    sitemaps: string[];
}

/**
 * Parse robots.txt and extract rules for our bot
 */
async function parseRobotsTxt(baseUrl: string): Promise<RobotsRules> {
    const rules: RobotsRules = {
        allowed: [],
        disallowed: [],
        sitemaps: []
    };

    try {
        const robotsUrl = new URL('/robots.txt', baseUrl).toString();
        const response = await fetch(robotsUrl, {
            signal: AbortSignal.timeout(5000),
            headers: { 'User-Agent': USER_AGENT }
        });

        if (!response.ok) {
            console.log('  ⚠️ No robots.txt found, proceeding with caution');
            return rules;
        }

        const text = await response.text();
        const lines = text.split('\n');

        let relevantToUs = false; // Are we reading rules for our user-agent?

        for (const line of lines) {
            const trimmed = line.trim().toLowerCase();

            // Check if this section applies to us
            if (trimmed.startsWith('user-agent:')) {
                const agent = trimmed.split(':')[1].trim();
                relevantToUs = agent === '*' || agent === 'qrydexbot' || agent.includes('bot');
            }

            if (!relevantToUs) continue;

            // Disallow rules
            if (trimmed.startsWith('disallow:')) {
                const path = trimmed.split(':').slice(1).join(':').trim();
                if (path && path !== '') {
                    // Convert to regex pattern
                    const pattern = path.replace(/\*/g, '.*').replace(/\?/g, '\\?');
                    rules.disallowed.push(new RegExp(`^${pattern}`));
                }
            }

            // Allow rules (override disallow)
            if (trimmed.startsWith('allow:')) {
                const path = trimmed.split(':').slice(1).join(':').trim();
                if (path && path !== '') {
                    const pattern = path.replace(/\*/g, '.*').replace(/\?/g, '\\?');
                    rules.allowed.push(new RegExp(`^${pattern}`));
                }
            }

            // Crawl delay
            if (trimmed.startsWith('crawl-delay:')) {
                const delay = parseFloat(trimmed.split(':')[1].trim());
                if (!isNaN(delay)) {
                    rules.crawlDelay = delay * 1000; // Convert to ms
                }
            }

            // Sitemap URLs
            if (trimmed.startsWith('sitemap:')) {
                const sitemapUrl = trimmed.split(':').slice(1).join(':').trim();
                if (sitemapUrl) {
                    rules.sitemaps.push(sitemapUrl);
                }
            }
        }

        console.log(`  🤖 robots.txt: ${rules.disallowed.length} blocked paths, ${rules.sitemaps.length} sitemaps`);
        return rules;

    } catch (error) {
        console.warn('  ⚠️ Could not parse robots.txt:', error);
        return rules;
    }
}

/**
 * Check if URL is allowed by robots.txt
 */
function isAllowedByRobots(url: string, baseUrl: string, rules: RobotsRules): boolean {
    try {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;

        // Check explicit allow rules first
        for (const allowPattern of rules.allowed) {
            if (allowPattern.test(path)) {
                return true;
            }
        }

        // Check disallow rules
        for (const disallowPattern of rules.disallowed) {
            if (disallowPattern.test(path)) {
                return false;
            }
        }

        return true; // Default: allow
    } catch {
        return false;
    }
}

// ============================================================================
// SITEMAP PARSER
// ============================================================================

/**
 * Parse sitemap.xml and extract all URLs
 */
async function parseSitemap(sitemapUrl: string): Promise<string[]> {
    const urls: string[] = [];

    try {
        const response = await fetch(sitemapUrl, {
            signal: AbortSignal.timeout(SITEMAP_TIMEOUT_MS),
            headers: { 'User-Agent': USER_AGENT }
        });

        if (!response.ok) return urls;

        // Check for content size to avoid OOM on massive sitemaps (e.g. IKEA, DSV)
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) { // 5MB limit
            console.warn(`  ⚠️ Sitemap too large (${contentLength} bytes), skipping main parse.`);
            return urls;
        }

        const xml = await response.text();

        // Safety: Work on a truncated version if still too huge after download
        const MAX_XML_SIZE = 1000000; // 1MB
        const processXml = xml.length > MAX_XML_SIZE ? xml.substring(0, MAX_XML_SIZE) : xml;

        // Simple regex-based extraction
        const urlMatches = processXml.match(/<loc>(.*?)<\/loc>/g);
        if (urlMatches) {
            for (const match of urlMatches) {
                const url = match.replace(/<\/?loc>/g, '').trim();
                urls.push(url);
            }
        }

        // Check for nested sitemaps (sitemap index)
        // CRITICAL: Limit recursion depth and total URLs to avoid OOM crash on huge sites (e.g. IKEA)
        const sitemapMatches = xml.match(/<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/g);
        if (sitemapMatches) {
            // Only parse up to 3 nested sitemaps to save memory
            for (const match of sitemapMatches.slice(0, 3)) {
                const nestedUrl = match.match(/<loc>(.*?)<\/loc>/)?.[1];
                // Check currently accumulated URLs (this function returns array, logic needs to be in caller or here if modified)
                // For now, simple recursion protection
                if (nestedUrl) {
                    const nestedUrls = await parseSitemap(nestedUrl);
                    urls.push(...nestedUrls);
                    if (urls.length > 500) break; // Hard stop
                }
            }
        }
    } catch (error) {
        console.warn(`  ⚠️ Could not parse sitemap ${sitemapUrl}:`, error);
    }

    console.log(`  🗺️ Sitemap yielded ${urls.length} URLs`);
    return urls;
}



// ============================================================================
// PAGE CRAWLER
// ============================================================================

interface CrawledPage {
    url: string;
    title: string;
    content: string; // Cleaned text content
    html: string; // Raw HTML
    links: string[]; // Internal links found
    images: string[];
    headings: { h1: string[]; h2: string[]; h3: string[] };
    meta: {
        description?: string;
        keywords?: string;
        author?: string;
        language?: string;
    };
    structuredData?: any[]; // JSON-LD data
}

/**
 * Crawl a single page and extract all data
 */
async function crawlPage(url: string): Promise<CrawledPage | null> {
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9,no;q=0.8'
            }
        });

        // CRITICAL: Exclude pages with non-2xx status codes (404, 403, 500, etc.)
        if (response.status < 200 || response.status >= 300) {
            console.log(`  ⚠️ Skipping ${url} (HTTP ${response.status})`);
            return null;
        }

        if (!response.headers.get('content-type')?.includes('html')) {
            return null;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove scripts, styles, and comments
        $('script, style, noscript, iframe').remove();

        // Extract title
        const title = $('title').text().trim() || $('h1').first().text().trim() || '';

        // Extract meta tags
        const meta = {
            description: $('meta[name="description"]').attr('content') ||
                $('meta[property="og:description"]').attr('content'),
            keywords: $('meta[name="keywords"]').attr('content'),
            author: $('meta[name="author"]').attr('content'),
            language: $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content')
        };

        // Extract headings
        const headings = {
            h1: $('h1').map((_: number, el: any) => $(el).text().trim()).get(),
            h2: $('h2').map((_: number, el: any) => $(el).text().trim()).get(),
            h3: $('h3').map((_: number, el: any) => $(el).text().trim()).get()
        };

        // Extract all text content
        const content = $('body').text()
            .replace(/\s+/g, ' ')
            .trim();

        // Extract internal links
        const baseUrl = new URL(url);
        const links: string[] = [];
        $('a[href]').each((_: number, el: any) => {
            const href = $(el).attr('href');
            if (!href) return;

            try {
                const linkUrl = new URL(href, url);
                // Only internal links, same domain
                if (linkUrl.hostname === baseUrl.hostname) {
                    // Remove hash and normalize
                    linkUrl.hash = '';
                    links.push(linkUrl.toString());
                }
            } catch {
                // Invalid URL, skip
            }
        });

        // Extract images
        const images: string[] = [];
        $('img[src]').each((_: number, el: any) => {
            const src = $(el).attr('src');
            if (src) {
                try {
                    const imgUrl = new URL(src, url).toString();
                    images.push(imgUrl);
                } catch {
                    // Invalid URL
                }
            }
        });

        // Extract structured data (JSON-LD)
        const structuredData: any[] = [];
        $('script[type="application/ld+json"]').each((_: number, el: any) => {
            try {
                const data = JSON.parse($(el).html() || '{}');
                structuredData.push(data);
            } catch {
                // Invalid JSON
            }
        });

        return {
            url,
            title,
            content,
            html,
            links: [...new Set(links)], // Deduplicate
            images: [...new Set(images)],
            headings,
            meta,
            structuredData: structuredData.length > 0 ? structuredData : undefined
        };

    } catch (error) {
        console.error(`  ❌ Failed to crawl ${url}:`, error);
        return null;
    }
}

// ============================================================================
// DEEP CRAWLER
// ============================================================================

export interface DeepCrawlResult {
    baseUrl: string;
    totalPages: number;
    pages: CrawledPage[];
    // Aggregated data
    allContent: string; // Combined text from all pages
    allLinks: string[]; // All unique internal links
    allImages: string[];
    sitemapUrls: string[];
    robotsRules: RobotsRules;
    crawlStats: {
        startTime: number;
        endTime: number;
        duration: number;
        successfulPages: number;
        failedPages: number;
    };
}

/**
 * Deep crawl entire website
 */
export async function deepCrawlWebsite(
    startUrl: string,
    maxPages: number = MAX_PAGES_PER_SITE
): Promise<DeepCrawlResult | null> {
    const startTime = Date.now();

    try {
        const baseUrl = new URL(startUrl).origin;
        console.log(`\n🕷️ DEEP CRAWL: ${baseUrl}`);
        console.log(`  📊 Max pages: ${maxPages}, Concurrency: ${CONCURRENCY}`);

        // ====================================================================
        // PHASE 1: Parse robots.txt
        // ====================================================================

        const robotsRules = await parseRobotsTxt(baseUrl);
        const crawlDelay = robotsRules.crawlDelay || 100; // Default 100ms

        // ====================================================================
        // PHASE 2: Discover URLs from sitemaps
        // ====================================================================

        let discoveredUrls: string[] = [];

        // Try sitemaps from robots.txt
        for (const sitemapUrl of robotsRules.sitemaps) {
            const urls = await parseSitemap(sitemapUrl);
            discoveredUrls.push(...urls);
        }

        // Try default sitemap locations if none found
        if (discoveredUrls.length === 0) {
            console.log('  🔍 Trying default sitemap locations...');
            const defaultSitemaps = [
                `${baseUrl}/sitemap.xml`,
                `${baseUrl}/sitemap_index.xml`,
                `${baseUrl}/sitemap1.xml`
            ];

            // Try all sitemaps in parallel with timeouts
            const sitemapPromises = defaultSitemaps.map(url =>
                parseSitemap(url).catch(() => [])
            );

            const allResults = await Promise.all(sitemapPromises);
            discoveredUrls = allResults.flat();

            // If still nothing, just use homepage
            if (discoveredUrls.length === 0) {
                console.log('  ℹ️ No sitemaps found, will crawl from homepage only');
            }
        }

        // ====================================================================
        // PHASE 3: Crawl all pages
        // ====================================================================

        const toVisit = new Set<string>([startUrl, ...discoveredUrls]);
        const visited = new Set<string>();
        const pages: CrawledPage[] = [];
        let failedCount = 0;

        const limit = pLimit(CONCURRENCY);

        console.log(`  🎯 Found ${toVisit.size} URLs to crawl`);

        // Process URLs in batches
        while (toVisit.size > 0 && visited.size < maxPages) {
            const batch = Array.from(toVisit)
                .slice(0, CONCURRENCY * 2)
                .filter(url => !visited.has(url) && isAllowedByRobots(url, baseUrl, robotsRules));

            if (batch.length === 0) break;

            // Crawl batch in parallel
            const results = await Promise.all(
                batch.map(url =>
                    limit(async () => {
                        visited.add(url);
                        toVisit.delete(url);

                        const page = await crawlPage(url);

                        if (page) {
                            pages.push(page);

                            // Add newly discovered links
                            for (const link of page.links) {
                                if (!visited.has(link) && visited.size + toVisit.size < maxPages * 2) {
                                    toVisit.add(link);
                                }
                            }

                            console.log(`  ✅ [${pages.length}/${maxPages}] ${page.title || url}`);
                        } else {
                            failedCount++;
                        }

                        // Respect crawl delay
                        await new Promise(resolve => setTimeout(resolve, crawlDelay));
                        return page;
                    })
                )
            );

            // Stop if we've hit our limit
            if (pages.length >= maxPages) break;
        }

        // ====================================================================
        // PHASE 4: Aggregate results
        // ====================================================================

        const endTime = Date.now();
        const duration = endTime - startTime;

        const allContent = pages.map(p => p.content).join('\n\n');
        const allLinks = [...new Set(pages.flatMap(p => p.links))];
        const allImages = [...new Set(pages.flatMap(p => p.images))];

        console.log(`\n  ✨ Crawl complete!`);
        console.log(`  📄 Crawled: ${pages.length} pages`);
        console.log(`  ⏱️ Duration: ${(duration / 1000).toFixed(1)}s`);
        console.log(`  📊 Content size: ${(allContent.length / 1024).toFixed(1)}KB`);

        return {
            baseUrl,
            totalPages: pages.length,
            pages,
            allContent,
            allLinks,
            allImages,
            sitemapUrls: discoveredUrls,
            robotsRules,
            crawlStats: {
                startTime,
                endTime,
                duration,
                successfulPages: pages.length,
                failedPages: failedCount
            }
        };

    } catch (error) {
        console.error('❌ Deep crawl failed:', error);
        return null;
    }
}

// ============================================================================
// EXPORT FOR BACKWARD COMPATIBILITY
// ============================================================================

export { crawlPage, parseRobotsTxt, parseSitemap };
