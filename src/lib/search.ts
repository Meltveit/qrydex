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

export interface AnalyticsContext {
    country?: string;
    region?: string;
    sessionId?: string;
}

/**
 * Search businesses with filters and ranking
 */
export async function searchBusinesses(
    query: string,
    filters?: SearchFilters,
    page = 1,
    pageSize = 20,
    context?: AnalyticsContext
): Promise<SearchResult> {
    try {
        let businessQueryBuilder = supabase
            .from('businesses')
            .select('*', { count: 'exact' });

        // ... existing query logic ... (re-verify that we don't overwrite lines 43-98 unnecessarily, but I need to insert imports or interface above)
        // Wait, I am replacing a large chunk to inject 'context' param in signature.
        // It is safer to replace the signature and the logging block separately?
        // No, I can do it in one go if I am careful.

        // Let's replace the signature first.


        // Text search
        if (query && query.trim()) {
            // Enhanced Search Logic:
            // 1. Try to match 'legal_name' or 'description' directly (standard FTS)
            // 2. ALSO match against address/location fields explicitly to support "Studio Oslo" queries

            // Note: Ideally, we should add address fields to the 'search_vector' in the database.
            // For now, we use an OR condition to cover location data not in the vector.

            const cleanQuery = query.trim().replace(/'/g, "''"); // Escape quotes
            const searchTerms = cleanQuery.split(' ').filter(t => t.length > 2);

            // Construct a robust OR filter
            // This searches: Name OR Description OR Address OR City OR Country
            const orConditions = [
                // Removing explicit FTS from OR to prevent syntax errors with spaces. 
                // We rely on specific field ILIKEs which are safer and cover most cases.
                `legal_name.ilike.%${cleanQuery}%`,
                `company_description.ilike.%${cleanQuery}%`,
                `registry_data->>visiting_address.ilike.%${cleanQuery}%`,
                `registry_data->>registered_address.ilike.%${cleanQuery}%`,
                `registry_data->>city.ilike.%${cleanQuery}%`,
                `registry_data->>nace_description.ilike.%${cleanQuery}%`, // Brreg Industry Description
                `quality_analysis->>industry_category.ilike.%${cleanQuery}%` // AI Industry Tag
                // `city.ilike.%${cleanQuery}%`, // City column might not exist directly
                // `country_code.ilike.%${cleanQuery}%` // usually 2 chars, might not match "Norge"
            ];

            // Add country name matching if query looks like a country
            if (['norge', 'norway', 'no'].includes(cleanQuery.toLowerCase())) {
                orConditions.push(`country_code.eq.NO`);
            }

            // Using pure OR filter with ilike is expensive on large datasets but ensures matches 
            // where FTS vector might be missing data. 
            // For "Studio Norge", FTS might fail if vectors aren't weighted right.

            businessQueryBuilder = businessQueryBuilder.or(orConditions.join(','));
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

        // Log search analytics (fire and forget) - Bot B Pulse
        if (query && query.trim()) {
            (async () => {
                try {
                    await supabase.from('search_logs').insert({
                        query: query.trim(),
                        filters: filters,
                        result_count: count || businessData?.length || 0,
                        location_country: context?.country || 'Unknown',
                        location_region: context?.region,
                        anonymized_session_id: context?.sessionId
                    });
                } catch (e) {
                    console.error('Pulse logging failed:', e);
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
