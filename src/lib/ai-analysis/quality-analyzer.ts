/**
 * AI Quality Analysis Service
 * Uses GPT-4o to analyze business digital footprint
 */

import OpenAI from 'openai';
import type { QualityAnalysis, RegistryData } from '@/types/database';

// Lazy initialization to avoid build errors when API key is not set
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
    if (!process.env.OPENAI_API_KEY) {
        return null;
    }
    if (!openaiClient) {
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiClient;
}

interface WebsiteCheckResult {
    url: string;
    accessible: boolean;
    hasSSL: boolean;
    responseTime?: number;
    error?: string;
}

/**
 * Check website technical status
 */
async function checkWebsite(url: string): Promise<WebsiteCheckResult> {
    try {
        const start = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            redirect: 'follow',
        });

        clearTimeout(timeout);
        const responseTime = Date.now() - start;

        return {
            url,
            accessible: response.ok,
            hasSSL: url.startsWith('https://'),
            responseTime,
        };
    } catch (error) {
        return {
            url,
            accessible: false,
            hasSSL: url.startsWith('https://'),
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Extract emails from text
 */
function extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return [...new Set(text.match(emailRegex) || [])];
}

/**
 * Check if email is professional (not generic free provider)
 */
function isProfessionalEmail(email: string): boolean {
    const freeProviders = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'live.com', 'aol.com', 'icloud.com', 'mail.com', 'protonmail.com'
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    return domain ? !freeProviders.includes(domain) : false;
}

/**
 * Analyze business quality using AI
 */
export async function analyzeBusinessQuality(
    registryData: RegistryData,
    websiteUrl?: string
): Promise<QualityAnalysis> {
    const analysis: QualityAnalysis = {
        last_analyzed: new Date().toISOString(),
        red_flags: [],
    };

    // Check website if URL provided
    if (websiteUrl) {
        const normalizedUrl = websiteUrl.startsWith('http')
            ? websiteUrl
            : `https://${websiteUrl}`;

        analysis.website_url = normalizedUrl;

        const websiteCheck = await checkWebsite(normalizedUrl);
        analysis.has_ssl = websiteCheck.hasSSL;

        if (!websiteCheck.accessible) {
            analysis.red_flags?.push('Website not accessible');
        }

        // Try to fetch website content for AI analysis
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(normalizedUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Qrydex/1.0 Business Verification Bot',
                },
            });
            clearTimeout(timeout);

            if (response.ok) {
                const html = await response.text();

                // Extract emails from website
                const emails = extractEmails(html);
                if (emails.length > 0) {
                    analysis.contact_email = emails[0];
                    analysis.professional_email = isProfessionalEmail(emails[0]);

                    if (!analysis.professional_email) {
                        analysis.red_flags?.push('Uses free email provider');
                    }
                }

                // Use AI to analyze the website content
                const aiAnalysis = await analyzeWithAI(html, registryData);
                if (aiAnalysis) {
                    analysis.industry_category = aiAnalysis.industry;
                    analysis.ai_summary = aiAnalysis.summary;
                    analysis.quality_score = aiAnalysis.qualityScore;
                    analysis.content_freshness = aiAnalysis.contentFreshness;

                    if (aiAnalysis.redFlags) {
                        analysis.red_flags = [...(analysis.red_flags || []), ...aiAnalysis.redFlags];
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching website for analysis:', error);
        }
    }

    // If no AI score, estimate based on registry data
    if (analysis.quality_score === undefined) {
        analysis.quality_score = estimateQualityFromRegistry(registryData);
    }

    return analysis;
}

interface AIAnalysisResult {
    industry: string;
    summary: string;
    qualityScore: number;
    contentFreshness?: string;
    redFlags?: string[];
}

/**
 * Use GPT-4o for website content analysis
 */
async function analyzeWithAI(
    htmlContent: string,
    registryData: RegistryData
): Promise<AIAnalysisResult | null> {
    try {
        const openai = getOpenAIClient();
        if (!openai) {
            console.warn('OpenAI API key not configured');
            return null;
        }

        // Extract meaningful text (limit to reasonable size)
        const textContent = htmlContent
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 8000);

        const prompt = `Analyze this business website and provide a JSON assessment.

Business Name: ${registryData.legal_name}
Registered Industry: ${registryData.industry_codes?.join(', ') || 'Unknown'}
Address: ${registryData.registered_address || 'Unknown'}

Website Content:
${textContent}

Provide your analysis as JSON with these fields:
- industry: Most accurate industry category based on actual content
- summary: 1-2 sentence professional description
- qualityScore: 1-10 rating of professionalism and completeness
- contentFreshness: Estimate like "2025", "2024", or "outdated"
- redFlags: Array of concerns (empty if none), such as:
  - Missing contact information
  - Placeholder content
  - Under construction
  - Suspicious claims
  - Mismatched industry

Return ONLY valid JSON, no other text.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You are a B2B business analyst. Analyze websites for procurement risk assessment. Be concise and objective.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.3,
            max_tokens: 500,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) return null;

        // Parse JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);
        return {
            industry: parsed.industry,
            summary: parsed.summary,
            qualityScore: Math.min(10, Math.max(1, parsed.qualityScore)),
            contentFreshness: parsed.contentFreshness,
            redFlags: parsed.redFlags || [],
        };
    } catch (error) {
        console.error('Error analyzing with AI:', error);
        return null;
    }
}

/**
 * Estimate quality score from registry data only
 */
function estimateQualityFromRegistry(data: RegistryData): number {
    let score = 5; // Base score

    if (data.company_status === 'Active') score += 2;
    if (data.employee_count && data.employee_count > 10) score += 1;
    if (data.industry_codes && data.industry_codes.length > 0) score += 1;
    if (data.vat_status === 'Active') score += 1;

    return Math.min(10, score);
}

/**
 * Calculate quality component of Trust Score (0-35 points)
 */
export function calculateQualityScore(analysis: QualityAnalysis | null): number {
    if (!analysis) return 0;

    let score = 0;

    // SSL + professional email: +10 points
    if (analysis.has_ssl) score += 5;
    if (analysis.professional_email) score += 5;

    // AI quality score × 2.5 (max 25 points)
    if (analysis.quality_score) {
        score += Math.min(25, Math.round(analysis.quality_score * 2.5));
    }

    // Red flags deduction
    if (analysis.red_flags && analysis.red_flags.length > 0) {
        score -= Math.min(10, analysis.red_flags.length * 3);
    }

    return Math.max(0, Math.min(35, score));
}
