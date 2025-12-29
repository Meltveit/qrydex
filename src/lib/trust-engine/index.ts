/**
 * Trust Score Engine
 * Combines registry, quality, and news signals into a unified score
 */

import type { Business, TrustScoreBreakdown, RegistryData, QualityAnalysis, NewsSignal } from '@/types/database';
import { calculateRegistryScore } from '@/lib/registry-apis';
import { calculateQualityScore } from '@/lib/ai-analysis/quality-analyzer';

/**
 * Calculate news sentiment component (0-25 points)
 * Neutral baseline is 12.5 points
 * Positive news adds up to +12.5
 * Negative news subtracts up to -12.5
 */
export function calculateNewsScore(signals: NewsSignal[]): number {
    if (!signals || signals.length === 0) {
        return 12; // Neutral baseline - no news is neutral
    }

    // Get recent signals (last 90 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const recentSignals = signals.filter(s => new Date(s.date) >= cutoff);

    if (recentSignals.length === 0) {
        return 12; // Neutral
    }

    // Calculate weighted sentiment
    let sentimentScore = 0;
    let totalWeight = 0;

    for (const signal of recentSignals) {
        const weight = signal.impact_score / 10; // Normalize to 0-1
        totalWeight += weight;

        switch (signal.sentiment) {
            case 'positive':
                sentimentScore += weight * 1;
                break;
            case 'negative':
                sentimentScore -= weight * 1;
                break;
            // neutral contributes 0
        }
    }

    // Normalize to -1 to 1 range
    const normalizedSentiment = totalWeight > 0 ? sentimentScore / totalWeight : 0;

    // Convert to 0-25 scale (12.5 is neutral)
    const score = 12.5 + (normalizedSentiment * 12.5);

    return Math.round(Math.max(0, Math.min(25, score)));
}

/**
 * Calculate total Trust Score
 */
export function calculateTrustScore(
    registryData: RegistryData | null,
    qualityAnalysis: QualityAnalysis | null,
    newsSignals: NewsSignal[]
): { score: number; breakdown: TrustScoreBreakdown } {
    const registryScore = calculateRegistryScore(registryData);
    const qualityScore = calculateQualityScore(qualityAnalysis);
    const newsScore = calculateNewsScore(newsSignals);

    const breakdown: TrustScoreBreakdown = {
        registry_verified: registryScore,
        quality_score: qualityScore,
        news_sentiment: newsScore,
    };

    const totalScore = registryScore + qualityScore + newsScore;

    return {
        score: Math.min(100, totalScore),
        breakdown,
    };
}

/**
 * Get Trust Score color coding
 */
export function getTrustScoreColor(score: number): 'green' | 'yellow' | 'red' {
    if (score >= 70) return 'green';
    if (score >= 40) return 'yellow';
    return 'red';
}

/**
 * Get Trust Score label
 */
/**
 * Get Trust Score label key
 */
export function getTrustScoreLabelKey(score: number): string {
    if (score >= 80) return 'highlyTrusted';
    if (score >= 70) return 'trusted';
    if (score >= 50) return 'moderatelyTrusted';
    if (score >= 40) return 'requiresVerification';
    if (score >= 20) return 'lowTrust';
    return 'notVerified';
}

/**
 * Format Trust Score for display
 */
export function formatTrustScore(business: Business): {
    score: number;
    color: 'green' | 'yellow' | 'red';
    labelKey: string;
    breakdown: {
        registry: { score: number; max: number; labelKey: string };
        quality: { score: number; max: number; labelKey: string };
        news: { score: number; max: number; labelKey: string };
    };
} {
    const breakdown = business.trust_score_breakdown || {
        registry_verified: 0,
        quality_score: 0,
        news_sentiment: 0,
    };

    return {
        score: business.trust_score,
        color: getTrustScoreColor(business.trust_score),
        labelKey: getTrustScoreLabelKey(business.trust_score),
        breakdown: {
            registry: {
                score: breakdown.registry_verified,
                max: 40,
                labelKey: breakdown.registry_verified >= 30 ? 'verified' : 'unverified',
            },
            quality: {
                score: breakdown.quality_score,
                max: 35,
                labelKey: breakdown.quality_score >= 25 ? 'highQuality' :
                    breakdown.quality_score >= 15 ? 'moderate' : 'lowQuality',
            },
            news: {
                score: breakdown.news_sentiment,
                max: 25,
                labelKey: breakdown.news_sentiment >= 18 ? 'positive' :
                    breakdown.news_sentiment >= 8 ? 'neutral' : 'negative',
            },
        },
    };
}
