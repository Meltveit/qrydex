import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const channelId = formData.get('channelId') as string;

        if (!channelId) {
            return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
        }

        const response = NextResponse.redirect(new URL(request.headers.get('referer') || '/', request.url));

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
            return NextResponse.redirect(new URL('/login', request.url));
        }

        // Check if user is owner
        const { data: membership } = await supabase
            .from('channel_members')
            .select('role')
            .eq('channel_id', channelId)
            .eq('user_id', user.id)
            .single();

        if (membership?.role === 'owner') {
            return NextResponse.json({ error: 'Owners cannot leave their channel' }, { status: 400 });
        }

        // Remove member
        await supabase
            .from('channel_members')
            .delete()
            .eq('channel_id', channelId)
            .eq('user_id', user.id);

        // Update member count
        await supabase.rpc('decrement_member_count', { p_channel_id: channelId });

        return response;
    } catch (error) {
        console.error('Leave channel error:', error);
        return NextResponse.json({ error: 'Failed to leave channel' }, { status: 500 });
    }
}
