import { createClient } from '@/lib/supabase/server';
import { PostCard } from '@/components/posts/PostCard';
import Link from 'next/link';
import { ArrowLeft, Hash, Users, Settings } from 'lucide-react';
import { JoinLeaveButton } from '@/components/channel/JoinLeaveButton';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: channel } = await supabase
        .from('channels')
        .select('name, description')
        .eq('slug', slug)
        .single();

    return {
        title: channel ? `c/${channel.name} - Qrydex` : 'Channel - Qrydex',
        description: channel?.description || 'Channel on Qrydex',
    };
}

export default async function ChannelDetailPage({ params }: Props) {
    const { slug } = await params;
    const supabase = await createClient();

    // Fetch the channel
    const { data: channel } = await supabase
        .from('channels')
        .select('*, member_count')
        .eq('slug', slug)
        .single();

    if (!channel) {
        return notFound();
    }

    // Check if user is a member and get their role
    const { data: { user } } = await supabase.auth.getUser();
    let userRole = null;
    let isMember = false;
    if (user) {
        const { data: membership } = await supabase
            .from('channel_members')
            .select('role')
            .eq('channel_id', channel.id)
            .eq('user_id', user.id)
            .single();

        if (membership) {
            userRole = membership.role;
            isMember = true;
        }
    }

    // Fetch posts in this channel
    const { data: posts } = await supabase
        .from('posts')
        .select(`
            id,
            title,
            content,
            type,
            created_at,
            likes_count,
            comments_count,
            profiles:user_id (username, display_name, avatar_url)
        `)
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: false })
        .limit(50);

    return (
        <div className="min-h-screen bg-noir-bg">
            {/* Channel Header */}
            <div className="bg-noir-panel border-b border-gray-800">
                <div className="max-w-5xl mx-auto px-4 py-8">
                    <Link href="/c" className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Browse Channels
                    </Link>

                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center">
                                <Hash className="w-8 h-8 text-neon-blue" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">c/{channel.name}</h1>
                                <p className="text-gray-400">{channel.description}</p>
                                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                    <div className="flex items-center">
                                        <Users className="w-4 h-4 mr-1" />
                                        {channel.member_count || 0} members
                                    </div>
                                    {channel.is_nsfw && (
                                        <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold">
                                            NSFW
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            {user && (
                                <>
                                    <JoinLeaveButton
                                        channelId={channel.id}
                                        channelSlug={channel.slug}
                                        isMember={isMember}
                                        isOwner={userRole === 'owner'}
                                    />
                                    {isMember && (
                                        <Link
                                            href={`/c/${channel.slug}/submit`}
                                            className="bg-neon-blue text-noir-bg font-bold px-6 py-2 rounded-lg hover:bg-neon-blue/90 transition-colors"
                                        >
                                            Create Post
                                        </Link>
                                    )}
                                </>
                            )}
                            {(userRole === 'owner' || userRole === 'moderator') && (
                                <Link
                                    href={`/c/${channel.slug}/settings`}
                                    className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    <Settings className="w-5 h-5" />
                                    <span>Settings</span>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Non-member message */}
                    {user && !userRole && (
                        <div className="mt-4 bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-center">
                            <p className="text-gray-400">
                                Join this channel to post and participate in discussions
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Posts */}
            <div className="max-w-5xl mx-auto px-4 py-8">
                {posts && posts.length > 0 ? (
                    <div className="space-y-4">
                        {posts.map((post: any) => (
                            <PostCard
                                key={post.id}
                                post={{
                                    ...post,
                                    author: post.profiles,
                                }}
                                showChannel={false}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-noir-panel rounded-xl border border-gray-800">
                        <Hash className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">No posts yet</h2>
                        <p className="text-gray-400 mb-6">Be the first to post in c/{channel.name}!</p>
                        {isMember && (
                            <Link
                                href={`/c/${channel.slug}/submit`}
                                className="inline-block bg-neon-blue text-noir-bg font-bold px-6 py-3 rounded-lg hover:bg-neon-blue/90 transition-colors"
                            >
                                Create Post
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
