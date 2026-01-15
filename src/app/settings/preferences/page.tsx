'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Check, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function PreferencesPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-noir-bg">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <Link href="/settings" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Settings
                </Link>

                <h1 className="text-3xl font-bold text-white mb-8">Preferences</h1>

                {/* Theme */}
                <div className="bg-noir-panel border border-gray-800 rounded-xl p-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">Appearance</h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white font-medium">Theme</p>
                            <p className="text-gray-400 text-sm">Choose your preferred theme</p>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${theme === 'dark'
                                        ? 'bg-neon-blue text-noir-bg'
                                        : 'bg-gray-800 text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Moon className="w-4 h-4" />
                                <span>Dark</span>
                            </button>
                            <button
                                onClick={() => setTheme('light')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${theme === 'light'
                                        ? 'bg-neon-blue text-noir-bg'
                                        : 'bg-gray-800 text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Sun className="w-4 h-4" />
                                <span>Light</span>
                            </button>
                        </div>
                    </div>
                </div>

                {message && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg">
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}
