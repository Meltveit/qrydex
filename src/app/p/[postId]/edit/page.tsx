'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader } from 'lucide-react';

export default function EditPostPage() {
    const params = useParams();
    const postId = params.postId as string;
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [post, setPost] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchPost = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data, error } = await supabase
                .from('posts')
                .select(`
                    *,
                    countries:country_id (code)
                `)
                .eq('id', postId)
                .single();

            if (error || !data) {
                setError('Post not found');
                setLoading(false);
                return;
            }

            // Check permission
            let canEdit = data.user_id === user.id;

            if (!canEdit && data.channel_id) {
                const { data: membership } = await supabase
                    .from('channel_members')
                    .select('role')
                    .eq('channel_id', data.channel_id)
                    .eq('user_id', user.id)
                    .single();
                canEdit = membership?.role === 'owner' || membership?.role === 'moderator';
            }

            if (!canEdit) {
                setError('You do not have permission to edit this post');
                setLoading(false);
                return;
            }

            setPost(data);
            setTitle(data.title);
            setContent(data.content);
            setLoading(false);
        };

        fetchPost();
    }, [postId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        const response = await fetch('/api/post/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId: postId,
                title,
                content,
            }),
        });

        if (!response.ok) {
            const data = await response.json();
            setError(data.error || 'Failed to update post');
            setSaving(false);
            return;
        }

        // Redirect back to post
        const countryCode = post.countries?.code;
        if (countryCode) {
            router.push(`/${countryCode}/${postId}`);
        } else {
            router.back();
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setError('');

        const response = await fetch('/api/post/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId }),
        });

        if (!response.ok) {
            const data = await response.json();
            setError(data.error || 'Failed to delete post');
            setDeleting(false);
            setShowDeleteConfirm(false);
            return;
        }

        // Redirect to country page or home
        const countryCode = post.countries?.code;
        if (countryCode) {
            router.push(`/${countryCode}`);
        } else {
            router.push('/');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-noir-bg flex items-center justify-center">
                <Loader className="w-8 h-8 text-neon-blue animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-noir-bg flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">{error}</h1>
                    <button
                        onClick={() => router.back()}
                        className="text-neon-blue hover:underline"
                    >
                        ← Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Cancel
                </button>

                <div className="bg-noir-panel border border-gray-800 rounded-xl p-6">
                    <h1 className="text-2xl font-bold text-white mb-6">Edit Post</h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-blue"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Content
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={12}
                                className="w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-neon-blue font-mono"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
                                {error}
                            </div>
                        )}

                        <div className="flex items-center space-x-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-neon-blue text-noir-bg px-6 py-3 rounded-lg font-bold hover:bg-neon-blue/90 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>

                    {/* Danger Zone */}
                    <div className="mt-8 pt-6 border-t border-red-900/50">
                        <h2 className="text-lg font-bold text-red-400 mb-4">Danger Zone</h2>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                            Delete Post
                        </button>
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-noir-panel border border-gray-800 rounded-xl p-6 max-w-md w-full">
                            <h3 className="text-xl font-bold text-white mb-4">Delete Post?</h3>
                            <p className="text-gray-400 mb-6">
                                Are you sure you want to delete this post? This action cannot be undone.
                                All comments and votes will also be deleted.
                            </p>
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={deleting}
                                    className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
