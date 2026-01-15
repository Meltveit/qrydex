import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function POST(request: NextRequest) {
    try {
        const { postId, value } = await request.json();

        if (!postId || ![1, -1, 0].includes(value)) {
            return NextResponse.json(
                { error: 'Invalid request. Value must be 1, -1, or 0' },
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

        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (value === 0) {
            // Remove vote
            const { error } = await supabase
                .from('post_votes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', user.id);

            if (error) {
                console.error('Delete vote error:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
        } else {
            // Upsert vote (insert or update)
            const { error } = await supabase
                .from('post_votes')
                .upsert({
                    post_id: postId,
                    user_id: user.id,
                    value: value,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'post_id,user_id'
                });

            if (error) {
                console.error('Upsert vote error:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
        }

        // Update post likes_count
        const { data: votes } = await supabase
            .from('post_votes')
            .select('value')
            .eq('post_id', postId);

        const likesCount = votes?.reduce((sum, vote) => sum + vote.value, 0) || 0;

        await supabase
            .from('posts')
            .update({ likes_count: likesCount })
            .eq('id', postId);

        return response;
    } catch (error) {
        console.error('Vote error:', error);
        return NextResponse.json(
            { error: 'Failed to process vote' },
            { status: 500 }
        );
    }
}
