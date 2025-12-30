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
        websiteContent: websiteData ? {
            title: websiteData.homepage.title,
            description: websiteData.description,
            contactInfo: websiteData.contactInfo,
            hasSsl: true, // Assumed if scraped successfully
            socialLinks: websiteData.socialMedia,
            contentSnippet: websiteData.homepage.content.slice(0, 1500) // Increased snippet size for better descriptions
        } : "Website not scraped or unavailable"
    };

    return `
    You are an expert fraud investigator, SEO copywriter, and business analyst. 
    Analyze the following business data to determine if it is a legitimate B2B company or a potential scam.
    
    Business Data:
    ${JSON.stringify(dataContext, null, 2)}

    Risk Factors to check:
    1. Discrepancies between registry name/domain and website content.
    2. Generic, copied, or suspicious website content.
    3. Lack of contact info (no phone, no physical address).
    4. Very recent registration date but claims "years of experience".
    5. Suspicious or high-risk industry codes (e.g., crypto, generic consulting) without proof of work.

    Also extract:
    - Certifications: Any mentioned certifications (ISO, Eco-lighthouse, etc).
    - Customer Segment: Is this primarily B2B, B2C, or both?
    - Key Features: 3-5 distinct features or selling points.
    - Search Keywords: Generate 10-15 localized search keywords relevant to this business.
    - Generated Descriptions: Write a professional, SEO-optimized business description (approx 100-150 words) based on the website content. 
      You MUST provide this description in ALL 8 languages: 
      English (en), Norwegian (no), Danish (da), Swedish (sv), Finnish (fi), German (de), French (fr), Spanish (es).
      If the website content is thin, infer the business activities from the industry code and name, but be honest about limited information.
    
    Return a JSON object with this exact structure:
    {
        "isScam": boolean,
        "confidence": number, // 0-100
        "credibilityScore": number, // 0-100
        "redFlags": string[],
        "trustSignals": string[],
        "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "summary": "Brief verdict",
        "certifications": ["Cert 1", "Cert 2"],
        "customerSegment": "B2B/B2C/BOTH",
        "keyFeatures": ["Feature 1", "Feature 2"],
        "search_keywords": ["Accounting", "Regnskap", "Buchhaltung"],
        "generated_descriptions": {
            "en": "...",
            "no": "...",
            "da": "...",
            "sv": "...",
            "fi": "...",
            "de": "...",
            "fr": "...",
            "es": "..."
        }
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
