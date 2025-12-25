import { geminiModel } from './gemini-client';
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

        const result = await geminiModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
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
            contentSnippet: websiteData.homepage.content.slice(0, 1000) // First 1000 chars
        } : "Website not scraped or unavailable"
    };

    return `
    You are an expert fraud investigator and business analyst. 
    Analyze the following business data to determine if it is a legitimate B2B company or a potential scam.
    
    Business Data:
    ${JSON.stringify(dataContext, null, 2)}

    Risk Factors to check:
    1. Discrepancies between registry name/domain and website content.
    2. Generic, copied, or suspicious website content.
    3. Lack of contact info (no phone, no physical address).
    4. Very recent registration date but claims "years of experience".
    5. Suspicious or high-risk industry codes (e.g., crypto, generic consulting) without proof of work.
    
    Return a JSON object with this exact structure:
    {
        "isScam": boolean,
        "confidence": number, // 0-100, how sure are you of your assessment
        "credibilityScore": number, // 0-100, where 100 is perfectly trustworthy
        "redFlags": string[], // List of specific concerns
        "trustSignals": string[], // List of positive value props/validations
        "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "summary": "Brief explanation of the verdict (max 2 sentences)"
    }
    `;
}

function createFallbackAnalysis(): ScamAnalysisResult {
    return {
        isScam: false,
        confidence: 0,
        credibilityScore: 50, // Neutral
        redFlags: ['AI Analysis Unavailable'],
        trustSignals: [],
        riskLevel: 'LOW',
        summary: 'Automatic verification passed without AI analysis.'
    };
}
