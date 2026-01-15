'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Hash } from 'lucide-react';

export default function CreateChannelPage() {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [isNsfw, setIsNsfw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const supabase = createClient();

    const handleNameChange = (value: string) => {
        setName(value);
        setSlug(value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        const { data, error: insertError } = await supabase
            .from('channels')
            .insert({
                name,
                slug,
                description,
                is_nsfw: isNsfw,
                created_by: user.id,
            })
            .select()
            .single();

        if (insertError) {
            setError(insertError.message);
            setLoading(false);
            return;
        }

        router.push(`/c/${data.slug}`);
    };

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <Link href="/c" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Channels
                </Link>

                <div className="bg-noir-panel border border-gray-800 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-neon-blue/20 rounded-lg flex items-center justify-center">
                            <Hash className="w-6 h-6 text-neon-blue" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Create New Channel</h1>
                            <p className="text-gray-400">Build a community around an AI topic</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-white font-medium mb-2">Channel Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="e.g. GPT Prompts"
                                className="w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue"
                                required
                            />
                            {slug && (
                                <p className="text-sm text-gray-500 mt-1">URL: qrydex.com/c/{slug}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-white font-medium mb-2">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What is this channel about?"
                                rows={3}
                                className="w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue"
                                required
                            />
                        </div>

                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                id="nsfw"
                                checked={isNsfw}
                                onChange={(e) => setIsNsfw(e.target.checked)}
                                className="w-5 h-5 rounded bg-noir-bg border-gray-700 text-neon-blue focus:ring-neon-blue"
                            />
                            <label htmlFor="nsfw" className="text-white">
                                Mark as NSFW (18+ content)
                            </label>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !name || !description}
                            className="w-full bg-neon-blue text-noir-bg font-bold py-3 rounded-lg hover:bg-neon-blue/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Channel'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
