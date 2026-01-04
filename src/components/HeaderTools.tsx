'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import IPCalculatorModal from './tools/IPCalculatorModal';

export default function HeaderTools() {
    const t = useTranslations('Tools');
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div className={`fixed top-4 right-4 md:top-6 md:right-6 z-[100] ${usePathname().includes('/business/') ? 'hidden' : ''}`}>
                <div className="relative z-[95]">
                    {/* Trigger Button - Bento / Grid Icon */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all shadow-sm group"
                        aria-label={t('title')}
                    >
                        <div className="grid grid-cols-2 gap-0.5 w-5 h-5">
                            <span className="bg-gray-600 dark:bg-gray-400 rounded-[1px] group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors"></span>
                            <span className="bg-gray-600 dark:bg-gray-400 rounded-[1px] group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors"></span>
                            <span className="bg-gray-600 dark:bg-gray-400 rounded-[1px] group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors"></span>
                            <span className="bg-gray-600 dark:bg-gray-400 rounded-[1px] group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors"></span>
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {isOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-2">
                                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-3 py-2 block uppercase tracking-wider">
                                    {t('title')}
                                </span>
                                <Link
                                    href="/tools/ip-calculator"
                                    onClick={() => setIsOpen(false)}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"
                                >
                                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                        </svg>
                                    </div>
                                    {t('ipCalculator')}
                                </Link>
                                <Link
                                    href="/tools/bandwidth-calculator"
                                    onClick={() => setIsOpen(false)}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"
                                >
                                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    {t('bandwidthCalc')}
                                </Link>

                                <Link
                                    href="/tools/startup-guide"
                                    onClick={() => setIsOpen(false)}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"
                                >
                                    <div className="p-1.5 bg-yellow-50 dark:bg-yellow-900/30 rounded-md text-yellow-600 dark:text-yellow-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    {t('startupGuide')}
                                </Link>

                                <Link
                                    href="/tools/dns-lookup"
                                    onClick={() => setIsOpen(false)}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"
                                >
                                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                        </svg>
                                    </div>
                                    DNS Lookup
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Overlay for clicking outside */}
                {isOpen && (
                    <div
                        className="fixed inset-0 z-[90] bg-transparent"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </div>

            {/* Modals - Removed as we now link to dedicated pages */}
        </>
    );
}
