import { maintenanceModel } from './gemini-client';
import type { Business, RegistryData } from '@/types/database';
import type { WebsiteData } from '@/lib/crawler/website-scraper';

export interface ScamAnalysisResult {
    isScam: boolean;
    confidence: number; // 0-100
    credibilityScore: number; // 0-100 (High is good)
    redFlags: string[];
    trustSignals: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    summary: string;
    // New Enrichment Fields
    industry_category?: string; // Added per user request
    certifications: string[]; // e.g. ISO 9001, Miljøfyrtårn
    customerSegment: 'B2B' | 'B2C' | 'BOTH';
    keyFeatures: string[];
    search_keywords: string[]; // Multilingual keywords (EN, NO, DE, etc.)
    detected_address?: string; // Physical address found on website
    generated_descriptions: Record<string, string>; // { "en": "...", "no": "...", "da": "...", "sv": "...", "fi": "...", "de": "...", "fr": "...", "es": "..." }
}



/**
 * Analyzes a business for scam indicators using Google Gemini
 */
export async function analyzeBusinessCredibility(
    business: Partial<Business>,
    registryData: RegistryData,
    websiteData: WebsiteData | null
): Promise<ScamAnalysisResult> {

    // Fail safe if no API key
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
        console.warn('Skipping AI analysis: No API key');
        return createFallbackAnalysis();
    }

    try {
        const prompt = createAnalysisPrompt(business, registryData, websiteData);

        const result = await maintenanceModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                // responseMimeType: "application/json", // Gemini 1.5 Flash sometimes struggles with strict JSON mode for complex objects, prompt engineering is reliable
                responseMimeType: "application/json"
            }
        });

        const responseText = result.response.text();
        const analysis = JSON.parse(responseText) as ScamAnalysisResult;

        return analysis;

    } catch (error) {
        console.error('AI Analysis failed:', error);
        return createFallbackAnalysis();
    }
}

function createAnalysisPrompt(
    business: Partial<Business>,
    registryData: RegistryData,
    websiteData: WebsiteData | null
): string {
    const dataContext = {
        name: business.legal_name,
        orgNumber: business.org_number,
        domain: business.domain,
        registryDate: registryData.registration_date,
        registryStatus: registryData.company_status,
        // PASS EXISTING DATA FOR SMART MERGING
        previousAnalysis: {
            description: business.company_description,
            industry: (business.quality_analysis as any)?.industry_category,
            keywords: (business.quality_analysis as any)?.search_keywords
        },
        websiteContent: websiteData ? {
            title: websiteData.homepage.title,
            description: websiteData.description,
            contactInfo: websiteData.contactInfo,
            hasSsl: true,
            socialLinks: websiteData.socialMedia,
            contentSnippet: websiteData.homepage.content.slice(0, 1500)
        } : "Website not scraped or unavailable"
    };

    return `
    You are an expert fraud investigator and business analyst. 
    Analyze the business data to determine credibility and enrich the profile.

    Business Data:
    ${JSON.stringify(dataContext, null, 2)}

    Risk Factors:
    1. Registry/Website Discrepancies.
    2. Generic/Suspicious Content.
    3. Missing Contact Info.
    4. Recent registration claiming "years of experience".
    5. High-risk industry (crypto, etc) without proof.

    Instructions:
    1. Compare "websiteContent" with "previousAnalysis". If the website content provides NEW or BETTER information, use it. If the website is thin but previous analysis was good, RETAIN the previous insights in your output.
    2. Search Keywords: Generate/Update 10-15 localized keywords (EN, NO, DE, FR, ES) including broad categories (e.g. "Plumbing Services") + specific services.
    3. Descriptions: 
       - Write ONE high-quality, professional description (ENGLISH ONLY).
       - Structure it in TWO PARTS separated by a double line break (\n\n).
       - PART 1 (Main): Approx 350-400 characters. Focus on core business, value proposition, and history. No meta-talk.
       - PART 2 (Services): A concise summary (50-150 chars) listing specific services/products. Start with "Key Offerings:" or similar. Improve SEO with high-value keywords.
       - Example:
         "Magna is a leading automotive supplier... [Main Body] ... reliable quality.
         
         Key Offerings: Chassis systems, power-trains, vehicle engineering, ADAS solutions, and custom manufacturing."
       - Rules: 
         - MUST BE IN ENGLISH.
         - If parked domain, keep it generic.
    
    4. Data Extraction & Verification:
       - Emails: Look for hidden emails in the text (e.g. "contact at domain dot com"). 
       - Sitelinks: Identify key pages (Contact, About, Services) -> Add to 'trustSignals' if found.
       - Address: If official registry data is poor, try to find full physical address.
    
    Output JSON:
    {
        "isScam": boolean,
        "confidence": number, // 0-100
        "credibilityScore": number, // 0-100
        "redFlags": string[],
        "trustSignals": string[],
        "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "summary": "Verdict",
        "industry_category": "Main Industry",
        "certifications": ["ISO 9001"],
        "customerSegment": "B2B/B2C/BOTH",
        "keyFeatures": ["Feature 1", "Feature 2"],
        "search_keywords": ["Keyword1", "Keyword2"],
        "detected_address": "Street Name, City",
        "generated_descriptions": { "master": "Main Text...\n\nKey Offerings: Service A, Service B..." }
    }
    `;
}

function createFallbackAnalysis(): ScamAnalysisResult {
    return {
        isScam: false,
        confidence: 0,
        credibilityScore: 50, // Neutral
        redFlags: [],
        trustSignals: [],
        riskLevel: 'LOW',
        summary: 'Automatic verification passed without AI analysis.',
        industry_category: undefined,
        certifications: [],
        customerSegment: 'BOTH',
        keyFeatures: [],
        search_keywords: [],
        generated_descriptions: {}
    };
}
