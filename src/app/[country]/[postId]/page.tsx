import { createClient } from '@/lib/supabase/server';
import { CopyButton } from '@/components/posts/CopyButton';
import { VoteButtons } from '@/components/common/VoteButtons';
import { CommentSection } from '@/components/posts/CommentSection';
import Link from 'next/link';
import { ArrowLeft, Clock, User, Tag } from 'lucide-react';

function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

interface Props {
    params: Promise<{ country: string; postId: string }>;
}

export async function generateMetadata({ params }: Props) {
    const { postId } = await params;
    const supabase = await createClient();

    const { data: post } = await supabase
        .from('posts')
        .select('title')
        .eq('id', postId)
        .single();

    return {
        title: post ? `${post.title} - Qrydex` : 'Post - Qrydex',
    };
}

export default async function PostDetailPage({ params }: Props) {
    const { country: countryCode, postId } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch post with author and country
    const { data: post } = await supabase
        .from('posts')
        .select(`
            *,
            profiles:user_id (username, avatar_url),
            countries:country_id (name, flag_emoji, code)
        `)
        .eq('id', postId)
        .single();

    if (!post) {
        return (
            <div className="min-h-screen bg-noir-bg flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-4">Post Not Found</h1>
                    <p className="text-gray-400 mb-8">This post doesn't exist or was deleted.</p>
                    <Link href="/" className="text-neon-blue hover:underline">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    // Fetch comments
    const { data: comments } = await supabase
        .from('comments')
        .select(`
            id,
            content,
            created_at,
            profiles:user_id (username, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

    const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
    const country = Array.isArray(post.countries) ? post.countries[0] : post.countries;

    // Check if user can edit post
    let canEdit = false;
    if (user) {
        canEdit = post.user_id === user.id;

        // OR user is mod/owner of channel
        if (!canEdit && post.channel_id) {
            const { data: membership } = await supabase
                .from('channel_members')
                .select('role')
                .eq('channel_id', post.channel_id)
                .eq('user_id', user.id)
                .single();
            canEdit = membership?.role === 'owner' || membership?.role === 'moderator';
        }

        // Track view (server-side)
        await supabase
            .from('post_views')
            .insert({ post_id: postId, user_id: user.id })
            .select();
    }

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Back Link */}
                <Link
                    href={`/${country?.code || countryCode}`}
                    className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to {country?.name || 'Hub'}
                </Link>

                {/* Post Card */}
                <article className="bg-noir-panel border border-gray-800 rounded-xl p-6 mb-8">
                    {/* Type Badge */}
                    <div className="mb-4">
                        <span className={`text-sm font-bold px-3 py-1 rounded ${post.type === 'PROMPT'
                            ? 'bg-neon-blue/20 text-neon-blue'
                            : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                            {post.type}
                        </span>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-white mb-4">{post.title}</h1>

                    {/* Meta */}
                    <div className="flex items-center space-x-4 text-sm text-gray-400 mb-6">
                        <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            <Link href={`/u/${author?.username || 'deleted'}`} className="hover:text-white">
                                u/{author?.username || 'deleted'}
                            </Link>
                        </div>
                        <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {timeAgo(post.created_at)}
                        </div>
                        <div className="flex items-center">
                            <span className="text-xl mr-1">{country?.flag_emoji}</span>
                            {country?.name}
                        </div>
                    </div>

                    {/* Content */}
                    <div className={`text-gray-200 mb-6 whitespace-pre-wrap ${post.type === 'PROMPT' ? 'font-mono bg-noir-bg p-4 rounded-lg border border-gray-700' : ''
                        }`}>
                        {post.content}
                    </div>

                    {/* Copy Button for prompts */}
                    {post.type === 'PROMPT' && (
                        <div className="mb-6">
                            <CopyButton text={post.content} />
                        </div>
                    )}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="flex items-center space-x-2 mb-6">
                            <Tag className="w-4 h-4 text-gray-500" />
                            <div className="flex flex-wrap gap-2">
                                {post.tags.map((tag: string) => (
                                    <span key={tag} className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-sm">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-gray-800 pt-4">
                        <VoteButtons postId={post.id} initialLikes={post.likes_count} />

                        <div className="flex items-center space-x-4">
                            {post.views_count !== undefined && post.views_count > 0 && (
                                <span className="text-sm text-gray-500">
                                    {post.views_count} {post.views_count === 1 ? 'view' : 'views'}
                                </span>
                            )}
                            {canEdit && (
                                <Link
                                    href={`/p/${postId}/edit`}
                                    className="text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    Edit
                                </Link>
                            )}
                        </div>
                    </div>
                </article>

                {/* Comments */}
                <CommentSection
                    postId={postId}
                    comments={(comments || []).map((c: any) => ({
                        ...c,
                        author: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
                    }))}
                    user={user}
                />
            </div>
        </div>
    );
}
