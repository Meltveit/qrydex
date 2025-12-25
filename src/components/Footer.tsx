'use client';

import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Footer() {
    return (
        <footer className="mt-auto py-8 px-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--color-text-secondary)]">

                {/* Left: Branding & Verification */}
                <div className="flex flex-col items-center md:items-start gap-1">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-verified)]" />
                        <span className="font-medium text-[var(--color-text)]">Qrydex Index</span>
                    </div>
                    <p className="text-xs">Alle bedrifter verifisert mot offisielle registre</p>
                </div>

                {/* Center: Legal Links */}
                <nav className="flex gap-6">
                    <Link href="/personvern" className="hover:text-[var(--color-primary)] transition-colors">
                        Personvern & Cookies
                    </Link>
                    {/* Add more links here later like 'Om oss' */}
                </nav>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <span className="text-xs text-gray-400">© {new Date().getFullYear()} Qrydex</span>
                </div>
            </div>
        </footer>
    );
}
