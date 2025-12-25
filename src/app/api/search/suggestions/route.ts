
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
    // Using simple ilike for partial match on name or org_number
    const { data: businesses, error } = await supabase
        .from('businesses')
        .select('legal_name, org_number, logo_url')
        .or(`legal_name.ilike.%${query}%,org_number.ilike.%${query}%`)
        .limit(5);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format suggestions
    const suggestions = (businesses || []).map(b => ({
        type: 'business',
        label: b.legal_name,
        value: b.org_number,
        logo: b.logo_url
    }));

    return NextResponse.json(suggestions);
}
