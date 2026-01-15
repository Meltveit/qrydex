'use client';

import Link from 'next/link';
import { Clock, TrendingUp, MessageSquare } from 'lucide-react';
import { VoteButtons } from '@/components/common/VoteButtons';

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

interface PostCardProps {
    post: {
        id: string;
        title: string;
        content: string;
        type: 'PROMPT' | 'REQUEST';
        created_at: string;
        likes_count: number;
        comments_count: number;
        country_code: string;
        // Handle both author (aliased) and profiles (direct join)
        author?: {
            username: string;
            display_name?: string;
            avatar_url?: string;
        };
        profiles?: {
            username: string;
            display_name?: string;
            avatar_url?: string;
        };
        channel?: {
            name: string;
            slug: string;
        };
    };
    showChannel?: boolean;
}

export function PostCard({ post, showChannel = true }: PostCardProps) {
    const postUrl = `/${post.country_code}/${post.id}`;
    const author = post.author || post.profiles;

    return (
        <article className="bg-noir-panel border border-gray-800 rounded-xl p-4 hover:border-neon-blue transition-colors group">
            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                {showChannel && post.channel && (
                    <>
                        <Link href={`/c/${post.channel.slug}`} className="font-bold text-gray-300 hover:text-white">
                            c/{post.channel.name}
                        </Link>
                        <span>•</span>
                    </>
                )}
                <span className="flex items-center text-gray-500">
                    <span className="mr-1">Posted by</span>
                    <Link href={`/u/${author?.username || 'deleted'}`} className="hover:text-white transition-colors">
                        {author?.display_name || `u/${author?.username}` || 'deleted user'}
                    </Link>
                </span>
                <span>•</span>
                <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {timeAgo(post.created_at)}
                </span>
            </div>

            <div className="mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${post.type === 'PROMPT'
                    ? 'bg-neon-blue/20 text-neon-blue'
                    : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                    {post.type}
                </span>
            </div>

            <Link href={postUrl} className="block group-hover:text-neon-blue transition-colors">
                <h3 className="text-xl font-bold text-white mb-2">{post.title}</h3>
            </Link>

            <div className={`text-gray-300 text-sm mb-4 line-clamp-3 ${post.type === 'PROMPT' ? 'font-mono bg-noir-bg/50 p-3 rounded border border-gray-800' : ''
                }`}>
                {post.content}
            </div>

            <div className="flex items-center justify-between border-t border-gray-800 pt-3">
                <div className="flex items-center space-x-4">
                    <VoteButtons postId={post.id} initialLikes={post.likes_count} />

                    <Link href={postUrl} className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors bg-gray-800/50 rounded-lg px-3 py-1.5">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-sm font-medium">{post.comments_count} Comments</span>
                    </Link>
                </div>
            </div>
        </article>
    );
}
