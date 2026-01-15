import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { postId } = body;

        if (!postId) {
            return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
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

        // Track view (works for both logged in and anonymous)
        const { error } = await supabase
            .from('post_views')
            .insert({
                post_id: postId,
                user_id: user?.id || null,
            })
            .select();

        // Ignore duplicate errors (user already viewed)
        if (error && !error.message.includes('duplicate')) {
            console.error('View tracking error:', error);
        }

        return response;
    } catch (error) {
        console.error('Track view error:', error);
        return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
    }
}
