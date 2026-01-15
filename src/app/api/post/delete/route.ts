import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function DELETE(request: NextRequest) {
    try {
        const { postId } = await request.json();

        if (!postId) {
            return NextResponse.json(
                { error: 'postId is required' },
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

        // Get post to check ownership
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('user_id, channel_id')
            .eq('id', postId)
            .single();

        if (fetchError || !post) {
            return NextResponse.json(
                { error: 'Post not found' },
                { status: 404 }
            );
        }

        // Check if user owns the post OR is channel owner/mod
        let canDelete = post.user_id === user.id;

        if (!canDelete && post.channel_id) {
            const { data: membership } = await supabase
                .from('channel_members')
                .select('role')
                .eq('channel_id', post.channel_id)
                .eq('user_id', user.id)
                .single();

            canDelete = membership?.role === 'owner' || membership?.role === 'moderator';
        }

        if (!canDelete) {
            return NextResponse.json(
                { error: 'You do not have permission to delete this post' },
                { status: 403 }
            );
        }

        // Delete the post (cascades to comments, votes, views, etc.)
        const { error: deleteError } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);

        if (deleteError) {
            console.error('Delete error:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete post' },
                { status: 500 }
            );
        }

        return response;
    } catch (error) {
        console.error('Delete post error:', error);
        return NextResponse.json(
            { error: 'Failed to delete post' },
            { status: 500 }
        );
    }
}
