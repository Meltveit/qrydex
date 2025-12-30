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
    3. Descriptions: Write PROFESSIONAL, SEO-optimized descriptions (100-150 words) in ALL 8 languages (en, no, da, sv, fi, de, fr, es). 
       - CRITICAL RULE 1 (PARKED DOMAINS): If the website content mentions "Domeneshop", "GoDaddy", "Domain is parked", "Webhuset", "One.com", or "FastName", and seems to be a placeholder page:
         -> CHECK: Does the Company Name contain "Domeneshop", "GoDaddy", "Webhuset", etc? 
         -> IF YES: The content is valid (It is the hosting company itself). Write a normal description.
         -> IF NO: The website is just parked. IGNORE content. Use "Fallback" logic.
       - CRITICAL RULE 2 (FALLBACK): If website is missing/parked/error, write a generic description based ONLY on Company Name + Industry code.
         -> Example: "[Company Name] is a specialist in [Industry]. They provide services related to..."
       - CRITICAL RULE 3 (NO META-TALK): NEVER write "Absence of content limits checking", "Based on the name", "No description available", or "I cannot browse".
         -> If you really cannot write a description, look at the "Fallback" rule.
       - CRITICAL RULE 4 (FALSE CONTENT): Do NOT write a description about "Domeneshop" if the company is "Afterburner Coffee". That is the hosting provider, not the business!
    4. Address Detection: If the official registry data is incomplete (e.g. just "DK" or "NO"), try to find the full physical address on the website.
    
    Output JSON:
    {
        "isScam": boolean,
        "confidence": number, // 0-100
        "credibilityScore": number, // 0-100
        "redFlags": string[],
        "trustSignals": string[],
        "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "summary": "Verdict",
        "certifications": ["ISO 9001"],
        "customerSegment": "B2B/B2C/BOTH",
        "keyFeatures": ["Feature 1", "Feature 2"],
        "search_keywords": ["Keyword1", "Keyword2"],
        "detected_address": "Street Name 123, 0000 City, Country",
        "generated_descriptions": { "en": "...", "no": "...", "da": "...", "sv": "...", "fi": "...", "de": "...", "fr": "...", "es": "..." }
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
        certifications: [],
        customerSegment: 'BOTH',
        keyFeatures: [],
        search_keywords: [],
        generated_descriptions: {}
    };
}
