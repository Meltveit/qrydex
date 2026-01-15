'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

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

interface Comment {
    id: string;
    content: string;
    created_at: string;
    author: {
        username: string;
        avatar_url?: string | null;
    };
    replies?: Comment[];
}

interface CommentSectionProps {
    postId: string;
    comments: Comment[];
    user: any;
}

export function CommentSection({ postId, comments: initialComments, user }: CommentSectionProps) {
    const [comments, setComments] = useState(initialComments);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            router.push('/login');
            return;
        }
        if (!newComment.trim()) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('comments')
                .insert({
                    post_id: postId,
                    content: newComment,
                    author_id: user.id
                })
                .select(`
                    id,
                    content,
                    created_at,
                    profiles:author_id (username, avatar_url)
                `)
                .single();

            if (error) throw error;

            setComments(prev => [{
                ...data,
                author: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
                replies: []
            }, ...prev]);
            setNewComment('');
        } catch (err) {
            console.error('Failed to post comment:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-neon-blue" />
                Comments
            </h3>

            {user ? (
                <form onSubmit={handleSubmit} className="mb-8">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="What are your thoughts?"
                        className="w-full bg-noir-panel border border-gray-700 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue transition-colors min-h-[100px]"
                    />
                    <div className="flex justify-end mt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-neon-blue text-noir-bg font-bold px-6 py-2 rounded-lg hover:bg-neon-blue/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Posting...' : 'Post Comment'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="bg-gray-800/30 rounded-lg p-6 text-center mb-8 border border-gray-700">
                    <p className="text-gray-400 mb-2">Log in to join the conversation</p>
                </div>
            )}

            <div className="space-y-6">
                {comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} />
                ))}
            </div>
        </div>
    );
}

function CommentItem({ comment }: { comment: Comment }) {
    return (
        <div className="flex space-x-3">
            <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {comment.author.username[0].toUpperCase()}
                </div>
            </div>
            <div className="flex-1">
                <div className="bg-noir-panel border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-sm">u/{comment.author.username}</span>
                        <span className="text-xs text-gray-500">
                            {timeAgo(comment.created_at)}
                        </span>
                    </div>
                    <p className="text-gray-300 text-sm">{comment.content}</p>
                </div>
            </div>
        </div>
    );
}
