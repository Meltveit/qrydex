'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Search, FileText, Hash, User, Globe } from 'lucide-react';

function SearchContent() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const [results, setResults] = useState<any>({ posts: [], channels: [], users: [], countries: [] });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('posts');
    const supabase = createClient();

    useEffect(() => {
        const search = async () => {
            if (!query) return;
            setLoading(true);

            const [postsRes, channelsRes, usersRes, countriesRes] = await Promise.all([
                supabase
                    .from('posts')
                    .select('id, title, type, country_code, likes_count')
                    .ilike('title', `%${query}%`)
                    .limit(20),
                supabase
                    .from('channels')
                    .select('id, name, slug, description, member_count')
                    .ilike('name', `%${query}%`)
                    .limit(20),
                supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .ilike('username', `%${query}%`)
                    .limit(20),
                supabase
                    .from('countries')
                    .select('code, name, flag_emoji')
                    .eq('is_active', true)
                    .or(`name.ilike.%${query}%,native_name.ilike.%${query}%`)
                    .limit(20),
            ]);

            setResults({
                posts: postsRes.data || [],
                channels: channelsRes.data || [],
                users: usersRes.data || [],
                countries: countriesRes.data || [],
            });
            setLoading(false);
        };
        search();
    }, [query]);

    const tabs = [
        { id: 'posts', label: 'Posts', icon: FileText, count: results.posts.length },
        { id: 'channels', label: 'Channels', icon: Hash, count: results.channels.length },
        { id: 'countries', label: 'Countries', icon: Globe, count: results.countries.length },
        { id: 'users', label: 'Users', icon: User, count: results.users.length },
    ];

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-white mb-2">Search Results</h1>
                <p className="text-gray-400 mb-8">
                    {query ? `Showing results for "${query}"` : 'Enter a search term to find posts, channels, or users'}
                </p>

                {/* Tabs */}
                <div className="flex space-x-2 mb-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-neon-blue text-noir-bg'
                                : 'bg-gray-800 text-gray-400 hover:text-white'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* Results */}
                {loading ? (
                    <div className="text-center py-16">
                        <div className="animate-spin w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full mx-auto"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeTab === 'posts' && results.posts.map((post: any) => (
                            <Link
                                key={post.id}
                                href={`/${post.country_code}/${post.id}`}
                                className="block bg-noir-panel border border-gray-800 rounded-lg p-4 hover:border-neon-blue transition-colors"
                            >
                                <span className={`text-xs font-bold px-2 py-0.5 rounded mr-2 ${post.type === 'PROMPT' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {post.type}
                                </span>
                                <span className="text-white font-medium">{post.title}</span>
                            </Link>
                        ))}

                        {activeTab === 'channels' && results.channels.map((channel: any) => (
                            <Link
                                key={channel.id}
                                href={`/c/${channel.slug}`}
                                className="block bg-noir-panel border border-gray-800 rounded-lg p-4 hover:border-neon-blue transition-colors"
                            >
                                <div className="flex items-center space-x-3">
                                    <Hash className="w-5 h-5 text-neon-blue" />
                                    <div>
                                        <span className="text-white font-medium">c/{channel.name}</span>
                                        <p className="text-sm text-gray-400">{channel.description}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {activeTab === 'countries' && results.countries.map((country: any) => (
                            <Link
                                key={country.code}
                                href={`/${country.code}`}
                                className="block bg-noir-panel border border-gray-800 rounded-lg p-4 hover:border-neon-blue transition-colors"
                            >
                                <div className="flex items-center space-x-3">
                                    <span className="text-3xl">{country.flag_emoji}</span>
                                    <span className="text-white font-medium">{country.name}</span>
                                </div>
                            </Link>
                        ))}

                        {activeTab === 'users' && results.users.map((user: any) => (
                            <Link
                                key={user.id}
                                href={`/u/${user.username}`}
                                className="block bg-noir-panel border border-gray-800 rounded-lg p-4 hover:border-neon-blue transition-colors"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                                        <span className="text-white font-bold">{user.username[0].toUpperCase()}</span>
                                    </div>
                                    <span className="text-white font-medium">u/{user.username}</span>
                                </div>
                            </Link>
                        ))}

                        {results[activeTab]?.length === 0 && (
                            <div className="text-center py-16 bg-noir-panel rounded-xl border border-gray-800">
                                <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400">No {activeTab} found</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-noir-bg flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full"></div>
        </div>}>
            <SearchContent />
        </Suspense>
    );
}
