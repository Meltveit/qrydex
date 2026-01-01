/**
 * Enhanced Data Extractor
 * Processes deep crawl results and enriches business data with AI
 */

import { generateText } from '@/lib/ai/gemini-client';
import type { DeepCrawlResult, BusinessHours } from './deep-crawler';

export interface EnrichedBusinessData {
    // Core Data
    company_description: string;
    industry_category: string;

    // Deep Crawl Metadata
    total_pages_indexed: number;
    sitemap_urls: string[];

    // Content Analysis
    all_headings: {
        h1: string[];
        h2: string[];
        h3: string[];
    };
    meta_descriptions: string[];
    detected_languages: string[];

    // Media & Assets
    all_images: string[];
    logo_url?: string;

    // Structured Data
    json_ld_data?: any[];

    // Contact & Social
    contact_info: {
        emails: string[];
        phones: string[];
        vat_number?: string;
        social_media: {
            linkedin?: string;
            facebook?: string;
            twitter?: string;
            instagram?: string;
        };
    };

    // Services & Products (Multilingual)
    services: {
        no: string[];
        en: string[];
        de: string[];
        fr: string[];
        es: string[];
    };

    products: {
        no: string[];
        en: string[];
        de: string[];
        fr: string[];
        es: string[];
    };

    // SEO Data
    search_keywords: string[];
    sitelinks: Array<{
        title: string;
        url: string;
        description?: string;
    }>;

    // Translations
    translations: {
        [locale: string]: {
            description?: string;
            products?: string[];
            services?: string[];
        }
    };

    // Technical
    has_ssl: boolean;
    response_time_ms: number;

    // Crawl Stats
    crawl_timestamp: string;
    crawl_duration_ms: number;
    business_hours?: BusinessHours;
}

/**
 * Extract contact information from all pages
 */
/**
 * Extract contact information - Combines Regex analysis with Deep Crawl extraction
 */
function extractContactInfo(crawlResult: DeepCrawlResult) {
    // 1. Start with explicit extraction (from deep-crawler.ts)
    const emails = new Set<string>(crawlResult.extractedContact?.emails || []);
    const phones = new Set<string>(crawlResult.extractedContact?.phones || []);
    const social = { ...crawlResult.extractedContact?.socials } as any;

    // 2. Fallback: Scan text content again if deep crawl missed things (Legacy support)
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}/g;

    for (const page of crawlResult.pages) {
        // Emails
        const foundEmails = page.content.match(emailRegex);
        if (foundEmails) {
            foundEmails.forEach(email => {
                if (!email.includes('example.com') && !email.includes('test.com') && !email.includes('sentry') && !email.includes('wix')) {
                    emails.add(email.toLowerCase());
                }
            });
        }

        // Phones
        const foundPhones = page.content.match(phoneRegex);
        if (foundPhones) {
            foundPhones.forEach(phone => {
                const digits = phone.replace(/\D/g, '');
                if (digits.length >= 8 && digits.length <= 15) {
                    phones.add(phone.trim());
                }
            });
        }
    }

    // Prioritize emails by importance
    const prioritizedEmails = Array.from(emails).map(email => {
        const localPart = email.split('@')[0].toLowerCase();
        let priority = 3;

        // Tier 1: Executives
        const execKeywords = ['ceo', 'cfo', 'cto', 'president', 'founder', 'dagligleder', 'post', 'kontakt', 'info', 'hello', 'hei'];
        if (execKeywords.some(kw => localPart.includes(kw))) {
            priority = 1;
        }
        // Tier 2: Departments
        else if (['sales', 'marketing', 'hr', 'support', 'business', 'salg', 'faktura'].some(kw => localPart.includes(kw))) {
            priority = 2;
        }

        if (['noreply', 'no-reply', 'donotreply', 'sentry', 'bug'].some(kw => localPart.includes(kw))) return null;

        return { email, priority };
    })
        .filter((item): item is { email: string; priority: number } => item !== null)
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 5)
        .map(item => item.email);

    // 3. Extract VAT / Org Numbers
    const vatPatterns = [
        /DE\s?([0-9]{9})/i, // Germany
        /GB\s?([0-9]{9,12})/i, // UK
        /NO\s?([0-9]{9})\s?MVA/i, // Norway MVA
        /FR\s?([0-9A-Z]{2})\s?([0-9]{9})/i, // France
        /SE\s?([0-9]{12})/i, // Sweden
        /([0-9]{9})\s?RT\s?([0-9]{4})/i, // Canada GST/HST (123456789 RT 0001)
        /BN\s?([0-9]{9})/i // Canada Business Number label
    ];

    let foundVat: string | undefined = undefined;
    for (const page of crawlResult.pages) {
        for (const pattern of vatPatterns) {
            const match = page.content.match(pattern);
            if (match) {
                foundVat = match[0].replace(/\s/g, '').toUpperCase();
                break;
            }
        }
        if (foundVat) break;
    }

    return {
        emails: prioritizedEmails,
        phones: Array.from(phones).slice(0, 5),
        vat_number: foundVat,
        social_media: {
            linkedin: social.linkedin || undefined,
            facebook: social.facebook || undefined,
            twitter: social.twitter || undefined,
            instagram: social.instagram || undefined,
            youtube: social.youtube || undefined,
            tiktok: social.tiktok || undefined
        }
    };
}

/**
 * Smart sitelink selection - prioritize important pages
 * Returns top 6 most valuable pages based on priority scoring
 * Now with type classification and deduplication
 */
function selectSmartSitelinks(pages: DeepCrawlResult['pages']): Array<{
    title: string;
    url: string;
    description?: string;
    type?: 'contact' | 'about' | 'team' | 'products' | 'investors' | 'news' | 'other';
}> {
    // Type classification keywords (Multilingual: EN, NO, SE, DK, FI, DE, FR, ES)
    const typeKeywords = {
        contact: [
            'contact', 'get-in-touch', 'reach-us', 'email', 'phone',
            'kontakt', 'kundeservice', 'support', 'ring-oss',
            'yhteystiedot', 'ota-yhteyttä', 'kontakta', 'kundtjänst'
        ],
        about: [
            'about', 'who-we-are', 'company', 'overview', 'our-story', 'mission',
            'om-oss', 'hvem-er-vi', 'selskapet', 'bedriften', 'vår-historie',
            'tietoja', 'yritys', 'om-företaget', 'om-os', 'virksomheden'
        ],
        team: [
            'team', 'leadership', 'management', 'executives', 'people', 'staff',
            'ansatte', 'ledelse', 'styret', 'medarbeidere', 'vårt-team',
            'henkilöstö', 'johto', 'tiimi', 'medarbetare', 'leding'
        ],
        products: [
            'product', 'service', 'solution', 'offering', 'technology', 'platform',
            'produkt', 'tjeneste', 'løsning', 'tilbud', 'teknologi',
            'tuotteet', 'palvelut', 'ratkaisut', 'produkter', 'tjänster'
        ],
        investors: [
            'investor', 'ir', 'shareholder', 'stock', 'financial', 'earnings',
            'investorer', 'aksjonær', 'finansiell', 'børs',
            'sijoittajat', 'osakkeenomistajat', 'tous', 'aktieägare'
        ],
        news: [
            'news', 'press', 'blog', 'article', 'update', 'announcement',
            'nyheter', 'presse', 'aktuelt', 'artikler', 'oppdatering',
            'uutiset', 'lehdistö', 'ajankohtaista', 'nyheter', 'pressrum'
        ]
    };

    // Pages to exclude entirely (low value)
    const excludeKeywords = ['privacy', 'cookie', 'terms', 'legal', 'disclaimer', 'gdpr', 'policy'];

    // Classify and score each page
    const classifiedPages = pages
        .slice(1) // Skip homepage
        .map(page => {
            const urlLower = page.url.toLowerCase();
            const titleLower = page.title.toLowerCase();

            // Exclude low-value pages
            if (excludeKeywords.some(kw => urlLower.includes(kw) || titleLower.includes(kw))) {
                return null;
            }

            // Determine page type
            let type: 'contact' | 'about' | 'team' | 'products' | 'investors' | 'news' | 'other' = 'other';
            let score = 0;

            // Check each type
            for (const [typeName, keywords] of Object.entries(typeKeywords)) {
                if (keywords.some(kw => urlLower.includes(kw) || titleLower.includes(kw))) {
                    type = typeName as any;
                    // Priority scoring based on type
                    switch (type) {
                        case 'contact': score = 6; break;
                        case 'about': score = 5; break;
                        case 'team': score = 4; break;
                        case 'products': score = 3; break;
                        case 'investors': score = 3; break;
                        case 'news': score = 1; break;
                    }
                    break;
                }
            }

            return {
                page,
                type,
                score
            };
        })
        .filter(Boolean) as Array<{ page: any; type: string; score: number }>;

    // Deduplicate: Keep only the HIGHEST scored page per type
    const typeMap = new Map<string, any>();

    for (const item of classifiedPages) {
        const existing = typeMap.get(item.type);
        if (!existing || item.score > existing.score) {
            typeMap.set(item.type, item);
        }
    }

    // Convert back to array and sort by score
    const uniquePages = Array.from(typeMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

    // Return with type labels
    return uniquePages.map(item => ({
        title: item.page.title || item.page.headings.h1[0] || 'Page',
        url: item.page.url,
        description: item.page.meta.description?.slice(0, 160),
        type: item.type
    }));
}

/**
 * Extract logo from pages
 */
function extractLogo(crawlResult: DeepCrawlResult): string | undefined {
    for (const page of crawlResult.pages) {
        // Check for common logo patterns in HTML
        const logoPatterns = [
            /og:image["']\s+content=["']([^"']+)["']/i,
            /logo["'].*?src=["']([^"']+)["']/i,
            /<img[^>]+class=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
            /<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*logo[^"']*["']/i
        ];

        for (const pattern of logoPatterns) {
            const match = page.html.match(pattern);
            if (match && match[1]) {
                try {
                    const logoUrl = new URL(match[1], page.url);
                    return logoUrl.toString();
                } catch {
                    // Invalid URL
                }
            }
        }
    }

    // Fallback: use first large image
    if (crawlResult.allImages.length > 0) {
        return crawlResult.allImages[0];
    }

    return undefined;
}

/**
 * Use AI to analyze all content and extract structured data
 */
async function analyzeWithAI(crawlResult: DeepCrawlResult): Promise<Partial<EnrichedBusinessData>> {
    try {
        // Prioritize "About Us" page content for better descriptions
        const aboutPatterns = ['about', 'om-oss', 'hvem-er-vi', 'company', 'story'];
        const aboutPage = crawlResult.pages.find(p =>
            aboutPatterns.some(pat => p.url.toLowerCase().includes(pat) || p.title.toLowerCase().includes(pat))
        );

        let contentContext = "";

        if (aboutPage) {
            // If we have an About page, use it heavily
            contentContext = `
            --- ABOUT PAGE CONTENT ---
            ${aboutPage.content.slice(0, 3000)}
            
            --- HOMEPAGE CONTENT ---
            ${crawlResult.pages[0]?.content.slice(0, 2000) || ""}
            `;
        } else {
            // Fallback: Mix of Home + Other pages
            contentContext = crawlResult.pages
                .slice(0, 3)
                .map(p => `--- PAGE: ${p.title} ---\n${p.content.slice(0, 1500)}`)
                .join('\n\n')
                .slice(0, 5000);
        }

        const prompt = `Analyze this business website content and extract structured data. Return ONLY valid JSON:

{
  "company_description_no": "Professional 3-4 sentence summary in Norwegian (300-400 characters). Include: what they do, key products/services, and industry positioning or notable achievements.",
  "company_description_en": "Professional 3-4 sentence summary in English (300-400 characters). Include: what they do, key products/services, and industry positioning or notable achievements.",
  "company_description_de": "Professional 3-4 sentence summary in German (300-400 characters). Include: what they do, key products/services, and industry positioning or notable achievements.",
  "company_description_fr": "Professional 3-4 sentence summary in French (300-400 characters). Include: what they do, key products/services, and industry positioning or notable achievements.",
  "company_description_es": "Professional 3-4 sentence summary in Spanish (300-400 characters). Include: what they do, key products/services, and industry positioning or notable achievements.",
  "industry_category": "Primary industry (e.g., 'IT Services', 'Manufacturing', 'Mining', 'Healthcare', 'Finance')",
  "services_no": ["Service 1 (Norwegian)", "Service 2"],
  "services_en": ["Service 1 (English)", "Service 2"],
  "services_de": ["Service 1 (German)", "Service 2"],
  "services_fr": ["Service 1 (French)", "Service 2"],
  "services_es": ["Service 1 (Spanish)", "Service 2"],
  "products_no": ["Product 1 (Norwegian)"],
  "products_en": ["Product 1 (English)"],
  "products_de": ["Product 1 (German)"],
  "products_fr": ["Product 1 (French)"],
  "products_es": ["Product 1 (Spanish)"],
  "search_keywords": ["Keyword1", "Keyword2", "Keyword3"]
}

Website Content:
${contentContext}`;

        const response = await generateText(prompt);
        if (!response) return {};

        // Parse JSON
        const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        return {
            company_description: data.company_description_en || data.company_description_no || '',
            industry_category: data.industry_category || 'Unknown',
            services: {
                no: data.services_no || [],
                en: data.services_en || [],
                de: data.services_de || [],
                fr: data.services_fr || [],
                es: data.services_es || []
            },
            products: {
                no: data.products_no || [],
                en: data.products_en || [],
                de: data.products_de || [],
                fr: data.products_fr || [],
                es: data.products_es || []
            },
            search_keywords: data.search_keywords || [],
            translations: {
                no: {
                    description: data.company_description_no,
                    products: data.products_no,
                    services: data.services_no
                },
                en: {
                    description: data.company_description_en,
                    products: data.products_en,
                    services: data.services_en
                },
                de: {
                    description: data.company_description_de,
                    products: data.products_de,
                    services: data.services_de
                },
                fr: {
                    description: data.company_description_fr,
                    products: data.products_fr,
                    services: data.services_fr
                },
                es: {
                    description: data.company_description_es,
                    products: data.products_es,
                    services: data.services_es
                }
            }
        };

    } catch (error) {
        console.error('AI analysis failed:', error);
        return {};
    }
}

/**
 * Main function: Process deep crawl result into enriched business data
 */
export async function processDeepCrawl(crawlResult: DeepCrawlResult): Promise<EnrichedBusinessData> {
    console.log('📊 Processing deep crawl data...');

    // Extract contact info
    const contactInfo = extractContactInfo(crawlResult);

    // Extract logo
    const logoUrl = extractLogo(crawlResult);

    // Aggregate all headings
    const allHeadings = {
        h1: crawlResult.pages.flatMap(p => p.headings.h1).slice(0, 50),
        h2: crawlResult.pages.flatMap(p => p.headings.h2).slice(0, 100),
        h3: crawlResult.pages.flatMap(p => p.headings.h3).slice(0, 150)
    };

    // Aggregate meta descriptions
    const metaDescriptions = crawlResult.pages
        .map(p => p.meta.description)
        .filter(Boolean) as string[];

    // Detected languages
    const detectedLanguages = [...new Set(
        crawlResult.pages
            .map(p => p.meta.language)
            .filter(Boolean) as string[]
    )];

    // Aggregate JSON-LD data
    const jsonLdData = crawlResult.pages
        .flatMap(p => p.structuredData || []);


    // AI Analysis (async)
    console.log('🧠 Running AI analysis...');
    const aiData = await analyzeWithAI(crawlResult);

    // Build smart sitelinks (prioritized, quality pages only)
    const sitelinks = selectSmartSitelinks(crawlResult.pages);

    // Merge crawl-detected sitelinks if smart selection missed some important types
    if (crawlResult.sitelinks) {
        // Implementation logic could be improved here to deduplicate
        // For now, let's rely on smart selection as primary
    }

    return {
        company_description: aiData.company_description || metaDescriptions[0] || '',
        industry_category: aiData.industry_category || 'Unknown',
        total_pages_indexed: crawlResult.totalPages,
        sitemap_urls: crawlResult.sitemapUrls,
        all_headings: allHeadings,
        meta_descriptions: metaDescriptions,
        detected_languages: detectedLanguages,
        all_images: crawlResult.allImages.slice(0, 50), // Max 50 images
        logo_url: logoUrl,
        json_ld_data: jsonLdData.length > 0 ? jsonLdData : undefined,
        contact_info: {
            ...contactInfo,
            vat_number: contactInfo.vat_number
        },
        services: aiData.services || {
            no: [], en: [], de: [], fr: [], es: []
        },
        products: aiData.products || {
            no: [], en: [], de: [], fr: [], es: []
        },
        search_keywords: aiData.search_keywords || [],
        sitelinks: sitelinks,
        translations: aiData.translations || {},
        has_ssl: crawlResult.baseUrl.startsWith('https'),
        response_time_ms: crawlResult.crawlStats.duration,
        crawl_timestamp: new Date().toISOString(),
        crawl_duration_ms: crawlResult.crawlStats.duration,
        business_hours: crawlResult.businessHours || undefined
    };
}
