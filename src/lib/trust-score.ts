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
 * Scoring Formula:
 * - Base: 40 (registry verified)
 * - Data Completeness: 30 max
 * - Data Quality: 20 max
 * - Technical Quality: 10 max
 * Total: 100 max
 */
export function calculateTrustScore(business: TrustScoreInput): TrustScoreResult {
    const breakdown: Record<string, number> = {};

    // Base Score: Registry Verification (40 points)
    breakdown.registry_verified = 40;

    // === DATA COMPLETENESS (30 points max) ===

    // Has description (+5)
    if (business.company_description && business.company_description.length > 0) {
        breakdown.has_description = 5;
    }

    // Has logo (+5)
    if (business.logo_url) {
        breakdown.has_logo = 5;
    }

    // Has social media (+5)
    if (business.social_media && Object.keys(business.social_media).filter(k => business.social_media[k]).length > 0) {
        breakdown.has_social = 5;
    }

    // Has quality sitelinks (+5)
    if (business.sitelinks && business.sitelinks.length >= 3) {
        breakdown.has_sitelinks = 5;
    }

    // Has product/service categories (+5)
    if (business.product_categories && business.product_categories.length > 0) {
        breakdown.has_categories = 5;
    }

    // Has translations (at least 3 languages) (+5)
    if (business.translations && Object.keys(business.translations).length >= 3) {
        breakdown.has_translations = 5;
    }

    // === DATA QUALITY (20 points max) ===

    // Detailed description (>200 chars) (+5)
    if (business.company_description && business.company_description.length > 200) {
        breakdown.detailed_description = 5;
    }

    // Professional email found (+5)
    if (business.quality_analysis?.professional_email) {
        breakdown.professional_email = 5;
    }

    // Multiple social platforms (2+) (+5)
    if (business.social_media && Object.keys(business.social_media).filter(k => business.social_media[k]).length >= 2) {
        breakdown.multi_social = 5;
    }

    // Industry category identified (+5)
    if (business.industry_category && business.industry_category !== 'Unknown') {
        breakdown.has_industry = 5;
    }

    // === TECHNICAL QUALITY (10 points max) ===

    // Has SSL certificate (+5)
    if (business.quality_analysis?.has_ssl) {
        breakdown.has_ssl = 5;
    }

    // Well-indexed site (>10 pages) (+5)
    if (business.indexed_pages_count && business.indexed_pages_count > 10) {
        breakdown.well_indexed = 5;
    }

    // Calculate total score
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
export function formatTrustScore(business: { trust_score: number; trust_score_breakdown?: any; news_signals?: any[] }): TrustScoreDisplay {
    const score = business.trust_score || 0;
    const raw = business.trust_score_breakdown || {};

    // Calculate category scores based on raw components
    const registryScore = (raw.registry_verified || 0); // Max 40

    // Content quality = Quality score
    const qualityScore = (raw.has_description || 0) + (raw.detailed_description || 0) +
        (raw.has_logo || 0) + (raw.has_categories || 0) + (raw.has_translations || 0) + (raw.has_industry || 0);

    const socialScore = (raw.has_social || 0) + (raw.multi_social || 0) + (raw.professional_email || 0);

    const technicalScore = (raw.has_sitelinks || 0) + (raw.has_ssl || 0) + (raw.well_indexed || 0);

    // News sentiment score (based on news_signals if available)
    let newsScore = 0;
    if (business.news_signals && Array.isArray(business.news_signals)) {
        const signals = business.news_signals;
        const positiveCount = signals.filter((s: any) => s.sentiment === 'positive').length;
        const negativeCount = signals.filter((s: any) => s.sentiment === 'negative').length;
        const totalCount = signals.length;

        if (totalCount > 0) {
            // Score: 0-5 based on sentiment ratio
            const ratio = (positiveCount - negativeCount) / totalCount;
            newsScore = Math.max(0, Math.min(5, Math.round(2.5 + ratio * 2.5)));
        }
    }

    return {
        score,
        color: score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red',
        labelKey: score >= 80 ? 'highlyTrusted' :
            score >= 70 ? 'trusted' :
                score >= 50 ? 'moderatelyTrusted' :
                    score >= 40 ? 'requiresVerification' :
                        score >= 20 ? 'lowTrust' : 'notVerified',
        breakdown: {
            registry: { score: registryScore, max: 40 },
            quality: { score: qualityScore, max: 25 },
            social: { score: socialScore, max: 15 },
            technical: { score: technicalScore, max: 20 },
            news: { score: newsScore, max: 5 }
        }
    };
}
