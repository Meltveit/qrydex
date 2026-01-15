'use client';

import Link from 'next/link';
import { Globe, Menu, X, Plus, LogIn } from 'lucide-react';
import { useState, Suspense } from 'react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { SearchBar } from '@/components/common/SearchBar';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-noir-bg/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <Globe className="w-8 h-8 text-neon-blue" />
                        <span className="text-xl font-bold text-white hidden sm:block">QRYDEX</span>
                    </Link>

                    {/* Search Bar - Desktop */}
                    <div className="flex-1 max-w-xl mx-8 hidden md:block">
                        <Suspense fallback={<div className="w-full h-10 bg-gray-800 rounded-lg animate-pulse" />}>
                            <SearchBar />
                        </Suspense>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-4">
                        <Link
                            href="/c"
                            className={`text-sm font-medium transition-colors ${pathname.startsWith('/c') ? 'text-neon-blue' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Channels
                        </Link>

                        {user ? (
                            <>
                                <Link
                                    href="/submit"
                                    className="flex items-center space-x-1 bg-neon-blue text-noir-bg px-4 py-2 rounded-lg font-bold hover:bg-neon-blue/90 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Post</span>
                                </Link>
                                <Link
                                    href="/settings"
                                    className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                                >
                                    Settings
                                </Link>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="flex items-center space-x-1 border border-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                <LogIn className="w-4 h-4" />
                                <span>Log in</span>
                            </Link>
                        )}

                        <ThemeToggle />
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 text-gray-400 hover:text-white"
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-gray-800 bg-noir-panel">
                    <div className="px-4 py-4 space-y-4">
                        <SearchBar />
                        <nav className="flex flex-col space-y-3">
                            <Link
                                href="/c"
                                className="text-gray-400 hover:text-white transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Browse Channels
                            </Link>
                            {user ? (
                                <>
                                    <Link
                                        href="/submit"
                                        className="text-neon-blue font-bold"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Post to Index
                                    </Link>
                                    <Link
                                        href="/settings"
                                        className="text-gray-400 hover:text-white"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Settings
                                    </Link>
                                </>
                            ) : (
                                <Link
                                    href="/login"
                                    className="text-white font-medium"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Log in
                                </Link>
                            )}
                        </nav>
                        <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
                            <span className="text-sm text-gray-500">Theme</span>
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
