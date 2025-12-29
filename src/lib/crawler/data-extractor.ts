/**
 * Enhanced Data Extractor
 * Processes deep crawl results and enriches business data with AI
 */

import { generateText } from '@/lib/ai/gemini-client';
import type { DeepCrawlResult } from './deep-crawler';

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
}

/**
 * Extract contact information from all pages
 */
function extractContactInfo(crawlResult: DeepCrawlResult) {
    const emails = new Set<string>();
    const phones = new Set<string>();
    const social = {
        linkedin: undefined as string | undefined,
        facebook: undefined as string | undefined,
        twitter: undefined as string | undefined,
        instagram: undefined as string | undefined
    };

    // Email regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    // Phone regex (flexible)
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}/g;

    for (const page of crawlResult.pages) {
        // Extract emails
        const foundEmails = page.content.match(emailRegex);
        if (foundEmails) {
            foundEmails.forEach(email => {
                // Filter out common false positives
                if (!email.includes('example.com') && !email.includes('test.com')) {
                    emails.add(email.toLowerCase());
                }
            });
        }

        // Extract phones
        const foundPhones = page.content.match(phoneRegex);
        if (foundPhones) {
            foundPhones.forEach(phone => {
                // Only keep if it looks like a real phone number
                const digits = phone.replace(/\D/g, '');
                if (digits.length >= 8 && digits.length <= 15) {
                    phones.add(phone);
                }
            });
        }

        // Extract social media
        const html = page.html.toLowerCase();
        if (!social.linkedin && html.includes('linkedin.com')) {
            const match = html.match(/https?:\/\/(www\.)?linkedin\.com\/company\/[a-zA-Z0-9-]+/i);
            if (match) social.linkedin = match[0];
        }
        if (!social.facebook && html.includes('facebook.com')) {
            const match = html.match(/https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.]+/i);
            if (match) social.facebook = match[0];
        }
        if (!social.twitter && (html.includes('twitter.com') || html.includes('x.com'))) {
            const match = html.match(/https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]+/i);
            if (match) social.twitter = match[0];
        }
        if (!social.instagram && html.includes('instagram.com')) {
            const match = html.match(/https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+/i);
            if (match) social.instagram = match[0];
        }
    }

    return {
        emails: Array.from(emails).slice(0, 10), // Max 10 emails
        phones: Array.from(phones).slice(0, 5), // Max 5 phones
        social_media: social
    };
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
        // Sample content (first 5000 characters from multiple pages)
        const sampledContent = crawlResult.pages
            .slice(0, 5) // First 5 pages
            .map(p => p.content)
            .join('\n\n')
            .slice(0, 5000);

        const prompt = `Analyze this business website content and extract structured data. Return ONLY valid JSON:

{
  "company_description_no": "Professional 2-sentence summary in Norwegian",
  "company_description_en": "Professional 2-sentence summary in English",
  "company_description_de": "Professional 2-sentence summary in German",
  "company_description_fr": "Professional 2-sentence summary in French",
  "company_description_es": "Professional 2-sentence summary in Spanish",
  "industry_category": "Primary industry (e.g., 'IT Services', 'Manufacturing')",
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
${sampledContent}`;

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

    // Build sitelinks (top pages)
    const sitelinks = crawlResult.pages
        .slice(1, 7) // Skip homepage, take next 6
        .map(page => ({
            title: page.title || page.headings.h1[0] || 'Page',
            url: page.url,
            description: page.meta.description?.slice(0, 160)
        }));

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
        contact_info: contactInfo,
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
        crawl_duration_ms: crawlResult.crawlStats.duration
    };
}


