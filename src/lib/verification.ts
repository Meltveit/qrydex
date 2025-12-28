/**
 * Business Verification Service
 * Orchestrates the full verification flow
 */


import { createServerClient } from '@/lib/supabase';
import { verifyBusiness, calculateRegistryScore } from '@/lib/registry-apis';
// import { analyzeBusinessQuality, calculateQualityScore } from '@/lib/ai-analysis/quality-analyzer'; // Replacing this
import { scrapeWebsite } from '@/lib/crawler/website-scraper';
import { analyzeBusinessCredibility } from '@/lib/ai/scam-detector';
import { calculateTrustScore } from '@/lib/trust-engine';
import type { BusinessInsert, RegistryData, QualityAnalysis } from '@/types/database';

export interface VerifyBusinessRequest {
    orgNumber: string;
    countryCode: string; // ISO code (NO, US, SE, etc)
    websiteUrl?: string;
    stateCode?: string; // For US
    knownRegistryData?: Partial<RegistryData>; // If we already scraped it from a trusted source
}

// ... existing code ...

export async function verifyAndStoreBusiness(
    request: VerifyBusinessRequest
): Promise<VerifyBusinessResponse> {
    const supabase = createServerClient();

    try {
        // Step 1: Registry verification (or use known data)
        let registryData: RegistryData;
        let verificationSource = 'Registry';

        if (request.knownRegistryData) {
            // Trust the crawler provided data
            registryData = {
                org_nr: request.orgNumber,
                country_code: request.countryCode,
                company_status: 'Active', // Assumed active if found in crawl
                ...request.knownRegistryData
            } as RegistryData;
            verificationSource = 'TrustedCrawler';
        } else {
            const registryResult = await verifyBusiness(
                request.orgNumber,
                request.countryCode,
                { stateCode: request.stateCode }
            );

            if (!registryResult.success || !registryResult.data) {
                return {
                    success: false,
                    error: registryResult.error || 'Business not found in registry',
                };
            }
            registryData = registryResult.data;
            verificationSource = registryResult.source;
        }

        // Step 2: Website Discovery & Scraping
        const websiteUrl = request.websiteUrl || registryData.registered_address; // Logic to guess URL if address is a URL?
        // Note: registryData.registered_address is likely an address string, not a URL. 
        // We assume websiteUrl is passed or we need a search step (which is separate).
        // For now, we only proceed if we have a valid URL or if the user provided one.

        let websiteData = null;
        let qualityAnalysis: QualityAnalysis = {
            last_analyzed: new Date().toISOString(),
            red_flags: [],
            quality_score: 5, // Baseline
        };

        if (websiteUrl && (websiteUrl.startsWith('http') || websiteUrl.startsWith('www'))) {
            // Enhanced scraping
            websiteData = await scrapeWebsite(websiteUrl);

            if (websiteData) {
                // Populate basic quality metrics
                qualityAnalysis.website_url = websiteData.homepage.url;
                qualityAnalysis.contact_email = websiteData.contactInfo.emails[0];
                qualityAnalysis.contact_phone = websiteData.contactInfo.phones[0];

                // Professional email check
                const isProfessional = websiteData.contactInfo.emails.some(e => {
                    const domain = e.split('@')[1];
                    return !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain);
                });
                qualityAnalysis.professional_email = isProfessional;
                qualityAnalysis.has_ssl = websiteData.homepage.url.startsWith('https');
            }
        }

        // Step 3: AI Scam Detection (Gemini)
        // We pass the partial business info we have so far
        const businessContext = {
            legal_name: registryData.legal_name,
            org_number: request.orgNumber,
            domain: websiteData?.homepage?.url ? new URL(websiteData.homepage.url).hostname : undefined
        };

        const aiResult = await analyzeBusinessCredibility(businessContext, registryData, websiteData);

        // Merge AI results
        qualityAnalysis.quality_score = Math.round(aiResult.credibilityScore / 10); // Scale 0-100 to 0-10
        qualityAnalysis.ai_summary = aiResult.summary;
        qualityAnalysis.red_flags = [...(qualityAnalysis.red_flags || []), ...aiResult.redFlags];

        // Add specific scam check result to analysis object (custom field support needed in types or just store in JSONB)
        // casting to any to attach new fields without strict type error for now
        (qualityAnalysis as any).scam_check = {
            is_scam: aiResult.isScam,
            risk_level: aiResult.riskLevel,
            confidence: aiResult.confidence,
            trust_signals: aiResult.trustSignals
        };

        // Step 4: Calculate Trust Score
        const { score, breakdown } = calculateTrustScore(
            registryData,
            qualityAnalysis,
            []
        );

        // Step 5: Upsert business record
        const businessData: BusinessInsert = {
            org_number: request.orgNumber,
            legal_name: registryData.legal_name || 'Unknown',
            country_code: request.countryCode.toUpperCase(),
            domain: businessContext.domain,
            registry_data: registryData,
            quality_analysis: qualityAnalysis,
            news_signals: [],
            trust_score: score,
            trust_score_breakdown: breakdown,
            last_verified_at: new Date().toISOString(),
            verification_status: aiResult.isScam ? 'failed' : 'verified',
            // New enhanced fields
            logo_url: websiteData?.logoUrl,
            company_description: websiteData?.description || aiResult.summary,
            social_media: websiteData?.socialMedia as any,
            // opening_hours: websiteData?.openingHours, // Pending implementation
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: business, error } = await supabase
            .from('businesses')
            .upsert(businessData as any, {
                onConflict: 'org_number',
            })
            .select()
            .single();

        if (error) {
            console.error('Error storing business:', error);
            return {
                success: false,
                error: 'Failed to store business data',
            };
        }

        // Step 6: Log verification
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('verification_logs').insert({
            business_id: business.id,
            verification_type: 'registry',
            status: aiResult.isScam ? 'failed' : 'success',
            details: {
                source: verificationSource,
                ai_risk_level: aiResult.riskLevel,
                scam_check: aiResult.isScam,
            },
        } as any);

        return {
            success: true,
            business,
        };
    } catch (error) {
        console.error('Error in verification flow:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Quick registry check without full analysis
 */
export async function quickVerify(
    orgNumber: string,
    countryCode: string
): Promise<{ verified: boolean; status?: string; source?: string }> {
    const result = await verifyBusiness(orgNumber, countryCode);

    return {
        verified: result.success,
        status: result.data?.company_status,
        source: result.source,
    };
}

