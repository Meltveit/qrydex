/**
 * Website Scraper
 * Deep-crawls business websites to extract rich business data for SEO and trust verification
 */

import { createServerClient } from '@/lib/supabase';
import type { Business } from '@/types/database';
import { generateText } from '@/lib/ai/gemini-client';
import { deepCrawlWebsite } from './deep-crawler';

interface PageData {
    url: string;
    title: string;
    content: string;
    links: string[];
    html: string; // Keep raw HTML for analyzing meta tags
    language?: string; // e.g. 'en', 'no', 'en-US'
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
    detectedLanguage?: string;
    enrichedData?: any;
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
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15'
        ];

        let response: Response | null = null;
        let html = '';
        let lastError: any = null;

        // Retry loop (3 attempts)
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const controller = new AbortController();
                // Vary timeout slightly: 20s, 30s, 40s
                const timeoutMs = 20000 + (attempt * 10000);
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

                // Pick random UA
                const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

                response = await fetch(url, {
                    headers: {
                        'User-Agent': userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9,no;q=0.8,sv;q=0.7,da;q=0.7,fi;q=0.7,de;q=0.6,fr;q=0.6,es;q=0.6',
                        'Referer': 'https://www.google.com/',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                        'Sec-Ch-Ua-Mobile': '?0',
                        'Sec-Ch-Ua-Platform': '"Windows"',
                        // Add some randomness to headers if needed
                    },
                    signal: controller.signal,
                    redirect: 'follow'
                });

                clearTimeout(timeoutId);

                // Success! Accessing invalid URL might return 404, which is a "success" in network terms but failed scrape
                // Success!
                if (response.ok) {
                    html = await response.text();
                    break;
                }

                // If 403/429, retry
                if (response.status === 403 || response.status === 429) {
                    await new Promise(r => setTimeout(r, 2000 * attempt)); // Exponential backoff
                    continue;
                }

                // Other errors (404, 500), break generally
                break;

            } catch (err) {
                // Network error, retry
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }

        if (!response || !response.ok || !html) {
            return null;
        }

        // Extract title
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';

        const content = extractTextContent(html);
        const links = extractLinks(html, url);

        // Detect Language
        const langMatch = html.match(/<html[^>]+lang=["']([a-zA-Z]{2}(?:-[a-zA-Z]{2})?)/i);
        const language = langMatch ? langMatch[1].toLowerCase() : undefined;

        return {
            url,
            title,
            content: content.slice(0, 15000),
            links,
            html, // Keep for metadata extraction
            language
        };
    } catch (error) {
        // console.error(`Error scraping ${url}:`, error);
        return null;
    }
}

/**
 * Deep scrape a business website using the new deep crawler
 */
export async function scrapeWebsite(websiteUrl: string, maxPages: number = 50): Promise<WebsiteData | null> {
    try {
        const normalizedUrl = websiteUrl.startsWith('http')
            ? websiteUrl
            : `https://${websiteUrl}`;

        console.log(`🕷️  DEEP SCRAPING: ${normalizedUrl}`);

        // Use the new deep crawler
        const { deepCrawlWebsite } = await import('./deep-crawler');
        const crawlResult = await deepCrawlWebsite(normalizedUrl, maxPages);

        if (!crawlResult || crawlResult.pages.length === 0) {
            console.error('❌ Deep crawl failed or returned no pages');
            return null;
        }

        // Process with data extractor
        const { processDeepCrawl } = await import('./data-extractor');
        const enrichedData = await processDeepCrawl(crawlResult);

        console.log(`✅ Extracted data from ${enrichedData.total_pages_indexed} pages`);
        console.log(`  📧 Found ${enrichedData.contact_info.emails.length} emails`);
        console.log(`  🔗 Social: ${Object.keys(enrichedData.contact_info.social_media).filter(k => enrichedData.contact_info.social_media[k as keyof typeof enrichedData.contact_info.social_media]).length} platforms`);
        console.log(`  🧠 AI: ${enrichedData.industry_category}`);

        // Convert to legacy WebsiteData format for backward compatibility
        const homepage = crawlResult.pages[0];

        return {
            homepage: {
                url: homepage.url,
                title: homepage.title,
                content: homepage.content,
                links: homepage.links,
                language: homepage.meta.language
            },
            subpages: crawlResult.pages.slice(1, 10).map(page => ({
                url: page.url,
                title: page.title,
                content: page.content.slice(0, 1000), // Limit to save space
                links: [],
                language: page.meta.language
            })),
            products: enrichedData.products.en || [],
            services: enrichedData.services.en || [],
            contactInfo: {
                emails: enrichedData.contact_info.emails,
                phones: enrichedData.contact_info.phones,
                addresses: [] // Not extracted yet
            },
            logoUrl: enrichedData.logo_url,
            description: enrichedData.company_description,
            socialMedia: enrichedData.contact_info.social_media as any,
            images: enrichedData.all_images,
            openingHours: undefined,
            potentialBusinessIds: {},
            sitelinks: enrichedData.sitelinks,
            detectedLanguage: enrichedData.detected_languages[0],
            hasSSL: enrichedData.has_ssl,
            securityHeaders: undefined,
            responseTime: enrichedData.response_time_ms,
            // NEW: Store ALL enriched data
            enrichedData: enrichedData
        } as any;

    } catch (error) {
        console.error('❌ Error in deep scraping:', error);
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
                        translations: websiteData.translations, // Save Polyglot Data
                        // Update existing JSONB fields
                        quality_analysis: {
                            website_scraped: true,
                            scraped_at: new Date().toISOString(),
                            contact_info: websiteData.contactInfo,
                            subpage_count: websiteData.subpages.length,
                            potential_ids: websiteData.potentialBusinessIds,
                            services: websiteData.services,
                            products: websiteData.products,
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
    const seenTitles = new Set<string>();

    // Regex to find <a> tags with href and text
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
        let href = match[1];
        // Extract text and clean up
        let text = match[2]
            .replace(/<[^>]+>/g, '') // Strip tags inside anchor
            .replace(/\s+/g, ' ')
            .trim();

        // Also look for title attribute for description
        const titleAttrMatch = match[0].match(/title=["']([^"']+)["']/);
        const titleAttr = titleAttrMatch ? titleAttrMatch[1] : undefined;

        if (!text || text.length > 40 || text.length < 2) continue;
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;

        try {
            const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();

            // Internal links only
            if (new URL(absoluteUrl).hostname !== new URL(baseUrl).hostname) continue;

            // Deduplicate by URL
            if (seenUrls.has(absoluteUrl)) continue;

            // Deduplicate by Title (normalized)
            const normalizedTitle = text.toLowerCase();
            if (seenTitles.has(normalizedTitle)) continue;

            // Expanded multilingual keywords - B2B & Tech Focused
            const relevantKeywords = [
                // English
                'about', 'about us', 'contact', 'services', 'products', 'pricing', 'team', 'careers',
                'news', 'blog', 'support', 'login', 'solutions', 'industries', 'resources', 'company',
                'customers', 'partners', 'case studies', 'testimonials', 'faq', 'help', 'privacy', 'terms',
                'developers', 'api', 'security', 'trust', 'status', 'integration', 'demo', 'book a demo',

                // Norwegian
                'om oss', 'kontakt', 'tjenester', 'produkter', 'priser', 'ansatte', 'jobb', 'aktuelt',
                'kundeservice', 'logg inn', 'regnskap', 'lønn', 'programvare', 'kunder', 'partnere',
                'referanser', 'betingelser', 'personvern', 'hjem', 'artikler', 'sikkerhet', 'status',

                // Swedish
                'om oss', 'kontakta', 'tjänster', 'produkter', 'priser', 'medarbetare', 'jobb',
                'nyheter', 'kundservice', 'logga in', 'kunder', 'referenser', 'villkor', 'integritet',
                'utvecklare', 'säkerhet',

                // Danish
                'om os', 'kontakt', 'tjenester', 'produkter', 'priser', 'medarbejdere', 'job',
                'nyheder', 'kundeservice', 'log ind', 'kunder', 'referencer', 'betingelser', 'privatliv',
                'sikkerhed',

                // Finnish
                'tietoja', 'yhteystiedot', 'palvelut', 'tuotteet', 'hinnat', 'työntekijät', 'työpaikat',
                'uutiset', 'asiakaspalvelu', 'kirjaudu', 'asiakkaat', 'referenssit', 'ehdot', 'turvallisuus',

                // German
                'über uns', 'kontakt', 'dienstleistungen', 'produkte', 'preise', 'team', 'karriere',
                'neuigkeiten', 'blog', 'support', 'anmelden', 'lösungen', 'branchen', 'ressourcen',
                'kunden', 'partner', 'referenzen', 'impressum', 'datenschutz', 'agb', 'sicherheit',

                // French
                'à propos', 'contact', 'services', 'produits', 'tarifs', 'équipe', 'carrières',
                'actualités', 'blog', 'support', 'connexion', 'solutions', 'secteurs', 'ressources',
                'clients', 'partenaires', 'références', 'mentions légales', 'confidentialité', 'sécurité',

                // Spanish
                'sobre nosotros', 'contacto', 'servicios', 'productos', 'precios', 'equipo', 'empleo',
                'noticias', 'blog', 'soporte', 'iniciar sesión', 'soluciones', 'industrias', 'recursos',
                'clientes', 'socios', 'referencias', 'aviso legal', 'privacidad', 'seguridad'
            ];

            // Filter out obviously irrelevant or generic text that might match vaguely
            const irrelevant = ['read more', 'les mer', 'click here', 'se mer', 'cookie', 'cookies'];
            if (irrelevant.some(i => normalizedTitle.includes(i))) continue;

            const isKeywordMatch = relevantKeywords.some(k => normalizedTitle.includes(k) || normalizedTitle === k);
            const isCapitalizedShort = text.length < 25 && /^[A-ZÅÆØÄÖ][a-zåæøäö]+/.test(text) && !text.includes(' '); // e.g. "Pricing", "Team"

            if (isKeywordMatch || isCapitalizedShort) {
                // Use title attribute as description if available, otherwise fallback
                let description = titleAttr && titleAttr.length > 10 ? titleAttr : extractLinkDescription(text, normalizedTitle);

                sitelinks.push({
                    title: text,
                    url: absoluteUrl,
                    description
                });
                seenUrls.add(absoluteUrl);
                seenTitles.add(normalizedTitle);
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
        'about': 'Learn about our company mission and values',
        'contact': 'Get in touch with our team',
        'services': 'Explore our professional services',
        'products': 'Browse our product catalog',
        'pricing': 'View pricing plans and options',
        'careers': 'Join our growing team',
        'blog': 'Read our latest insights and news',
        'support': 'Get help and documentation',
        'login': 'Access your customer account',
        'signup': 'Create a new account',
        'demo': 'Request a product demonstration',
        'solutions': 'See solutions for your industry',
        'privacy': 'Read our Privacy Policy',
        'terms': 'Terms and Conditions',
        'security': 'Our security and compliance standards',
        'developers': 'API documentation and developer resources',

        // Norwegian
        'om oss': 'Lær mer om oss',
        'kontakt': 'Kontakt oss for en prat',
        'tjenester': 'Utforsk våre tjenester',
        'produkter': 'Se våre produkter',
        'priser': 'Se våre priser og pakker',
        'jobb': 'Se ledige stillinger',
        'aktuelt': 'Les siste nytt og artikler',
        'kundeservice': 'Få hjelp og støtte',
        'logg inn': 'Logg inn på din konto',

        // German
        'über uns': 'Über unser Unternehmen',
        'dienstleistungen': 'Unsere Leistungen',
        'produkte': 'Unsere Produkte',
        'karriere': 'Offene Stellen',
        'impressum': 'Rechtliche Informationen',

        // French
        'à propos': 'À propos de nous',
        'produits': 'Nos produits',
        'tarifs': 'Voir les tarifs',
        'carrières': 'Offres d\'emploi',
        'mentions légales': 'Mentions légales',

        // Spanish
        'sobre nosotros': 'Sobre nuestra empresa',
        'contacto': 'Contáctenos',
        'empleo': 'Trabaja con nosotros',
        'aviso legal': 'Información legal'
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
