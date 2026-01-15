import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { channelId } = body;

        if (!channelId) {
            return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
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

        // Check if user is owner
        const { data: membership } = await supabase
            .from('channel_members')
            .select('role')
            .eq('channel_id', channelId)
            .eq('user_id', user.id)
            .single();

        if (membership?.role !== 'owner') {
            return NextResponse.json({ error: 'Only channel owner can delete' }, { status: 403 });
        }

        // Delete channel (cascade will handle members and posts)
        const { error } = await supabase
            .from('channels')
            .delete()
            .eq('id', channelId);

        if (error) {
            console.error('Delete channel error:', error);
            return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
        }

        return response;
    } catch (error) {
        console.error('Delete channel error:', error);
        return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
    }
}
