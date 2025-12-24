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

export interface SearchResult {
    businesses: Business[];
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
        let queryBuilder = supabase
            .from('businesses')
            .select('*', { count: 'exact' });

        // Text search
        if (query && query.trim()) {
            // Use PostgreSQL full-text search on search_vector
            queryBuilder = queryBuilder.textSearch('search_vector', query, {
                type: 'websearch',
                config: 'norwegian',
            });
        }

        // Apply filters
        if (filters?.country) {
            queryBuilder = queryBuilder.eq('country_code', filters.country.toUpperCase());
        }

        if (filters?.minTrustScore) {
            queryBuilder = queryBuilder.gte('trust_score', filters.minTrustScore);
        }

        if (filters?.verifiedOnly) {
            queryBuilder = queryBuilder.eq('verification_status', 'verified');
        }

        if (filters?.industry) {
            // Search in quality_analysis.industry_category
            queryBuilder = queryBuilder.ilike('quality_analysis->>industry_category', `%${filters.industry}%`);
        }

        // Order by trust score (primary) and relevance
        queryBuilder = queryBuilder
            .order('trust_score', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        const { data, error, count } = await queryBuilder;

        if (error) {
            console.error('Search error:', error);
            throw error;
        }

        // Log search analytics (fire and forget)
        if (query && query.trim()) {
            (async () => {
                try {
                    await supabase.from('search_analytics').insert({
                        query: query.trim(),
                        filters: filters,
                        results_count: count || data?.length || 0,
                    });
                } catch (e) {
                    console.error('Analytics log failed:', e);
                }
            })();
        }

        return {
            businesses: JSON.parse(JSON.stringify(data || [])), // Ensure strictly serializable
            total: count || 0,
            page,
            pageSize,
        };
    } catch (error) {
        console.error('Error searching businesses:', error);
        return {
            businesses: [],
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
