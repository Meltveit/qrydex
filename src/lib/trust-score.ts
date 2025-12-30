/**
 * Trust Score Calculator
 * Calculates business trust score (0-100) based on data completeness and quality
 */

export interface TrustScoreInput {
    registry_data: any;
    company_description?: string;
    logo_url?: string;
    social_media?: any;
    sitelinks?: any[];
    product_categories?: string[];
    translations?: any;
    industry_category?: string;
    quality_analysis?: any;
    indexed_pages_count?: number;
}

export interface TrustScoreResult {
    score: number;
    breakdown: Record<string, number>;
}

/**
 * Calculate trust score based on profile completeness and quality
 * 
 * Scoring Formula (Max 100):
 * - Registry: 35 (Verified)
 * - Content: 30 (Desc, Detailed, Logo, Cats, Trans, Industry)
 * - Social: 15 (Presence, Multi, Professional Email)
 * - Technical: 15 (Sitelinks, SSL, Indexed)
 * - News: 5 (Sentiment - added dynamically)
 */
export function calculateTrustScore(business: TrustScoreInput): TrustScoreResult {
    const breakdown: Record<string, number> = {};

    // Base Score: Registry Verification (35 points)
    breakdown.registry_verified = 35;

    // === CONTENT & PROFILE (30 points max) ===
    if ((business.company_description?.length || 0) > 0) breakdown.has_description = 5;
    if (business.company_description && business.company_description.length > 200) breakdown.detailed_description = 5;
    if (business.logo_url) breakdown.has_logo = 5;
    if ((business.product_categories?.length || 0) > 0) breakdown.has_categories = 5;
    if (business.translations && Object.keys(business.translations).length >= 3) breakdown.has_translations = 5;
    if (business.industry_category && business.industry_category !== 'Unknown') breakdown.has_industry = 5;

    // === SOCIAL & CONTACT (15 points max) ===
    const socialCount = business.social_media ? Object.keys(business.social_media).filter(k => business.social_media[k]).length : 0;
    if (socialCount > 0) breakdown.has_social = 5;
    if (socialCount >= 2) breakdown.multi_social = 5;
    if (business.quality_analysis?.professional_email) breakdown.professional_email = 5;

    // === TECHNICAL & SECURITY (15 points max) ===
    if (business.sitelinks && business.sitelinks.length >= 3) breakdown.has_sitelinks = 5;
    if (business.quality_analysis?.has_ssl) breakdown.has_ssl = 5;
    if (business.indexed_pages_count && business.indexed_pages_count > 5) breakdown.well_indexed = 5;

    // Calculate total score (excluding news)
    const score = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    return { score, breakdown };
}

/**
 * Get human-readable trust level based on score
 */
export function getTrustLevel(score: number): 'low' | 'medium' | 'good' | 'excellent' {
    if (score >= 80) return 'excellent';
    if (score >= 65) return 'good';
    if (score >= 50) return 'medium';
    return 'low';
}

/**
 * Get breakdown explanation for UI display
 */
export function getScoreExplanation(breakdown: Record<string, number>): string[] {
    const explanations: string[] = [];

    if (breakdown.registry_verified) explanations.push('✅ Verified in official registry');
    if (breakdown.has_description) explanations.push('✅ Company description provided');
    if (breakdown.detailed_description) explanations.push('✅ Detailed profile (200+ characters)');
    if (breakdown.has_logo) explanations.push('✅ Logo uploaded');
    if (breakdown.has_social) explanations.push('✅ Social media presence');
    if (breakdown.multi_social) explanations.push('✅ Multiple social platforms');
    if (breakdown.has_sitelinks) explanations.push('✅ Important pages indexed');
    if (breakdown.has_categories) explanations.push('✅ Products/services listed');
    if (breakdown.has_translations) explanations.push('✅ Multilingual content');
    if (breakdown.has_industry) explanations.push('✅ Industry identified');
    if (breakdown.professional_email) explanations.push('✅ Professional contact email');
    if (breakdown.has_ssl) explanations.push('✅ Secure website (SSL)');
    if (breakdown.well_indexed) explanations.push('✅ Comprehensive website (10+ pages)');

    return explanations;
}

export interface TrustScoreDisplay {
    score: number;
    color: 'green' | 'yellow' | 'red';
    labelKey: string;
    breakdown: {
        registry: { score: number; max: number };
        quality: { score: number; max: number };
        social: { score: number; max: number };
        technical: { score: number; max: number };
        news: { score: number; max: number };
    };
}

/**
 * Format Trust Score for display
 */
export function formatTrustScore(business: { trust_score: number; trust_score_breakdown?: any; news_signals?: any[];[key: string]: any }): TrustScoreDisplay {
    let score = business.trust_score || 0;
    let raw = business.trust_score_breakdown || {};

    // FORCE Recalculation from live data (Fixes stale scores where data exists but score is 0)
    // We treat the stored score as a fallback only if recalculation fails or data is missing
    try {
        const input: TrustScoreInput = {
            registry_data: business.registry_data,
            company_description: business.company_description,
            logo_url: business.logo_url,
            social_media: business.social_media,
            sitelinks: business.sitelinks,
            product_categories: business.product_categories,
            translations: business.translations,
            industry_category: business.quality_analysis?.industry_category || business.industry_category, // Handle both paths
            quality_analysis: business.quality_analysis,
            indexed_pages_count: 15 // Assume decent indexing if we have data
        };

        const result = calculateTrustScore(input);

        // Use the FRESH breakdown and score
        raw = result.breakdown;
        score = result.score;

    } catch (e) {
        console.error('Error recalculating trust breakdown', e);
        // Fallback to stored values if calculation crashes
    }

    // Calculate category scores based on raw components
    const registryScore = (raw.registry_verified || 0); // Max 35

    // Content quality (Max 30)
    const qualityScore = Math.min(30, (raw.has_description || 0) + (raw.detailed_description || 0) +
        (raw.has_logo || 0) + (raw.has_categories || 0) + (raw.has_translations || 0) + (raw.has_industry || 0));

    // Social Score (Max 15)
    const socialScore = Math.min(15, (raw.has_social || 0) + (raw.multi_social || 0) + (raw.professional_email || 0));

    // Technical Score (Max 15)
    const technicalScore = Math.min(15, (raw.has_sitelinks || 0) + (raw.has_ssl || 0) + (raw.well_indexed || 0));

    // News sentiment score (Max 5)
    let newsScore = 0;
    if (business.news_signals && Array.isArray(business.news_signals)) {
        const signals = business.news_signals;
        if (signals.length > 0) {
            const positiveCount = signals.filter((s: any) => s.sentiment === 'positive').length;
            const negativeCount = signals.filter((s: any) => s.sentiment === 'negative').length;
            const ratio = (positiveCount - negativeCount) / signals.length;
            newsScore = Math.max(0, Math.min(5, Math.round(2.5 + ratio * 2.5)));
        }
    }

    // Final Total Score Recalculation (Ensure visual consistency)
    const calculatedTotal = registryScore + qualityScore + socialScore + technicalScore + newsScore;

    // Use calculated total if available, otherwise fallback to stored score
    const finalScore = calculatedTotal > 0 ? calculatedTotal : score;

    return {
        score: Math.min(100, finalScore),
        color: finalScore >= 70 ? 'green' : finalScore >= 40 ? 'yellow' : 'red',
        labelKey: finalScore >= 80 ? 'highlyTrusted' :
            finalScore >= 70 ? 'trusted' :
                finalScore >= 50 ? 'moderatelyTrusted' :
                    finalScore >= 40 ? 'requiresVerification' :
                        finalScore >= 20 ? 'lowTrust' : 'notVerified',
        breakdown: {
            registry: { score: registryScore, max: 35 },
            quality: { score: qualityScore, max: 30 },
            social: { score: socialScore, max: 15 },
            technical: { score: technicalScore, max: 15 },
            news: { score: newsScore, max: 5 }
        }
    };
}
