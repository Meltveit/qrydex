/**
 * Business Search Service
 */

import { supabase } from '@/lib/supabase';
import type { Business } from '@/types/database';

export interface SearchFilters {
    country?: string;
    minTrustScore?: number;
    industry?: string;
    verifiedOnly?: boolean;
}

export interface NewsArticle {
    id: string;
    title: string;
    summary: string | null;
    url: string;
    source_id: string; // uuid
    published_at: string | null;
    sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface SearchResult {
    businesses: Business[];
    articles?: NewsArticle[];
    total: number;
    page: number;
    pageSize: number;
}

/**
 * Search businesses with filters and ranking
 */
export async function searchBusinesses(
    query: string,
    filters?: SearchFilters,
    page = 1,
    pageSize = 20
): Promise<SearchResult> {
    try {
        let businessQueryBuilder = supabase
            .from('businesses')
            .select('*', { count: 'exact' });

        // Text search
        if (query && query.trim()) {
            businessQueryBuilder = businessQueryBuilder.textSearch('search_vector', query, {
                type: 'websearch',
                config: 'norwegian',
            });
        }

        // Apply filters
        if (filters?.country) {
            businessQueryBuilder = businessQueryBuilder.eq('country_code', filters.country.toUpperCase());
        }

        if (filters?.minTrustScore) {
            businessQueryBuilder = businessQueryBuilder.gte('trust_score', filters.minTrustScore);
        }

        if (filters?.verifiedOnly) {
            businessQueryBuilder = businessQueryBuilder.eq('verification_status', 'verified');
        }

        if (filters?.industry) {
            businessQueryBuilder = businessQueryBuilder.ilike('quality_analysis->>industry_category', `%${filters.industry}%`);
        }

        // Order by trust score (primary) and relevance
        businessQueryBuilder = businessQueryBuilder
            .order('trust_score', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        // Execute queries
        // If we have a query string, we also search for news
        let newsPromise = Promise.resolve({ data: [], error: null });

        if (query && query.trim()) {
            // Simple ILIKE search for news since we don't have FTS column setup in client types yet
            // Limiting news to 5 for relevance mix
            newsPromise = supabase
                .from('news_articles')
                .select('*')
                .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
                .order('published_at', { ascending: false })
                .limit(5) as any;
        }

        const [businessResult, newsResult] = await Promise.all([
            businessQueryBuilder,
            newsPromise
        ]);

        const { data: businessData, error: businessError, count } = businessResult;
        const { data: newsData, error: newsError } = newsResult;

        if (businessError) {
            console.error('Search error (business):', businessError);
            throw businessError;
        }

        // Log search analytics (fire and forget)
        if (query && query.trim()) {
            (async () => {
                try {
                    await supabase.from('search_analytics').insert({
                        query: query.trim(),
                        filters: filters,
                        results_count: count || businessData?.length || 0,
                    });
                } catch (e) {
                    console.error('Analytics log failed:', e);
                }
            })();
        }

        return {
            businesses: JSON.parse(JSON.stringify(businessData || [])),
            articles: newsData ? JSON.parse(JSON.stringify(newsData)) : [],
            total: count || 0,
            page,
            pageSize,
        };
    } catch (error) {
        console.error('Error searching businesses:', error);
        return {
            businesses: [],
            articles: [],
            total: 0,
            page,
            pageSize,
        };
    }
}

/**
 * Get a single business by org number
 */
export async function getBusinessByOrgNumber(orgNumber: string): Promise<Business | null> {
    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('org_number', orgNumber)
        .single();

    if (error) {
        console.error('Error fetching business:', error);
        return null;
    }

    return data;
}

/**
 * Get business by ID
 */
export async function getBusinessById(id: string): Promise<Business | null> {
    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching business:', error);
        return null;
    }

    return data;
}

/**
 * Get recently verified businesses
 */
export async function getRecentlyVerified(limit = 10): Promise<Business[]> {
    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('verification_status', 'verified')
        .order('last_verified_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching recent businesses:', error);
        return [];
    }

    return data || [];
}

/**
 * Get top trusted businesses
 */
export async function getTopTrusted(limit = 10): Promise<Business[]> {
    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .gte('trust_score', 70)
        .order('trust_score', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching top trusted:', error);
        return [];
    }

    return data || [];
}
