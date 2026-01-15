import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { postId, voteType } = await request.json();

        if (!postId || !['LIKE', 'DISLIKE'].includes(voteType)) {
            return NextResponse.json(
                { error: 'Invalid request' },
                { status: 400 }
            );
        }

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
                        // Not needed for this route
                    },
                },
            }
        );

        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();

        // Get IP hash for anonymous voting
        const forwardedFor = request.headers.get('x-forwarded-for');
        const ip = forwardedFor?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
        const ipHash = crypto.createHash('sha256').update(ip + (process.env.VOTE_SALT || 'qrydex')).digest('hex');

        if (user) {
            // Authenticated user voting
            // Check existing vote
            const { data: existingVote } = await supabase
                .from('votes')
                .select('id, vote_type')
                .eq('post_id', postId)
                .eq('user_id', user.id)
                .single();

            if (existingVote) {
                if (existingVote.vote_type === voteType) {
                    // Remove vote
                    await supabase.from('votes').delete().eq('id', existingVote.id);
                } else {
                    // Change vote
                    await supabase
                        .from('votes')
                        .update({ vote_type: voteType })
                        .eq('id', existingVote.id);
                }
            } else {
                // New vote
                await supabase.from('votes').insert({
                    post_id: postId,
                    user_id: user.id,
                    vote_type: voteType,
                });
            }
        } else {
            // Anonymous voting via IP hash
            const { data: existingVote } = await supabase
                .from('votes')
                .select('id, vote_type')
                .eq('post_id', postId)
                .eq('ip_hash', ipHash)
                .single();

            if (existingVote) {
                if (existingVote.vote_type === voteType) {
                    // Remove vote
                    await supabase.from('votes').delete().eq('id', existingVote.id);
                } else {
                    // Change vote
                    await supabase
                        .from('votes')
                        .update({ vote_type: voteType })
                        .eq('id', existingVote.id);
                }
            } else {
                // New anonymous vote
                await supabase.from('votes').insert({
                    post_id: postId,
                    ip_hash: ipHash,
                    vote_type: voteType,
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Vote error:', error);
        return NextResponse.json(
            { error: 'Failed to process vote' },
            { status: 500 }
        );
    }
}
