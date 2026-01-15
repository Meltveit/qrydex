import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Globe, ArrowRight, Users, FileText, TrendingUp, Search, Plus, Flame, Clock, MapPin } from 'lucide-react';

interface Country {
    id: string;
    code: string;
    name: string;
    native_name: string;
    flag_emoji: string;
    stats: {
        posts: number;
        users: number;
        views: number;
    };
}

interface Post {
    id: string;
    title: string;
    type: 'PROMPT' | 'REQUEST';
    likes_count: number;
    country_code: string;
    countries: { flag_emoji: string; name: string } | null;
}

export default async function Home() {
    const supabase = await createClient();

    // Fetch all active countries
    const { data: countries } = await supabase
        .from('countries')
        .select('*')
        .eq('is_active', true)
        .order('name');

    // Get top countries (most posts)
    const featuredCodes = ['us', 'gb', 'de', 'no', 'fr', 'jp', 'au', 'ca'];
    const featuredCountries = countries?.filter(c => featuredCodes.includes(c.code)) || [];

    // Get stats from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: totalPosts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twentyFourHoursAgo);

    const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twentyFourHoursAgo);

    const { count: totalChannels } = await supabase
        .from('channels')
        .select('*', { count: 'exact', head: true });

    // Get trending posts (last 6 months - AI moves fast!)
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: trendingPosts } = await supabase
        .from('posts')
        .select(`
            id,
            title,
            type,
            likes_count,
            country_code,
            countries(flag_emoji, name)
        `)
        .gte('created_at', sixMonthsAgo)
        .order('likes_count', { ascending: false })
        .limit(5);

    return (
        <div className="relative overflow-hidden min-h-screen">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-neon-blue/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[20%] w-[600px] h-[600px] bg-neon-green/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10">
                {/* Hero Section - The Global Search & Pulse */}
                <section className="max-w-5xl mx-auto px-4 pt-16 pb-8">
                    {/* Logo & Tagline */}
                    <div className="text-center mb-10">
                        <div className="flex items-center justify-center space-x-3 mb-4">
                            <Globe className="w-12 h-12 text-neon-blue animate-pulse" />
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-white">
                                QRYDEX
                            </h1>
                        </div>
                        <p className="text-xl md:text-2xl text-gray-400 font-light">
                            The World's AI Index
                        </p>
                    </div>

                    {/* Hero Search */}
                    <form action="/search" method="GET" className="max-w-3xl mx-auto mb-6">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500" />
                                <input
                                    type="text"
                                    name="q"
                                    placeholder="Query the global index..."
                                    className="w-full bg-noir-panel border-2 border-gray-700 rounded-xl pl-14 pr-4 py-4 text-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue transition-colors"
                                />
                            </div>
                            <Link
                                href="/submit"
                                className="flex items-center justify-center space-x-2 bg-neon-blue text-noir-bg font-bold px-6 py-4 rounded-xl hover:bg-neon-blue/90 transition-colors whitespace-nowrap"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Post to Index</span>
                            </Link>
                        </div>
                    </form>

                    {/* The Pulse - Live Activity */}
                    <div className="overflow-hidden max-w-3xl mx-auto mb-8">
                        <div className="flex items-center space-x-4 text-sm">
                            <span className="flex items-center space-x-1 text-gray-400">
                                <span className="w-2 h-2 bg-neon-green rounded-full animate-ping" />
                                <span>Last 24h</span>
                            </span>
                            <div className="flex items-center space-x-4 overflow-hidden text-gray-500">
                                <span>📊 <span className="text-neon-blue">{totalPosts || 0}</span> prompts</span>
                                <span className="text-gray-700">|</span>
                                <span>👥 <span className="text-neon-green">{totalUsers || 0}</span> new users</span>
                                <span className="text-gray-700">|</span>
                                <span>🌍 <span className="text-yellow-400">{countries?.length || 0}</span> countries</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Choose Your Hub Section */}
                <section className="max-w-5xl mx-auto px-4 py-8">
                    <div className="text-center mb-8">
                        <h2 className="text-lg text-neon-green font-mono uppercase tracking-widest mb-2">
                            Choose Your Hub
                        </h2>
                    </div>

                    {/* Auto-Detect Button */}
                    <div className="flex justify-center mb-8">
                        <Link
                            href="/no"
                            className="flex items-center space-x-3 bg-neon-blue/10 border-2 border-neon-blue/50 rounded-xl px-8 py-4 hover:bg-neon-blue/20 transition-colors group"
                        >
                            <MapPin className="w-6 h-6 text-neon-blue" />
                            <span className="text-lg font-semibold text-white group-hover:text-neon-blue transition-colors">
                                Enter your local hub: <span className="text-neon-blue">Norway 🇳🇴</span>
                            </span>
                        </Link>
                    </div>

                    {/* Quick Access - Featured Countries */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {featuredCountries.map((country: Country) => (
                            <Link
                                key={country.id}
                                href={`/${country.code}`}
                                className="group flex items-center justify-center space-x-3 p-4 bg-noir-panel border border-gray-800 hover:border-neon-blue rounded-lg transition-all"
                            >
                                <span className="text-2xl">{country.flag_emoji}</span>
                                <span className="font-semibold text-white group-hover:text-neon-blue transition-colors">
                                    {country.name}
                                </span>
                            </Link>
                        ))}
                    </div>

                    {/* View All Countries */}
                    <div className="text-center">
                        <details className="inline-block text-left">
                            <summary className="cursor-pointer text-gray-400 hover:text-white transition-colors text-sm">
                                View all {countries?.length || 196} countries →
                            </summary>
                            <div className="mt-4 p-4 bg-noir-panel border border-gray-800 rounded-lg max-h-64 overflow-y-auto">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {countries?.map((country: Country) => (
                                        <Link
                                            key={country.id}
                                            href={`/${country.code}`}
                                            className="flex items-center space-x-2 p-2 hover:bg-gray-800/50 rounded transition-colors text-sm"
                                        >
                                            <span>{country.flag_emoji}</span>
                                            <span className="text-gray-300 hover:text-white truncate">
                                                {country.name}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </details>
                    </div>
                </section>

                {/* Stats */}
                <section className="max-w-5xl mx-auto px-4 py-8">
                    <div className="flex items-center justify-center space-x-8 md:space-x-16">
                        <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 text-neon-blue mb-1">
                                <FileText className="w-5 h-5" />
                                <span className="text-3xl font-bold">{totalPosts || 0}</span>
                            </div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider">Prompts</span>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 text-neon-green mb-1">
                                <Users className="w-5 h-5" />
                                <span className="text-3xl font-bold">{totalUsers || 0}</span>
                            </div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider">Users</span>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 text-white mb-1">
                                <TrendingUp className="w-5 h-5" />
                                <span className="text-3xl font-bold">{totalChannels || 0}</span>
                            </div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider">Channels</span>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 text-yellow-400 mb-1">
                                <Globe className="w-5 h-5" />
                                <span className="text-3xl font-bold">{countries?.length || 0}</span>
                            </div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider">Countries</span>
                        </div>
                    </div>
                </section>

                {/* Global Trending Feed */}
                <section className="max-w-5xl mx-auto px-4 py-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <Flame className="w-6 h-6 text-orange-500" />
                            <h2 className="text-xl font-bold text-white">Global Trending</h2>
                        </div>
                        <Link
                            href="/search?sort=top"
                            className="text-sm text-gray-400 hover:text-neon-blue transition-colors"
                        >
                            View all →
                        </Link>
                    </div>

                    {trendingPosts && trendingPosts.length > 0 ? (
                        <div className="space-y-3">
                            {trendingPosts.map((post, index) => (
                                <Link
                                    key={post.id}
                                    href={`/${post.country_code}/${post.id}`}
                                    className="flex items-center justify-between p-4 bg-noir-panel border border-gray-800 rounded-lg hover:border-neon-blue transition-colors group"
                                >
                                    <div className="flex items-center space-x-4">
                                        <span className="text-2xl font-bold text-gray-600">#{index + 1}</span>
                                        <span className="text-xl">
                                            {Array.isArray(post.countries)
                                                ? post.countries[0]?.flag_emoji
                                                : (post.countries as any)?.flag_emoji}
                                        </span>
                                        <div>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${post.type === 'PROMPT'
                                                ? 'bg-neon-blue/20 text-neon-blue'
                                                : 'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {post.type}
                                            </span>
                                            <p className="text-white group-hover:text-neon-blue transition-colors mt-1 line-clamp-1">
                                                {post.title}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 text-neon-green">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="font-bold">+{post.likes_count}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-noir-panel border border-gray-800 rounded-lg">
                            <p className="text-gray-400 mb-4">No trending posts yet. Be the first!</p>
                            <Link
                                href="/submit"
                                className="inline-flex items-center space-x-2 bg-neon-blue text-noir-bg font-medium px-6 py-3 rounded-lg hover:bg-neon-blue/90 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Create a Post</span>
                            </Link>
                        </div>
                    )}
                </section>

                {/* CTA Section */}
                <section className="max-w-5xl mx-auto px-4 py-12">
                    <div className="text-center p-8 bg-noir-panel border border-gray-800 rounded-xl">
                        <h3 className="text-2xl font-bold text-white mb-4">
                            Ready to share your AI prompts?
                        </h3>
                        <p className="text-gray-400 mb-6 max-w-xl mx-auto">
                            Join the community and help others discover the best AI techniques from around the world.
                        </p>
                        <div className="flex items-center justify-center space-x-4">
                            <Link
                                href="/register"
                                className="bg-neon-blue text-noir-bg font-semibold px-6 py-3 rounded-lg hover:bg-neon-blue/90 transition-colors"
                            >
                                Create Account
                            </Link>
                            <Link
                                href="/c"
                                className="border border-gray-700 text-white font-medium px-6 py-3 rounded-lg hover:bg-gray-800/50 transition-colors"
                            >
                                Browse Channels
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
