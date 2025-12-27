'use client';

import { Link } from '@/i18n/routing';
import ThemeToggle from './ThemeToggle';

export default function Footer() {
    return (
        <footer className="mt-auto py-8 md:py-10 px-4 md:px-6 border-t border-[var(--color-border)] dark:border-slate-800 bg-[var(--color-surface)] dark:bg-slate-900">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 text-sm text-[var(--color-text-secondary)] dark:text-gray-400">

                {/* Left: Branding & Verification */}
                <div className="flex flex-col items-center md:items-start gap-2">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-verified)] dark:bg-green-400" />
                        <span className="font-medium text-[var(--color-text)] dark:text-gray-200">Qrydex Index</span>
                    </div>
                    <p className="text-xs text-center md:text-left dark:text-gray-500">Alle bedrifter verifisert mot offisielle registre</p>
                </div>

                {/* Center: Legal Links */}
                <nav className="flex gap-6 md:gap-8">
                    <Link
                        href="/personvern"
                        className="hover:text-[var(--color-primary)] dark:hover:text-blue-400 transition-colors p-2 -m-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                        Personvern & Cookies
                    </Link>
                    {/* Add more links here later like 'Om oss' */}
                </nav>

                {/* Right: Actions */}
                <div className="flex items-center gap-4 md:gap-6">
                    <ThemeToggle />
                    <span className="text-xs text-gray-400 dark:text-gray-600">© {new Date().getFullYear()} Qrydex</span>
                </div>
            </div>
        </footer>
    );
}
