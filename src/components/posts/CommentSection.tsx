'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
    user_id: string;
    parent_id?: string | null;
    author: {
        username: string;
        display_name?: string;
        avatar_url?: string;
    };
    replies?: Comment[];
}

interface CommentSectionProps {
    postId: string;
    comments: Comment[];
    user: any;
    postAuthorId: string;
    channelId?: string | null;
}

export function CommentSection({ postId, comments: initialComments, user, postAuthorId, channelId }: CommentSectionProps) {
    const [comments, setComments] = useState(initialComments);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [channelRoles, setChannelRoles] = useState<Map<string, string>>(new Map());
    const supabase = createClient();
    const router = useRouter();

    // Fetch channel roles if post is in a channel
    useEffect(() => {
        if (channelId && user) {
            const fetchChannelRoles = async () => {
                const { data } = await supabase
                    .from('channel_members')
                    .select('user_id, role')
                    .eq('channel_id', channelId);

                if (data) {
                    const rolesMap = new Map(data.map(m => [m.user_id, m.role]));
                    setChannelRoles(rolesMap);
                }
            };
            fetchChannelRoles();
        }
    }, [channelId, user]);

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
                    user_id: user.id
                })
                .select(`
                    id,
                    content,
                    created_at,
                    user_id,
                    profiles:user_id (username, display_name, avatar_url)
                `)
                .single();

            if (error) throw error;

            setComments(prev => [{
                id: data.id,
                content: data.content,
                created_at: data.created_at,
                user_id: data.user_id,
                parent_id: null,
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

    const handleReply = async (parentId: string) => {
        if (!user) {
            router.push('/login');
            return;
        }
        if (!replyContent.trim()) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('comments')
                .insert({
                    post_id: postId,
                    content: replyContent,
                    user_id: user.id,
                    parent_id: parentId,
                })
                .select(`
                    id,
                    content,
                    created_at,
                    user_id,
                    parent_id,
                    profiles:user_id (username, display_name, avatar_url)
                `)
                .single();

            if (error) throw error;

            // Refresh comments to show new reply
            router.refresh();
            setReplyContent('');
            setReplyingTo(null);
        } catch (err) {
            console.error('Failed to post reply:', err);
        } finally {
            setLoading(false);
        }
    };

    // Organize comments into tree structure
    const organizeComments = (flatComments: Comment[]): Comment[] => {
        const map = new Map<string, Comment>();
        const roots: Comment[] = [];

        // Initialize map
        flatComments.forEach(comment => {
            comment.replies = [];
            map.set(comment.id, comment);
        });

        // Build tree
        flatComments.forEach(comment => {
            if (comment.parent_id) {
                const parent = map.get(comment.parent_id);
                if (parent) {
                    parent.replies!.push(comment);
                } else {
                    roots.push(comment); // Orphaned comment
                }
            } else {
                roots.push(comment);
            }
        });

        return roots;
    };

    const organizedComments = organizeComments(comments);

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
                {organizedComments.map((comment) => (
                    <CommentItem
                        key={comment.id}
                        comment={comment}
                        postAuthorId={postAuthorId}
                        channelRoles={channelRoles}
                        replyingTo={replyingTo}
                        setReplyingTo={setReplyingTo}
                        replyContent={replyContent}
                        setReplyContent={setReplyContent}
                        handleReply={handleReply}
                        loading={loading}
                        depth={0}
                    />
                ))}
            </div>
        </div>
    );
}

// Enhanced CommentItem with role badges and nested replies
interface CommentItemProps {
    comment: Comment;
    postAuthorId: string;
    channelRoles: Map<string, string>;
    replyingTo: string | null;
    setReplyingTo: (id: string | null) => void;
    replyContent: string;
    setReplyContent: (content: string) => void;
    handleReply: (parentId: string) => void;
    loading: boolean;
    depth: number;
}

function CommentItem({
    comment,
    postAuthorId,
    channelRoles,
    replyingTo,
    setReplyingTo,
    replyContent,
    setReplyContent,
    handleReply,
    loading,
    depth
}: CommentItemProps) {
    const maxDepth = 3;
    const isOP = comment.user_id === postAuthorId;
    const channelRole = channelRoles.get(comment.user_id);
    const isAdmin = channelRole === 'owner';
    const isMod = channelRole === 'moderator';

    return (
        <div className={`${depth > 0 ? 'ml-8 mt-4 border-l-2 border-gray-800 pl-4' : ''}`}>
            <div className="flex space-x-3">
                <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        {comment.author?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                </div>
                <div className="flex-1">
                    <div className="bg-noir-panel border border-gray-800 rounded-lg p-4">
                        <div className="flex items-center space-x-2 text-sm mb-2 flex-wrap">
                            <Link
                                href={`/u/${comment.author?.username || 'deleted'}`}
                                className="font-bold text-white hover:text-neon-blue"
                            >
                                {comment.author?.display_name || `u/${comment.author?.username}` || 'deleted user'}
                            </Link>

                            {/* Role Badges */}
                            {isOP && (
                                <span className="text-xs px-2 py-0.5 rounded border bg-neon-blue/20 text-neon-blue border-neon-blue">
                                    OP
                                </span>
                            )}
                            {isAdmin && (
                                <span className="text-xs px-2 py-0.5 rounded border bg-red-500/20 text-red-400 border-red-500">
                                    ADMIN
                                </span>
                            )}
                            {isMod && !isAdmin && (
                                <span className="text-xs px-2 py-0.5 rounded border bg-purple-500/20 text-purple-400 border-purple-500">
                                    MOD
                                </span>
                            )}

                            <span className="text-gray-500">•</span>
                            <span className="text-gray-500">{timeAgo(comment.created_at)}</span>
                        </div>
                        <p className="text-gray-300 text-sm">{comment.content}</p>

                        {/* Reply Button */}
                        {depth < maxDepth && (
                            <button
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                className="text-xs text-gray-500 hover:text-neon-blue mt-2"
                            >
                                Reply
                            </button>
                        )}
                    </div>

                    {/* Reply Form */}
                    {replyingTo === comment.id && (
                        <div className="mt-3 bg-noir-bg border border-gray-800 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-2">
                                Replying to @{comment.author?.username}
                            </p>
                            <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Write your reply..."
                                rows={3}
                                className="w-full bg-noir-panel border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-neon-blue"
                            />
                            <div className="flex justify-end space-x-2 mt-2">
                                <button
                                    onClick={() => setReplyingTo(null)}
                                    className="text-xs text-gray-400 hover:text-white px-3 py-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleReply(comment.id)}
                                    disabled={loading || !replyContent.trim()}
                                    className="text-xs bg-neon-blue text-noir-bg px-3 py-1 rounded-lg hover:bg-neon-blue/90 disabled:opacity-50"
                                >
                                    {loading ? 'Posting...' : 'Post Reply'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Nested Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-4 space-y-4">
                            {comment.replies.map((reply) => (
                                <CommentItem
                                    key={reply.id}
                                    comment={reply}
                                    postAuthorId={postAuthorId}
                                    channelRoles={channelRoles}
                                    replyingTo={replyingTo}
                                    setReplyingTo={setReplyingTo}
                                    replyContent={replyContent}
                                    setReplyContent={setReplyContent}
                                    handleReply={handleReply}
                                    loading={loading}
                                    depth={depth + 1}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
