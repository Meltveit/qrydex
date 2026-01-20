'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { FileText, MessageSquare, Loader } from 'lucide-react';
import { useEffect } from 'react';

interface ProfileTabsProps {
    profileId: string;
}

export function ProfileTabs({ profileId }: ProfileTabsProps) {
    const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts');
    const [posts, setPosts] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            if (activeTab === 'posts') {
                const { data } = await supabase
                    .from('posts')
                    .select(`
                        id,
                        short_id,
                        slug,
                        title,
                        type,
                        likes_count,
                        created_at,
                        countries:country_id (code)
                    `)
                    .eq('user_id', profileId)
                    .order('created_at', { ascending: false })
                    .limit(20);
                setPosts(data || []);
            } else {
                const { data } = await supabase
                    .from('comments')
                    .select(`
                        id,
                        content,
                        created_at,
                        posts:post_id (id, short_id, slug, title, countries:country_id (code))
                    `)
                    .eq('user_id', profileId)
                    .order('created_at', { ascending: false })
                    .limit(20);
                setComments(data || []);
            }
            setLoading(false);
        };

        fetchData();
    }, [activeTab, profileId]);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Tabs */}
            <div className="flex items-center space-x-4 border-b border-gray-800 mb-6">
                <button
                    onClick={() => setActiveTab('posts')}
                    className={`flex items-center space-x-2 pb-4 px-2 border-b-2 transition-colors ${activeTab === 'posts'
                        ? 'border-neon-blue text-white'
                        : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    <span>Posts</span>
                </button>
                <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex items-center space-x-2 pb-4 px-2 border-b-2 transition-colors ${activeTab === 'comments'
                        ? 'border-neon-blue text-white'
                        : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>Comments</span>
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader className="w-8 h-8 text-neon-blue animate-spin" />
                </div>
            ) : activeTab === 'posts' ? (
                posts.length > 0 ? (
                    <div className="space-y-4">
                        {posts.map((post) => {
                            const country = Array.isArray(post.countries) ? post.countries[0] : post.countries;
                            const postId = post.short_id || post.id;
                            const postSlug = post.slug ? `/${post.slug}` : '';
                            return (
                                <Link
                                    key={post.id}
                                    href={`/${country?.code}/${postId}${postSlug}`}
                                    className="block bg-noir-panel border border-gray-800 rounded-lg p-4 hover:border-neon-blue transition-colors"
                                >
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded mr-2 ${post.type === 'PROMPT'
                                        ? 'bg-neon-blue/20 text-neon-blue'
                                        : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {post.type}
                                    </span>
                                    <span className="text-white font-medium">{post.title}</span>
                                    <span className="text-gray-500 text-sm ml-2">• {post.likes_count} likes</span>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-noir-panel rounded-xl border border-gray-800">
                        <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No posts yet</p>
                    </div>
                )
            ) : (
                comments.length > 0 ? (
                    <div className="space-y-4">
                        {comments.map((comment) => {
                            const post = Array.isArray(comment.posts) ? comment.posts[0] : comment.posts;
                            const country = post?.countries ? (Array.isArray(post.countries) ? post.countries[0] : post.countries) : null;
                            const postId = post?.short_id || post?.id;
                            const postSlug = post?.slug ? `/${post.slug}` : '';
                            return (
                                <div key={comment.id} className="bg-noir-panel border border-gray-800 rounded-lg p-4">
                                    <p className="text-gray-300 text-sm mb-2">{comment.content}</p>
                                    <Link
                                        href={`/${country?.code}/${postId}${postSlug}`}
                                        className="text-sm text-gray-500 hover:text-neon-blue"
                                    >
                                        on: {post?.title}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-noir-panel rounded-xl border border-gray-800">
                        <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No comments yet</p>
                    </div>
                )
            )}
        </div>
    );
}
