import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { countryId } = body;

        if (!countryId) {
            return NextResponse.json(
                { error: 'Country ID is required' },
                { status: 400 }
            );
        }

        // Check if country exists
        const { data: country, error: countryError } = await supabase
            .from('countries')
            .select('id')
            .eq('id', countryId)
            .single();

        if (countryError || !country) {
            return NextResponse.json(
                { error: 'Country not found' },
                { status: 404 }
            );
        }

        // Subscribe to country
        const { data, error } = await supabase
            .from('country_subscriptions')
            .insert({
                user_id: user.id,
                country_id: countryId,
            })
            .select()
            .single();

        if (error) {
            // Check if already subscribed
            if (error.code === '23505') { // Unique violation
                return NextResponse.json(
                    { error: 'Already subscribed to this country' },
                    { status: 409 }
                );
            }
            throw error;
        }

        return NextResponse.json({ success: true, subscription: data });
    } catch (error) {
        console.error('Error joining country:', error);
        return NextResponse.json(
            { error: 'Failed to join country' },
            { status: 500 }
        );
    }
}
