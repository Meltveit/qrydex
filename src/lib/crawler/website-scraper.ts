/**
 * Website Scraper
 * Deep-crawls business websites to extract pages, products, services
 */

import { createServerClient } from '@/lib/supabase';
import type { Business } from '@/types/database';

interface PageData {
    url: string;
    title: string;
    content: string;
    links: string[];
}

interface WebsiteData {
    homepage: PageData;
    subpages: PageData[];
    products: string[];
    services: string[];
    contactInfo: {
        emails: string[];
        phones: string[];
        addresses: string[];
    };
}

/**
 * Extract all internal links from HTML
 */
function extractLinks(html: string, baseUrl: string): string[] {
    const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1];

        // Skip external links, anchors, mailto, tel
        if (href.startsWith('http') && !href.startsWith(baseUrl)) continue;
        if (href.startsWith('#')) continue;
        if (href.startsWith('mailto:') || href.startsWith('tel:')) continue;

        // Convert relative to absolute
        const absoluteUrl = href.startsWith('http')
            ? href
            : new URL(href, baseUrl).toString();

        links.push(absoluteUrl);
    }

    return [...new Set(links)]; // Remove duplicates
}

/**
 * Extract text content from HTML (remove scripts, styles)
 */
function extractTextContent(html: string): string {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract contact information from HTML
 */
function extractContactInfo(html: string) {
    const emails = [...new Set(html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])];
    const phones = [...new Set(html.match(/(\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{2,4}[\s-]?\d{2,4}/g) || [])];

    return {
        emails,
        phones: phones.filter(p => p.replace(/\D/g, '').length >= 8), // Valid phone numbers
        addresses: [], // TODO: Extract addresses
    };
}

/**
 * Identify product/service pages
 */
function identifyProductPages(links: string[]): string[] {
    const productKeywords = [
        'product', 'produkt', 'tjeneste', 'service',
        'løsning', 'solution', 'catalog', 'katalog'
    ];

    return links.filter(link =>
        productKeywords.some(keyword =>
            link.toLowerCase().includes(keyword)
        )
    );
}

/**
 * Scrape a single page
 */
async function scrapePage(url: string): Promise<PageData | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Qrydex B2B Indexer/1.0',
            },
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) return null;

        const html = await response.text();

        // Extract title
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';

        const content = extractTextContent(html);
        const links = extractLinks(html, url);

        return {
            url,
            title,
            content: content.slice(0, 10000), // Limit content size
            links,
        };
    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        return null;
    }
}

/**
 * Deep scrape a business website
 */
export async function scrapeWebsite(websiteUrl: string, maxPages: number = 10): Promise<WebsiteData | null> {
    try {
        const normalizedUrl = websiteUrl.startsWith('http')
            ? websiteUrl
            : `https://${websiteUrl}`;

        console.log(`🕷️ Scraping website: ${normalizedUrl}`);

        // Scrape homepage
        const homepage = await scrapePage(normalizedUrl);
        if (!homepage) {
            console.error('Failed to scrape homepage');
            return null;
        }

        // Extract contact info from homepage
        const contactInfo = extractContactInfo(homepage.content);

        // Find product/service pages
        const productPageUrls = identifyProductPages(homepage.links).slice(0, maxPages);

        const subpages: PageData[] = [];
        for (const url of productPageUrls) {
            const page = await scrapePage(url);
            if (page) {
                subpages.push(page);
            }
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return {
            homepage,
            subpages,
            products: [], // Extract from content later
            services: [],
            contactInfo,
        };
    } catch (error) {
        console.error('Error in website scraping:', error);
        return null;
    }
}

/**
 * Batch scrape websites for businesses in database without website data
 */
export async function batchScrapeBusinesses(limit: number = 50) {
    const supabase = createServerClient();

    // Find businesses with domain but no detailed website data
    const { data: businesses } = await supabase
        .from('businesses')
        .select('id, org_number, legal_name, domain, quality_analysis')
        .not('domain', 'is', null)
        .is('quality_analysis->website_scraped', null)
        .limit(limit);

    if (!businesses || businesses.length === 0) {
        console.log('No businesses to scrape');
        return;
    }

    console.log(`📊 Found ${businesses.length} businesses to scrape\n`);

    let scraped = 0;
    let failed = 0;

    for (const business of businesses) {
        try {
            console.log(`Scraping: ${business.legal_name} (${business.domain})`);

            const websiteData = await scrapeWebsite(business.domain!, 5);

            if (websiteData) {
                // Update business with scraped data
                await supabase
                    .from('businesses')
                    .update({
                        quality_analysis: {
                            ...(business.quality_analysis || {}),
                            website_scraped: true,
                            scraped_at: new Date().toISOString(),
                            contact_info: websiteData.contactInfo,
                            subpage_count: websiteData.subpages.length,
                        },
                    })
                    .eq('id', business.id);

                scraped++;
                console.log(`✓ Scraped ${business.legal_name}\n`);
            } else {
                failed++;
            }

            // Rate limiting between businesses
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            failed++;
            console.error(`✗ Failed to scrape ${business.legal_name}:`, error);
        }
    }

    console.log(`\n✅ Scraping complete: ${scraped} scraped, ${failed} failed`);
}
