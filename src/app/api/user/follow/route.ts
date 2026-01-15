import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function POST(request: NextRequest) {
    try {
        const { followingId } = await request.json();

        if (!followingId) {
            return NextResponse.json(
                { error: 'followingId is required' },
                { status: 400 }
            );
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (user.id === followingId) {
            return NextResponse.json(
                { error: 'Cannot follow yourself' },
                { status: 400 }
            );
        }

        // Check if already following
        const { data: existing } = await supabase
            .from('user_follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', followingId)
            .single();

        if (existing) {
            // Unfollow
            const { error } = await supabase
                .from('user_follows')
                .delete()
                .eq('follower_id', user.id)
                .eq('following_id', followingId);

            if (error) throw error;

            return NextResponse.json({ success: true, following: false });
        } else {
            // Follow
            const { error } = await supabase
                .from('user_follows')
                .insert({
                    follower_id: user.id,
                    following_id: followingId,
                });

            if (error) throw error;

            return NextResponse.json({ success: true, following: true });
        }
    } catch (error) {
        console.error('Follow error:', error);
        return NextResponse.json(
            { error: 'Failed to process follow' },
            { status: 500 }
        );
    }
}
