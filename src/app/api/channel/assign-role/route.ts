import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { channelId, targetUserId, role } = body;

        if (!channelId || !targetUserId || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!['moderator', 'member'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        const response = NextResponse.json({ success: true });

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            response.cookies.set(name, value, options);
                        });
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if requester is owner
        const { data: membership } = await supabase
            .from('channel_members')
            .select('role')
            .eq('channel_id', channelId)
            .eq('user_id', user.id)
            .single();

        if (membership?.role !== 'owner') {
            return NextResponse.json({ error: 'Only owner can assign roles' }, { status: 403 });
        }

        // Update target user's role
        const { error } = await supabase
            .from('channel_members')
            .update({ role })
            .eq('channel_id', channelId)
            .eq('user_id', targetUserId);

        if (error) {
            console.error('Assign role error:', error);
            return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 });
        }

        return response;
    } catch (error) {
        console.error('Assign role error:', error);
        return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 });
    }
}
