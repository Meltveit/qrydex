/**
 * Website Scraper
 * Deep-crawls business websites to extract rich business data for SEO and trust verification
 */

import { createServerClient } from '@/lib/supabase';
import type { Business } from '@/types/database';

interface PageData {
    url: string;
    title: string;
    content: string;
    links: string[];
    html: string; // Keep raw HTML for analyzing meta tags
}

export interface WebsiteData {
    homepage: Omit<PageData, 'html'>;
    subpages: Omit<PageData, 'html'>[];
    products: string[];
    services: string[];
    contactInfo: {
        emails: string[];
        phones: string[];
        addresses: string[];
    };
    // New fields for rich snippets
    logoUrl?: string;
    description?: string;
    socialMedia: {
        linkedin?: string;
        facebook?: string;
        instagram?: string;
        twitter?: string;
        youtube?: string;
    };
    openingHours?: Record<string, { open: string; close: string }>;
    images: string[];
    potentialBusinessIds: {
        NO?: string[];
        DK?: string[];
        FI?: string[];
        SE?: string[];
    };
}

/**
 * Extract potential business identifiers for Nordic countries
 */
function extractBusinessIds(text: string): WebsiteData['potentialBusinessIds'] {
    const ids: WebsiteData['potentialBusinessIds'] = {};

    // Norway: 9 digits, often org.nr: 123 456 789 or 123456789
    const noMatches = text.match(/(?:org\.?\s?nr\.?|foretaksregisteret)\D*(\d{3}\s?\d{3}\s?\d{3}|\d{9})/gi);
    if (noMatches) {
        ids.NO = [...new Set(noMatches.map(m => m.replace(/\D/g, '')))];
    }

    // Denmark: CVR followed by 8 digits
    const dkMatches = text.match(/cvr\D*(\d{8})/gi);
    if (dkMatches) {
        ids.DK = [...new Set(dkMatches.map(m => m.replace(/\D/g, '')))];
    }

    // Finland: Y-tunnus 1234567-8
    const fiMatches = text.match(/(?:y-tunnus|y-code)\D*(\d{7}-\d)/gi);
    if (fiMatches) {
        ids.FI = [...new Set(fiMatches.map(m => {
            const clean = m.match(/(\d{7}-\d)/);
            return clean ? clean[1] : m;
        }))];
    }

    // Sweden: 10 digits 123456-7890 (Org.nr)
    const seMatches = text.match(/(?:org\.?\s?nr\.?)\D*(\d{6}-\d{4})/gi);
    if (seMatches) {
        ids.SE = [...new Set(seMatches.map(m => m.match(/(\d{6}-\d{4})/)![1]))];
    }

    return ids;
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

        // Skip anchors, mailto, tel
        if (href.startsWith('#')) continue;
        if (href.startsWith('mailto:') || href.startsWith('tel:')) continue;

        try {
            // Convert relative to absolute
            const absoluteUrl = href.startsWith('http')
                ? href
                : new URL(href, baseUrl).toString();

            // Only internal links for scraping
            if (new URL(absoluteUrl).hostname === new URL(baseUrl).hostname) {
                links.push(absoluteUrl);
            }
        } catch (e) {
            // Invalid URL
        }
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
 * Extract meta description
 */
function extractDescription(html: string): string | undefined {
    const metaDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    return metaDesc?.[1] || ogDesc?.[1];
}

/**
 * Extract company logo URL
 */
function extractLogo(html: string, baseUrl: string): string | undefined {
    // 1. Check structured data (JSON-LD)
    // 2. Check OpenGraph image
    const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImage?.[1]) return resolveUrl(ogImage[1], baseUrl);

    // 3. Check for logo class names or IDs
    const logoImg = html.match(/<img[^>]+src=["']([^"']+)["'][^>]+(class|id)=["'][^"']*(logo|brand|header-img)[^"']*["']/i);
    if (logoImg?.[1]) return resolveUrl(logoImg[1], baseUrl);

    // 4. Check favicon
    const favicon = html.match(/<link\s+rel=["'](?:shortcut )?icon["']\s+href=["']([^"']+)["']/i);
    if (favicon?.[1]) return resolveUrl(favicon[1], baseUrl);

    return undefined;
}

/**
 * Extract social media links
 */
function extractSocialMedia(html: string): WebsiteData['socialMedia'] {
    const social: WebsiteData['socialMedia'] = {};
    const lowerHtml = html.toLowerCase();

    const extract = (platform: keyof WebsiteData['socialMedia']) => {
        const regex = new RegExp(`href=["'](https?:\/\/(?:www\.)?${platform}\.com\/[^"']+)["']`, 'i');
        const match = html.match(regex);
        if (match) social[platform] = match[1];
    };

    extract('linkedin');
    extract('facebook');
    extract('instagram');
    extract('twitter');
    extract('youtube');

    return social;
}

/**
 * Helper to resolve relative URLs
 */
function resolveUrl(relative: string, base: string): string {
    try {
        return new URL(relative, base).toString();
    } catch {
        return relative;
    }
}

/**
 * Extract potential business hours
 */
function extractOpeningHours(html: string): WebsiteData['openingHours'] {
    // Very basic heuristic extraction - improved later with AI
    // Looks for patterns like "08:00 - 16:00" or "09-17"
    const hoursRegex = /(?:man|tirs|ons|tors|fre|lør|søn|mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\s*:?\s*(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)/gi;

    // For now, if we find matches, we could parse them, but implementation is complex
    // Returning undefined to indicate we need better parsing logic or LLM
    return undefined;
}

/**
 * Extract contact information from HTML
 */
function extractContactInfo(html: string) {
    const emails = [...new Set(html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])];
    const phones = [...new Set(html.match(/(?:\+|00)\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}|(?:\d{2,3}\s){2,3}\d{2,3}/g) || [])];

    return {
        emails: emails.filter(e => !e.includes('wix') && !e.includes('sentry') && !e.includes('example')),
        phones: phones.map(p => p.trim()),
        addresses: [], // TODO: Enhanced address parser
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Qrydex B2B Indexer/1.0 (Bot for business verification)',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

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
            content: content.slice(0, 15000),
            links,
            html, // Keep for metadata extraction
        };
    } catch (error) {
        // console.error(`Error scraping ${url}:`, error);
        return null;
    }
}

/**
 * Deep scrape a business website
 */
export async function scrapeWebsite(websiteUrl: string, maxPages: number = 5): Promise<WebsiteData | null> {
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

        // Extract enhanced data from homepage
        const contactInfo = extractContactInfo(homepage.html);
        const logoUrl = extractLogo(homepage.html, normalizedUrl);
        const description = extractDescription(homepage.html);
        const socialMedia = extractSocialMedia(homepage.html);
        const potentialBusinessIds = extractBusinessIds(homepage.content);

        // Find product/service pages
        const productPageUrls = identifyProductPages(homepage.links).slice(0, maxPages);

        const subpages: PageData[] = [];
        for (const url of productPageUrls) {
            const page = await scrapePage(url);
            if (page) {
                // Remove HTML from subpages to save memory
                const { html, ...pageData } = page;
                subpages.push(page as any);

                // Merge additional contact info found on subpages
                const subContact = extractContactInfo(page.html);
                contactInfo.emails.push(...subContact.emails);
                contactInfo.phones.push(...subContact.phones);
            }
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Deduplicate contact info
        contactInfo.emails = [...new Set(contactInfo.emails)];
        contactInfo.phones = [...new Set(contactInfo.phones)];

        return {
            homepage: {
                url: homepage.url,
                title: homepage.title,
                content: homepage.content,
                links: homepage.links
            },
            subpages: subpages as unknown as Omit<PageData, 'html'>[],
            products: [],
            services: [],
            contactInfo,
            logoUrl,
            description,
            socialMedia,
            images: [], // Placeholder for extracted images
            openingHours: undefined,
            potentialBusinessIds
        };
    } catch (error) {
        console.error('Error in website scraping:', error);
        return null;
    }
}

/**
 * Batch scrape businesses - Updated for enhanced data
 */
export async function batchScrapeBusinesses(limit: number = 10) {
    const supabase = createServerClient();

    // Find businesses with domain but no enhanced website data
    const { data: businesses } = await supabase
        .from('businesses')
        .select('id, org_number, legal_name, domain')
        .not('domain', 'is', null)
        .is('company_description', null) // Use this as flag for "needs enhanced scrape"
        .limit(limit);

    if (!businesses || businesses.length === 0) {
        console.log('No businesses need enhanced scraping');
        return;
    }

    console.log(`📊 Found ${businesses.length} businesses to enhance\n`);

    let scraped = 0;
    let failed = 0;

    for (const business of businesses) {
        try {
            console.log(`Scraping: ${business.legal_name} (${business.domain})`);

            const websiteData = await scrapeWebsite(business.domain!, 5);

            if (websiteData) {
                // Update business with enhanced data
                await supabase
                    .from('businesses')
                    .update({
                        logo_url: websiteData.logoUrl,
                        company_description: websiteData.description || 'Ingen beskrivelse funnet',
                        social_media: websiteData.socialMedia,
                        // Update existing JSONB fields
                        quality_analysis: {
                            website_scraped: true,
                            scraped_at: new Date().toISOString(),
                            contact_info: websiteData.contactInfo,
                            subpage_count: websiteData.subpages.length,
                        },
                    })
                    .eq('id', business.id);

                scraped++;
                console.log(`✓ Enhanced ${business.legal_name}\n`);
            } else {
                failed++;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            failed++;
            console.error(`✗ Failed: ${business.legal_name}`);
        }
    }

    console.log(`\n✅ Enhancement complete: ${scraped} scraped, ${failed} failed`);
}
