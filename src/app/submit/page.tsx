'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';

function SubmitForm() {
    const searchParams = useSearchParams();
    const [type, setType] = useState<'PROMPT' | 'REQUEST'>('PROMPT');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [aiModel, setAiModel] = useState('');
    const [countryCode, setCountryCode] = useState('');
    const [countries, setCountries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const supabase = createClient();

    // Check if posting to a channel
    const channelId = searchParams.get('channel');
    const isChannelPost = !!channelId;

    useEffect(() => {
        const fetchCountries = async () => {
            const { data } = await supabase
                .from('countries')
                .select('code, name, flag_emoji')
                .eq('is_active', true)
                .order('name');
            if (data) setCountries(data);

            // For channel posts, use 'global' as default
            if (isChannelPost) {
                setCountryCode('global');
            } else {
                // Pre-select country from URL if provided
                const urlCountry = searchParams.get('country');
                if (urlCountry && data?.some(c => c.code === urlCountry)) {
                    setCountryCode(urlCountry);
                }
            }
        };
        fetchCountries();
    }, [searchParams, isChannelPost]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        // Get country_id from country code
        const { data: country } = await supabase
            .from('countries')
            .select('id')
            .eq('code', countryCode)
            .single();

        if (!country) {
            setError('Invalid country selected');
            setLoading(false);
            return;
        }

        // If posting to a channel, check membership
        if (channelId) {
            const { data: membership } = await supabase
                .from('channel_members')
                .select('role')
                .eq('channel_id', channelId)
                .eq('user_id', user.id)
                .single();

            if (!membership) {
                setError('You must be a member of this channel to post.');
                setLoading(false);
                return;
            }
        }

        const { data, error: insertError } = await supabase
            .from('posts')
            .insert({
                title,
                content,
                type,
                country_id: country.id,
                user_id: user.id,
                ai_model: aiModel || null,
                channel_id: channelId || null,
            })
            .select()
            .single();

        if (insertError) {
            setError(insertError.message);
            setLoading(false);
            return;
        }

        // Redirect to appropriate page
        if (channelId) {
            // If posting to channel, get channel slug and redirect there
            const { data: channelData } = await supabase
                .from('channels')
                .select('slug')
                .eq('id', channelId)
                .single();

            if (channelData) {
                router.push(`/c/${channelData.slug}`);
            } else {
                router.push(`/${countryCode}/${data.id}`);
            }
        } else {
            // Regular country post
            router.push(`/${countryCode}/${data.id}`);
        }
    };

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                </Link>

                <div className="bg-noir-panel border border-gray-800 rounded-xl p-6">
                    <h1 className="text-2xl font-bold text-white mb-6">Submit to the Index</h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Type Selection */}
                        <div>
                            <label className="block text-white font-medium mb-2">Post Type</label>
                            <div className="flex space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setType('PROMPT')}
                                    className={`flex-1 py-3 rounded-lg font-bold transition-colors ${type === 'PROMPT'
                                        ? 'bg-neon-blue text-noir-bg'
                                        : 'bg-gray-800 text-gray-400 hover:text-white'
                                        }`}
                                >
                                    🎯 PROMPT
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('REQUEST')}
                                    className={`flex-1 py-3 rounded-lg font-bold transition-colors ${type === 'REQUEST'
                                        ? 'bg-yellow-500 text-noir-bg'
                                        : 'bg-gray-800 text-gray-400 hover:text-white'
                                        }`}
                                >
                                    ❓ REQUEST
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                {type === 'PROMPT'
                                    ? 'Share an AI prompt, query, or solution'
                                    : 'Ask the community for a specific prompt or solution'}
                            </p>
                        </div>

                        {/* Country Selection - Hidden for channel posts */}
                        {!isChannelPost && (
                            <div>
                                <label className="block text-white font-medium mb-2">Country Hub</label>
                                <select
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-blue"
                                    required
                                >
                                    <option value="">Select a country...</option>
                                    {countries.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.flag_emoji} {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Channel Context Message */}
                        {isChannelPost && (
                            <div className="bg-neon-blue/10 border border-neon-blue/50 rounded-lg p-4">
                                <p className="text-neon-blue text-sm font-medium">
                                    📢 Posting to channel
                                </p>
                            </div>
                        )}

                        {/* Title */}
                        <div>
                            <label className="block text-white font-medium mb-2">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="A descriptive title for your post"
                                className="w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue"
                                required
                            />
                        </div>

                        {/* AI Model (Optional) */}
                        <div>
                            <label className="block text-white font-medium mb-2">
                                AI Model <span className="text-gray-500 text-sm">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                value={aiModel}
                                onChange={(e) => setAiModel(e.target.value)}
                                placeholder="e.g., GPT-4, Claude, Gemini, etc."
                                className="w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue"
                            />
                            <p className="text-xs text-gray-500 mt-1">Tag which AI model you used (optional)</p>
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-white font-medium mb-2">
                                {type === 'PROMPT' ? 'Your Prompt' : 'Your Request'}
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={type === 'PROMPT'
                                    ? 'Paste your AI prompt here...'
                                    : 'Describe what you need help with...'}
                                rows={8}
                                className={`w-full bg-noir-bg border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-blue ${type === 'PROMPT' ? 'font-mono' : ''
                                    }`}
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !title || !content || !countryCode}
                            className="w-full flex items-center justify-center space-x-2 bg-neon-blue text-noir-bg font-bold py-3 rounded-lg hover:bg-neon-blue/90 transition-colors disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                            <span>{loading ? 'Submitting...' : 'Submit to Index'}</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function SubmitPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-noir-bg flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full"></div>
            </div>
        }>
            <SubmitForm />
        </Suspense>
    );
}
