import { createClient } from '@/lib/supabase/server';
import { PostCard } from '@/components/posts/PostCard';
import Link from 'next/link';
import { Rss, Globe, TrendingUp, Clock, Flame, Users } from 'lucide-react';

export const metadata = {
    title: 'Your Feed - Qrydex',
    description: 'Posts from communities you follow',
};

export default async function FeedPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="min-h-screen bg-noir-bg flex items-center justify-center">
                <div className="text-center">
                    <Rss className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Sign in to see your feed</h1>
                    <p className="text-gray-400 mb-6">Join communities to get a personalized feed</p>
                    <Link
                        href="/login"
                        className="inline-block bg-neon-blue text-noir-bg font-bold px-6 py-3 rounded-lg hover:bg-neon-blue/90 transition-colors"
                    >
                        Log In
                    </Link>
                </div>
            </div>
        );
    }

    // Get channels user is member of
    const { data: memberships } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

    const channelIds = memberships?.map(m => m.channel_id) || [];

    // Fetch posts from user's channels
    let posts: any[] = [];
    if (channelIds.length > 0) {
        // Fetch posts
        const { data: fetchedPosts } = await supabase
            .from('posts')
            .select(`
            id,
            short_id,
            slug,
            title,
            content,
            type,
            created_at,
            likes_count,
            comments_count,
            profiles:user_id (username, display_name, avatar_url),
            countries:country_id (code, name, flag_emoji),
            channels:channel_id (name, slug)
        `)
            .in('channel_id', channelIds)
            .order('created_at', { ascending: false })
            .limit(50);
        posts = fetchedPosts || [];
    }

    // Also get user's joined channels for sidebar
    const { data: joinedChannels } = await supabase
        .from('channels')
        .select('id, name, slug, member_count')
        .in('id', channelIds)
        .limit(10);

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex gap-8">
                    {/* Main Feed */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-2xl font-bold text-white flex items-center">
                                <Rss className="w-6 h-6 mr-2 text-neon-blue" />
                                Your Feed
                            </h1>
                            <Link
                                href="/"
                                className="text-gray-400 hover:text-white transition-colors flex items-center"
                            >
                                <Globe className="w-4 h-4 mr-1" />
                                Global Feed
                            </Link>
                        </div>

                        {posts && posts.length > 0 ? (
                            <div className="space-y-4">
                                {posts.map((post: any) => (
                                    <PostCard
                                        key={post.id}
                                        post={{
                                            ...post,
                                            author: post.profiles,
                                            country_code: post.countries?.code,
                                            channel: post.channels,
                                        }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-noir-panel rounded-xl border border-gray-800">
                                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-white mb-2">Your feed is empty</h2>
                                <p className="text-gray-400 mb-6">Join some communities to see their posts here</p>
                                <Link
                                    href="/c"
                                    className="inline-block bg-neon-blue text-noir-bg font-bold px-6 py-3 rounded-lg hover:bg-neon-blue/90 transition-colors"
                                >
                                    Browse Communities
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="w-80 hidden lg:block">
                        <div className="bg-noir-panel border border-gray-800 rounded-xl p-4">
                            <h3 className="font-bold text-white mb-4">Your Communities</h3>
                            {joinedChannels && joinedChannels.length > 0 ? (
                                <div className="space-y-2">
                                    {joinedChannels.map((channel: any) => (
                                        <Link
                                            key={channel.id}
                                            href={`/c/${channel.slug}`}
                                            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800 transition-colors"
                                        >
                                            <span className="text-white">c/{channel.name}</span>
                                            <span className="text-xs text-gray-500">{channel.member_count || 0}</span>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">No communities joined yet</p>
                            )}
                            <Link
                                href="/c"
                                className="block text-center text-neon-blue text-sm mt-4 hover:underline"
                            >
                                Discover more →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
