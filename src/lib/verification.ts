/**
 * Business Verification Service
 * Orchestrates the full verification flow
 */

import { createServerClient } from '@/lib/supabase';
import { verifyBusiness, calculateRegistryScore } from '@/lib/registry-apis';
import { analyzeBusinessQuality, calculateQualityScore } from '@/lib/ai-analysis/quality-analyzer';
import { calculateTrustScore } from '@/lib/trust-engine';
import type { Business, BusinessInsert, RegistryData, QualityAnalysis } from '@/types/database';

export interface VerifyBusinessRequest {
    orgNumber: string;
    countryCode: string;
    websiteUrl?: string;
    stateCode?: string; // For US
}

export interface VerifyBusinessResponse {
    success: boolean;
    business?: Business;
    error?: string;
}

/**
 * Full verification flow: Registry -> AI Quality -> Trust Score
 */
export async function verifyAndStoreBusiness(
    request: VerifyBusinessRequest
): Promise<VerifyBusinessResponse> {
    const supabase = createServerClient();

    try {
        // Step 1: Registry verification
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

        const registryData: RegistryData = registryResult.data;

        // Step 2: AI Quality Analysis
        const websiteUrl = request.websiteUrl || registryData.registered_address;
        const qualityAnalysis = await analyzeBusinessQuality(registryData, websiteUrl);

        // Step 3: Calculate Trust Score (no news signals yet for new business)
        const { score, breakdown } = calculateTrustScore(
            registryData,
            qualityAnalysis,
            [] // No news signals initially
        );

        // Step 4: Extract domain from website URL
        let domain: string | null = null;
        if (qualityAnalysis.website_url) {
            try {
                const url = new URL(qualityAnalysis.website_url);
                domain = url.hostname.replace(/^www\./, '');
            } catch {
                // Invalid URL, skip domain extraction
            }
        }

        // Step 5: Upsert business record
        const businessData: BusinessInsert = {
            org_number: request.orgNumber,
            legal_name: registryData.legal_name || 'Unknown',
            country_code: request.countryCode.toUpperCase(),
            domain,
            registry_data: registryData,
            quality_analysis: qualityAnalysis,
            news_signals: [],
            trust_score: score,
            trust_score_breakdown: breakdown,
            last_verified_at: new Date().toISOString(),
            verification_status: 'verified',
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
            status: 'success',
            details: {
                source: registryResult.source,
                registry_score: calculateRegistryScore(registryData),
                quality_score: calculateQualityScore(qualityAnalysis),
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
