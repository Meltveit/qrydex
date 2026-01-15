import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Hash, Users, Plus, Sparkles, Star } from 'lucide-react';

export const metadata = {
    title: 'Browse Channels - Qrydex',
    description: 'Discover AI prompt channels on Qrydex',
};

export default async function ChannelsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get user's joined channels
    let joinedChannelIds: string[] = [];
    if (user) {
        const { data: memberships } = await supabase
            .from('channel_members')
            .select('channel_id')
            .eq('user_id', user.id);
        joinedChannelIds = memberships?.map(m => m.channel_id) || [];
    }

    // Get user interests for recommendations
    let recommendedChannels: any[] = [];
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('interests')
            .eq('id', user.id)
            .single();

        if (profile?.interests && profile.interests.length > 0) {
            // Get channels matching user interests
            const { data } = await supabase
                .from('channels')
                .select('*')
                .overlaps('tags', profile.interests)
                .order('member_count', { ascending: false })
                .limit(6);
            recommendedChannels = data || [];
        }
    }

    const { data: channels } = await supabase
        .from('channels')
        .select('*')
        .order('member_count', { ascending: false })
        .limit(50);

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Browse Channels</h1>
                        <p className="text-gray-400">Discover communities around AI prompts and tools</p>
                    </div>
                    <Link
                        href="/c/create"
                        className="flex items-center space-x-2 bg-neon-blue text-noir-bg font-bold px-4 py-2 rounded-lg hover:bg-neon-blue/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Channel</span>
                    </Link>
                </div>

                {/* Recommended Channels */}
                {recommendedChannels.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                            <Sparkles className="w-5 h-5 mr-2 text-yellow-400" />
                            Recommended for You
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {recommendedChannels.map((channel: any) => (
                                <Link
                                    key={channel.id}
                                    href={`/c/${channel.slug}`}
                                    className="bg-gradient-to-br from-neon-blue/10 to-purple-500/10 border border-neon-blue/30 rounded-xl p-4 hover:border-neon-blue transition-colors group"
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className="w-12 h-12 bg-neon-blue/20 rounded-lg flex items-center justify-center">
                                            <Hash className="w-6 h-6 text-neon-blue" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-white group-hover:text-neon-blue transition-colors truncate">
                                                    c/{channel.name}
                                                </h3>
                                                <Star className="w-3 h-3 text-yellow-400" />
                                                {joinedChannelIds.includes(channel.id) && (
                                                    <span className="text-xs bg-neon-blue/20 text-neon-blue px-2 py-0.5 rounded font-medium">
                                                        Joined
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-400 line-clamp-2">{channel.description}</p>
                                            <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                                                <Users className="w-3 h-3" />
                                                <span>{channel.member_count || 0} members</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* All Channels */}
                <h2 className="text-xl font-bold text-white mb-4">All Channels</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {channels && channels.map((channel: any) => (
                        <Link
                            key={channel.id}
                            href={`/c/${channel.slug}`}
                            className="bg-noir-panel border border-gray-800 rounded-xl p-4 hover:border-neon-blue transition-colors group"
                        >
                            <div className="flex items-start space-x-3">
                                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                                    <Hash className="w-6 h-6 text-neon-blue" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white group-hover:text-neon-blue transition-colors truncate">
                                            c/{channel.name}
                                        </h3>
                                        {joinedChannelIds.includes(channel.id) && (
                                            <span className="text-xs bg-neon-blue/20 text-neon-blue px-2 py-0.5 rounded font-medium">
                                                Joined
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 line-clamp-2">{channel.description}</p>
                                    <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                                        <Users className="w-3 h-3" />
                                        <span>{channel.member_count || 0} members</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {(!channels || channels.length === 0) && (
                    <div className="text-center py-16 bg-noir-panel rounded-xl border border-gray-800">
                        <Hash className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">No channels yet</h2>
                        <p className="text-gray-400 mb-6">Be the first to create a channel!</p>
                        <Link
                            href="/c/create"
                            className="inline-block bg-neon-blue text-noir-bg font-bold px-6 py-3 rounded-lg hover:bg-neon-blue/90 transition-colors"
                        >
                            Create Channel
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
