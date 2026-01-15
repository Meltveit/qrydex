'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';

export default function ProfileSettingsPage() {
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) {
                setUsername(profile.username || '');
                setDisplayName(profile.display_name || '');
                setBio(profile.bio || '');
            }
            setLoading(false);
        };
        fetchProfile();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .update({
                username,
                display_name: displayName,
                bio,
            })
            .eq('id', user.id);

        if (error) {
            setMessage(`Error: ${error.message}`);
        } else {
            setMessage('Profile updated successfully!');
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-noir-bg flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <Link href="/settings" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Settings
                </Link>

                <h1 className="text-3xl font-bold text-white mb-8">Profile Settings</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-white font-medium mb-2">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-noir-panel border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-blue"
                        />
                    </div>

                    <div>
                        <label className="block text-white font-medium mb-2">Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-noir-panel border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-blue"
                        />
                    </div>

                    <div>
                        <label className="block text-white font-medium mb-2">Bio</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={4}
                            className="w-full bg-noir-panel border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-blue"
                            placeholder="Tell us about yourself..."
                        />
                    </div>

                    {message && (
                        <div className={`px-4 py-3 rounded-lg ${message.includes('Error')
                                ? 'bg-red-500/10 border border-red-500/50 text-red-400'
                                : 'bg-green-500/10 border border-green-500/50 text-green-400'
                            }`}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center space-x-2 bg-neon-blue text-noir-bg font-bold py-3 rounded-lg hover:bg-neon-blue/90 transition-colors disabled:opacity-50"
                    >
                        <Check className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
