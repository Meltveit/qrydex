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

        // Unsubscribe from country
        const { error } = await supabase
            .from('country_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('country_id', countryId);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error leaving country:', error);
        return NextResponse.json(
            { error: 'Failed to leave country' },
            { status: 500 }
        );
    }
}
