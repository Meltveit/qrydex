import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { postId, title, content } = body;

        if (!postId || !title || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

        // Check if user can edit this post
        const { data: post } = await supabase
            .from('posts')
            .select('user_id, channel_id')
            .eq('id', postId)
            .single();

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // User must own the post OR be mod/owner of channel
        let canEdit = post.user_id === user.id;

        if (!canEdit && post.channel_id) {
            const { data: membership } = await supabase
                .from('channel_members')
                .select('role')
                .eq('channel_id', post.channel_id)
                .eq('user_id', user.id)
                .single();

            canEdit = membership?.role === 'owner' || membership?.role === 'moderator';
        }

        if (!canEdit) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        // Update post
        const { error } = await supabase
            .from('posts')
            .update({
                title,
                content,
                edit_count: supabase.rpc('increment', 1), // increment edit count
                updated_at: new Date().toISOString(),
            })
            .eq('id', postId);

        if (error) {
            console.error('Edit error:', error);
            return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
        }

        return response;
    } catch (error) {
        console.error('Edit post error:', error);
        return NextResponse.json({ error: 'Failed to edit post' }, { status: 500 });
    }
}
