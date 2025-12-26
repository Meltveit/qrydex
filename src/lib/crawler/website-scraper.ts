/**
 * Website Scraper
 * Deep-crawls business websites to extract rich business data for SEO and trust verification
 */

import { createServerClient } from '@/lib/supabase';
import type { Business } from '@/types/database';
import { generateText } from '@/lib/ai/gemini-client';

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
    sitelinks?: { title: string; url: string; description?: string }[];
    // Security & Technical
    hasSSL?: boolean;
    securityHeaders?: {
        strictTransportSecurity?: boolean;
        contentSecurityPolicy?: boolean;
        xFrameOptions?: boolean;
    };
    responseTime?: number;
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
export async function scrapeWebsite(websiteUrl: string, maxPages: number = 10): Promise<WebsiteData | null> {
    try {
        const normalizedUrl = websiteUrl.startsWith('http')
            ? websiteUrl
            : `https://${websiteUrl}`;

        console.log(`🕷️ Scraping website: ${normalizedUrl} (max ${maxPages} pages)`);

        // Scrape homepage
        const startTime = Date.now();
        const homepage = await scrapePage(normalizedUrl);
        if (!homepage) {
            console.error('Failed to scrape homepage');
            return null;
        }
        const responseTime = Date.now() - startTime;

        // Check SSL and Security Headers
        const hasSSL = normalizedUrl.startsWith('https://');
        let securityHeaders = {
            strictTransportSecurity: false,
            contentSecurityPolicy: false,
            xFrameOptions: false
        };

        try {
            const securityCheckResponse = await fetch(normalizedUrl, {
                method: 'HEAD',
                redirect: 'follow'
            });
            const headers = securityCheckResponse.headers;
            securityHeaders = {
                strictTransportSecurity: headers.has('strict-transport-security'),
                contentSecurityPolicy: headers.has('content-security-policy'),
                xFrameOptions: headers.has('x-frame-options')
            };
            console.log(`🔒 SSL: ${hasSSL}, Security Headers: ${Object.values(securityHeaders).filter(Boolean).length}/3`);
        } catch (secError) {
            console.warn('⚠️ Could not check security headers');
        }

        // Extract enhanced data from homepage
        const contactInfo = extractContactInfo(homepage.html);
        const logoUrl = extractLogo(homepage.html, normalizedUrl);
        let description = extractDescription(homepage.html);
        const socialMedia = extractSocialMedia(homepage.html);
        const potentialBusinessIds = extractBusinessIds(homepage.content);
        const sitelinks = extractSitelinks(homepage.html, normalizedUrl);

        // Deep Scan AI Summarization (Bot A intelligence)
        // Now requesting structured data: Description + Services + Products
        if (!description || description.length < 50 || true) { // Always run AI analysis for services even if description exists
            try {
                const prompt = `Analyze this website content and extract key business data. Return strictly valid JSON with this structure:
{
  "description": "Professional summary under 200 chars in Norwegian",
  "services": ["Service 1 (Norwegian)", "Service 2 (Norwegian)"],
  "services_en": ["Service 1 (English)", "Service 2 (English)"],
  "products": ["Product 1 (Norwegian)", "Product 2 (Norwegian)"],
  "products_en": ["Product 1 (English)", "Product 2 (English)"],
  "industry_category": "Main Industry Category"
}
Content: ${homepage.content.slice(0, 3000)}`;

                const aiResponse = await generateText(prompt);

                if (aiResponse) {
                    try {
                        // Clean markdown code blocks if present
                        const jsonStr = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                        const data = JSON.parse(jsonStr);

                        if (data.description) description = data.description;
                        if (Array.isArray(data.services)) websiteData.services = data.services;
                        if (Array.isArray(data.products)) websiteData.products = data.products;

                        // Store English data in temporary augmentation properties (need to cast or extend interface if strict)
                        // For simplicity, we just attach them to data object to be used in batchScrape
                        (websiteData as any).services_en = Array.isArray(data.services_en) ? data.services_en : [];
                        (websiteData as any).products_en = Array.isArray(data.products_en) ? data.products_en : [];

                        // We also get industry category which is great
                        if (data.industry_category) {
                            // We will merge this into quality_analysis later
                            (websiteData as any).industry_category = data.industry_category;
                        }

                        console.log('✨ Generated AI Deep Scan data (Multilingual):', {
                            services_no: data.services?.length,
                            services_en: data.services_en?.length
                        });
                    } catch (parseError) {
                        console.warn('Failed to parse AI JSON:', parseError);
                        // Fallback: If it's just text, treat as description
                        if (!description) description = aiResponse.slice(0, 200);
                    }
                }
            } catch (aiError) {
                console.warn('Failed to generate AI data:', aiError);
            }
        }

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
            potentialBusinessIds,
            sitelinks,
            // Security & Performance
            hasSSL,
            securityHeaders,
            responseTime,
            // Pass through augmented data
            services_en: (websiteData as any).services_en,
            products_en: (websiteData as any).products_en,
            industry_category: (websiteData as any).industry_category
        } as any; // Cast to any to bypass strict interface for new fields temporarily
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

            const websiteData: any = await scrapeWebsite(business.domain!, 5);

            if (websiteData) {
                // Update business with enhanced data
                await supabase
                    .from('businesses')
                    .update({
                        logo_url: websiteData.logoUrl,
                        company_description: websiteData.description || 'Ingen beskrivelse funnet',
                        social_media: websiteData.socialMedia,
                        sitelinks: websiteData.sitelinks, // Save Sitelinks
                        // Update existing JSONB fields
                        quality_analysis: {
                            website_scraped: true,
                            scraped_at: new Date().toISOString(),
                            contact_info: websiteData.contactInfo,
                            subpage_count: websiteData.subpages.length,
                            potential_ids: websiteData.potentialBusinessIds,
                            services: websiteData.services,
                            products: websiteData.products,
                            services_en: websiteData.services_en, // English
                            products_en: websiteData.products_en, // English
                            industry_category: websiteData.industry_category || null
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

/**
 * Extract sitelinks from internal links using Anchor Text
 * Now with descriptions and multilingual support (EN, NO, SV, DA, FI)
 */
function extractSitelinks(html: string, baseUrl: string): { title: string; url: string; description?: string }[] {
    const sitelinks: { title: string; url: string; description?: string }[] = [];
    const seenUrls = new Set<string>();

    // Regex to find <a> tags with href and text
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
        let href = match[1];
        let text = match[2]
            .replace(/<[^>]+>/g, '') // Strip tags inside anchor (e.g. spans)
            .replace(/\s+/g, ' ')
            .trim();

        if (!text || text.length > 30 || text.length < 2) continue; // Skip empty or too long text
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;

        try {
            const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();

            // Internal links only
            if (new URL(absoluteUrl).hostname !== new URL(baseUrl).hostname) continue;

            // Deduplicate
            if (seenUrls.has(absoluteUrl)) continue;

            const lowerText = text.toLowerCase();

            // Expanded multilingual keywords
            const relevantKeywords = [
                // English
                'about', 'about us', 'contact', 'services', 'products', 'pricing', 'team', 'careers',
                'news', 'blog', 'support', 'login', 'solutions', 'industries', 'resources', 'company',
                'customers', 'partners', 'case studies', 'testimonials',

                // Norwegian
                'om oss', 'kontakt', 'tjenester', 'produkter', 'priser', 'ansatte', 'jobb', 'aktuelt',
                'kundeservice', 'logg inn', 'regnskap', 'lønn', 'programvare', 'kunder', 'partnere',

                // Swedish
                'om oss', 'kontakta', 'tjänster', 'produkter', 'priser', 'medarbetare', 'jobb',
                'nyheter', 'kundservice', 'logga in', 'kunder',

                // Danish
                'om os', 'kontakt', 'tjenester', 'produkter', 'priser', 'medarbejdere', 'job',
                'nyheder', 'kundeservice', 'log ind', 'kunder',

                // Finnish
                'tietoja', 'yhteystiedot', 'palvelut', 'tuotteet', 'hinnat', 'työntekijät', 'työpaikat',
                'uutiset', 'asiakaspalvelu', 'kirjaudu', 'asiakkaat'
            ];

            // Heuristic: If text matches keywords OR is very short & distinct (CamelCase?)
            if (relevantKeywords.some(k => lowerText.includes(k)) || (text.length < 20 && /^[A-ZÅÆØÄÖ]/.test(text))) {
                // Extract meta description or first paragraph as description
                const description = extractLinkDescription(text, lowerText);

                sitelinks.push({
                    title: text,
                    url: absoluteUrl,
                    description
                });
                seenUrls.add(absoluteUrl);
            }
        } catch (e) {
            // Invalid URL
        }
    }

    return sitelinks.slice(0, 8); // Limit to top 8
}

/**
 * Generate a short description for a sitelink based on its title
 */
function extractLinkDescription(title: string, lowerTitle: string): string {
    // Map common navigation items to descriptions
    const descriptionMap: Record<string, string> = {
        // English
        'about': 'Learn about our company',
        'contact': 'Get in touch with us',
        'services': 'Explore our services',
        'products': 'Browse our products',
        'pricing': 'View pricing options',
        'careers': 'Join our team',
        'blog': 'Read our latest insights',
        'support': 'Get help and support',

        // Norwegian
        'om oss': 'Lær mer om oss',
        'kontakt': 'Kontakt oss',
        'tjenester': 'Utforsk våre tjenester',
        'produkter': 'Se våre produkter',
        'priser': 'Se priser',
        'jobb': 'Bli en del av teamet',
        'aktuelt': 'Les siste nytt',
        'kundeservice': 'Få hjelp og støtte',
        'regnskap': 'Regnskapstjenester',
        'lønn': 'Lønnstjenester',
    };

    // Find matching description
    for (const [key, desc] of Object.entries(descriptionMap)) {
        if (lowerTitle.includes(key)) {
            return desc;
        }
    }

    // Default generic description
    return `Visit our ${title} page`;
}
