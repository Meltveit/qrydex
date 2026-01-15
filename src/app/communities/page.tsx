'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Hash, Users, Loader } from 'lucide-react';

export default function MyCommunitiesPage() {
    const [communities, setCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchCommunities = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data: memberships } = await supabase
                .from('channel_members')
                .select(`
                    channel_id,
                    joined_at,
                    notifications_enabled,
                    channels:channel_id (
                        id,
                        name,
                        slug,
                        description,
                        member_count
                    )
                `)
                .eq('user_id', user.id)
                .order('joined_at', { ascending: false });

            setCommunities(memberships?.map(m => ({
                ...m.channels,
                joined_at: m.joined_at,
                notifications_enabled: m.notifications_enabled
            })) || []);
            setLoading(false);
        };

        fetchCommunities();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-noir-bg flex items-center justify-center">
                <Loader className="w-8 h-8 text-neon-blue animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">My Communities</h1>
                    <p className="text-gray-400">Channels you've joined</p>
                </div>

                {communities.length === 0 ? (
                    <div className="text-center py-16 bg-noir-panel rounded-xl border border-gray-800">
                        <Hash className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">No communities yet</h2>
                        <p className="text-gray-400 mb-6">Join some channels to see them here!</p>
                        <Link
                            href="/c"
                            className="inline-block bg-neon-blue text-noir-bg font-bold px-6 py-3 rounded-lg hover:bg-neon-blue/90 transition-colors"
                        >
                            Browse Channels
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {communities.map((channel: any) => (
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
                                        <h3 className="font-bold text-white group-hover:text-neon-blue transition-colors truncate">
                                            c/{channel.name}
                                        </h3>
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
                )}
            </div>
        </div>
    );
}
