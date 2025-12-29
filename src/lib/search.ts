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
            let cleanQuery = query.trim().replace(/'/g, "''"); // Escape quotes

            // Smart Query Parsing: Detect location intent ("... i Tyskland")
            const countryMap: Record<string, string> = {
                'norge': 'NO', 'borge': 'NO', 'norway': 'NO',
                'sverige': 'SE', 'sweden': 'SE',
                'danmark': 'DK', 'denmark': 'DK',
                'finland': 'FI', 'suomi': 'FI',
                'tyskland': 'DE', 'germany': 'DE', 'deutschland': 'DE',
                'frankrike': 'FR', 'france': 'FR',
                'spania': 'ES', 'spain': 'ES', 'espana': 'ES',
                'usa': 'US', 'amerika': 'US',
                'storbritannia': 'GB', 'uk': 'GB', 'england': 'GB'
            };

            // Regex for " i [Country]" or " in [Country]" at end of string
            const locationRegex = /\s+(?:i|in|på|at)\s+([a-zA-ZæøåÆØÅ]+)$/i;
            const match = cleanQuery.match(locationRegex);

            // Construct a robust OR filter
            // This searches: Name OR Description OR Address OR City OR Industry matches
            const orConditions: string[] = [];

            if (match) {
                const locationTerm = match[1].toLowerCase();
                const mappedCountry = countryMap[locationTerm];

                if (mappedCountry) {
                    // It's a country filter!
                    // Apply explicit filter (overrides any existing country filter)
                    // And REMOVE the location term from the text search so we don't strict-match "Tyskland" in the name
                    businessQueryBuilder = businessQueryBuilder.eq('country_code', mappedCountry);
                    cleanQuery = cleanQuery.replace(locationRegex, '').trim();
                    context = { ...context, country: mappedCountry }; // Update context for logging
                } else {
                    // It might be a city (e.g. "i Oslo")
                    // We can't strictly filter by city column easily without mapping, 
                    // but we can ensure we search the city field specifically.
                    // For now, allow the full query to run against city fields in the OR block.
                }
            } else {
                // Check if the query IS just a country name
                const directCountry = countryMap[cleanQuery.toLowerCase()];
                if (directCountry) {
                    // Apply exact country filter - DON'T search text
                    businessQueryBuilder = businessQueryBuilder.eq('country_code', directCountry);
                    context = { ...context, country: directCountry };
                    // Set cleanQuery to empty so we don't search text
                    cleanQuery = '';
                }
            }
        }


        // Populate orConditions with the (potentially modified) cleanQuery
        // Only if cleanQuery is not empty (could be empty after country filtering)
        if (cleanQuery) {
            orConditions.push(
                `legal_name.ilike.%${cleanQuery}%`,
                `company_description.ilike.%${cleanQuery}%`,
                `registry_data->>visiting_address.ilike.%${cleanQuery}%`,
                `registry_data->>registered_address.ilike.%${cleanQuery}%`,
                `registry_data->>city.ilike.%${cleanQuery}%`,
                `registry_data->>nace_description.ilike.%${cleanQuery}%`, // Brreg Industry Description
                `quality_analysis->>industry_category.ilike.%${cleanQuery}%`, // AI Industry Tag
                // Deep Scan 2.0: Search in services & products arrays (cast to text)
                `quality_analysis->>services.ilike.%${cleanQuery}%`,
                `quality_analysis->>products.ilike.%${cleanQuery}%`,
                // Multilingual Support (Global Expansion)
                `translations->en->>services.ilike.%${cleanQuery}%`,
                `translations->en->>products.ilike.%${cleanQuery}%`,
                `translations->en->>company_description.ilike.%${cleanQuery}%`,
                `translations->en->>industry_text.ilike.%${cleanQuery}%`,

                `translations->fr->>services.ilike.%${cleanQuery}%`,
                `translations->fr->>products.ilike.%${cleanQuery}%`,
                `translations->fr->>company_description.ilike.%${cleanQuery}%`,
                `translations->fr->>industry_text.ilike.%${cleanQuery}%`,

                `translations->de->>services.ilike.%${cleanQuery}%`,
                `translations->de->>products.ilike.%${cleanQuery}%`,
                `translations->de->>company_description.ilike.%${cleanQuery}%`,
                `translations->de->>industry_text.ilike.%${cleanQuery}%`,

                `translations->es->>services.ilike.%${cleanQuery}%`,
                `translations->es->>products.ilike.%${cleanQuery}%`,
                `translations->es->>company_description.ilike.%${cleanQuery}%`,
                `translations->es->>industry_text.ilike.%${cleanQuery}%`,
                // New Multilingual Keywords Field
                `quality_analysis->>search_keywords.ilike.%${cleanQuery}%`
            );
        }


        if (orConditions.length > 0) {
            businessQueryBuilder = businessQueryBuilder.or(orConditions.join(','));
        }
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
