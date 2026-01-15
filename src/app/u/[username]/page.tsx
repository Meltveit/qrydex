import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { User, FileText, TrendingUp } from 'lucide-react';

interface Props {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props) {
    const { username } = await params;
    return {
        title: `u/${username} - Qrydex`,
        description: `Profile of ${username} on Qrydex`,
    };
}

export default async function UserProfilePage({ params }: Props) {
    const { username } = await params;
    const supabase = await createClient();

    // Fetch user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

    if (!profile) {
        return (
            <div className="min-h-screen bg-noir-bg flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-white mb-4">User Not Found</h1>
                    <p className="text-gray-400 mb-8">This user doesn't exist.</p>
                    <Link href="/" className="text-neon-blue hover:underline">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    // Fetch user's posts
    const { data: posts } = await supabase
        .from('posts')
        .select('id, title, type, country_code, likes_count, created_at')
        .eq('author_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

    return (
        <div className="min-h-screen bg-noir-bg">
            {/* Profile Header */}
            <div className="bg-noir-panel border-b border-gray-800">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="flex items-center space-x-6">
                        <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center">
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.username}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <span className="text-4xl font-bold text-white">
                                    {profile.username[0].toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">u/{profile.username}</h1>
                            {profile.bio && <p className="text-gray-400 mt-1">{profile.bio}</p>}
                            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                                <div className="flex items-center">
                                    <FileText className="w-4 h-4 mr-1" />
                                    {posts?.length || 0} posts
                                </div>
                                <div className="flex items-center">
                                    <TrendingUp className="w-4 h-4 mr-1" />
                                    {profile.karma || 0} karma
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* User's Posts */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h2 className="text-xl font-bold text-white mb-6">Recent Posts</h2>

                {posts && posts.length > 0 ? (
                    <div className="space-y-4">
                        {posts.map((post: any) => (
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
                                <span className="text-gray-500 text-sm ml-2">• {post.likes_count} likes</span>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-noir-panel rounded-xl border border-gray-800">
                        <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No posts yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}
