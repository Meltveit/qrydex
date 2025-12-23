import { NextRequest, NextResponse } from 'next/server';
import { searchBusinesses } from '@/lib/search';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q') || '';
        const country = searchParams.get('country') || undefined;
        const minScore = searchParams.get('minScore');
        const industry = searchParams.get('industry') || undefined;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);

        const results = await searchBusinesses(
            query,
            {
                country,
                minTrustScore: minScore ? parseInt(minScore, 10) : undefined,
                industry,
                verifiedOnly: searchParams.get('verified') === 'true',
            },
            page,
            pageSize
        );

        return NextResponse.json(results);
    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json(
            { error: 'Search failed' },
            { status: 500 }
        );
    }
}
