import { createClient } from '@/lib/supabase/server';
import { PostCard } from '@/components/posts/PostCard';
import Link from 'next/link';
import { JoinCountryButton } from '@/components/country/JoinCountryButton';
import { ArrowLeft, Globe, TrendingUp, Clock, Flame } from 'lucide-react';

interface Props {
    params: Promise<{ country: string }>;
    searchParams: Promise<{ sort?: string }>;
}

export async function generateMetadata({ params }: Props) {
    const { country: countryCode } = await params;
    const supabase = await createClient();

    const { data: country } = await supabase
        .from('countries')
        .select('name, flag_emoji')
        .eq('code', countryCode.toLowerCase())
        .single();

    return {
        title: country ? `${country.flag_emoji} ${country.name} - Qrydex` : 'Country Hub - Qrydex',
        description: country ? `Explore AI prompts and solutions from ${country.name}` : 'Country hub on Qrydex',
    };
}

export default async function CountryPage({ params, searchParams }: Props) {
    const { country: countryCode } = await params;
    const { sort = 'hot' } = await searchParams;
    const supabase = await createClient();

    // Fetch country info
    const { data: country } = await supabase
        .from('countries')
        .select('*')
        .eq('code', countryCode.toLowerCase())
        .single();

    if (!country) {
        return (
            <div className="min-h-screen bg-noir-bg flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-4">Country Not Found</h1>
                    <p className="text-gray-400 mb-8">This country hub doesn't exist yet.</p>
                    <Link href="/" className="text-neon-blue hover:underline">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    // Fetch posts for this country
    // Check if user is subscribed
    const { data: { user } } = await supabase.auth.getUser();
    let isSubscribed = false;
    if (user) {
        const { data: subscription } = await supabase
            .from('country_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('country_id', country.id)
            .single();
        isSubscribed = !!subscription;
    }

    let query = supabase
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
            countries:country_id (code)
        `)
        .eq('country_id', country.id)
        .is('channel_id', null);

    // Apply sorting
    if (sort === 'new') {
        query = query.order('created_at', { ascending: false });
    } else if (sort === 'top') {
        query = query.order('likes_count', { ascending: false });
    } else {
        // Hot = combination of recency and votes
        query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
    }

    const { data: posts } = await query.limit(50);

    const sortOptions = [
        { value: 'hot', label: 'Hot', icon: Flame },
        { value: 'new', label: 'New', icon: Clock },
        { value: 'top', label: 'Top', icon: TrendingUp },
    ];

    return (
        <div className="min-h-screen bg-noir-bg">
            {/* Country Header */}
            <div className="bg-noir-panel border-b border-gray-800">
                <div className="max-w-5xl mx-auto px-4 py-8">
                    <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Global
                    </Link>

                    <div className="flex items-center space-x-4">
                        <span className="text-6xl">{country.flag_emoji}</span>
                        <div>
                            <h1 className="text-3xl font-bold text-white">{country.name}</h1>
                            <p className="text-gray-400">{country.native_name}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sort Options */}
            <div className="max-w-5xl mx-auto px-4 py-4">
                <div className="flex items-center space-x-2">
                    {sortOptions.map((option) => (
                        <Link
                            key={option.value}
                            href={`/${countryCode}?sort=${option.value}`}
                            className={`flex items-center space-x-1 px-4 py-2 rounded-lg font-medium transition-colors ${sort === option.value
                                ? 'bg-neon-blue text-noir-bg'
                                : 'bg-gray-800 text-gray-400 hover:text-white'
                                }`}
                        >
                            <option.icon className="w-4 h-4" />
                            <span>{option.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Posts */}
            <div className="max-w-5xl mx-auto px-4 py-4">
                {posts && posts.length > 0 ? (
                    <div className="space-y-4">
                        {posts.map((post: any) => (
                            <PostCard
                                key={post.id}
                                post={{
                                    ...post,
                                    author: post.profiles,
                                    country_code: post.countries?.code || countryCode,
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-noir-panel rounded-xl border border-gray-800">
                        <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">No posts yet</h2>
                        <p className="text-gray-400 mb-6">Be the first to share a prompt or request in {country.name}!</p>
                        <Link
                            href={`/submit?country=${countryCode}`}
                            className="inline-block bg-neon-blue text-noir-bg font-bold px-6 py-3 rounded-lg hover:bg-neon-blue/90 transition-colors"
                        >
                            Create Post
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
