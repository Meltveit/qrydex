
import { createServerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json([]);
    }

    const supabase = createServerClient();

    // Search for businesses matching the query
    // Search in name, org number, products (array), or description
    // Note: 'products' is text[], using cs (contains) or ilike text cast is needed.
    // Supabase text search on array is tricky with .or(). 
    // Simplified: Search name/org/description first. 
    // console.log(`🔍 Suggestion Query: "${query}"`); // Removed as part of the change

    // 1. Search for Businesses (Name match)
    const businessPromise = supabase
        .from('businesses')
        .select('legal_name, org_number, logo_url')
        .or(`legal_name.ilike.%${query}%,company_description.ilike.%${query}%`)
        .limit(5);

    // 2. Search for Categories (NACE or Industry)
    // We fetch a few rows that match industry description to extract unique category names
    const categoryPromise = supabase
        .from('businesses')
        .select('registry_data, quality_analysis')
        .or(`registry_data->>nace_description.ilike.%${query}%,quality_analysis->>industry_category.ilike.%${query}%`)
        .limit(10); // Fetch more to increase chance of finding unique valid categories

    const [businessRes, categoryRes] = await Promise.all([businessPromise, categoryPromise]);

    const suggestions = [];

    // Process Categories first (so they appear at top or mixed? User usually wants specific first? 
    // Let's put categories first if they are exact matches, otherwise mixed.
    // For simplicity: Categories first if generic query, Businesses first if specific.
    // We'll treat them as a separate group.)

    const categories = new Set<string>();

    if (categoryRes.data) {
        categoryRes.data.forEach((biz: any) => {
            const nace = biz.registry_data?.nace_description;
            const aiCat = biz.quality_analysis?.industry_category;

            if (nace && nace.toLowerCase().includes(query.toLowerCase())) {
                categories.add(nace);
            }
            if (aiCat && aiCat.toLowerCase().includes(query.toLowerCase())) {
                categories.add(aiCat);
            }
        });
    }

    // Add top 3 unique categories
    Array.from(categories).slice(0, 3).forEach(cat => {
        suggestions.push({
            label: cat,
            value: cat, // Value is the query string to search for
            type: 'category',
            logo: null
        });
    });

    // Add businesses
    if (businessRes.data) {
        businessRes.data.forEach((biz: any) => {
            suggestions.push({
                label: biz.legal_name,
                value: biz.org_number,
                type: 'business',
                logo: biz.logo_url
            });
        });
    }

    return NextResponse.json(suggestions);
}
