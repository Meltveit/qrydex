
'use client';

import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import { STARTUP_CONTENT } from '@/lib/content/StartupContent';
import Link from 'next/link';
import { use } from 'react';

export default function StartupCountryPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = use(params);
    const t = useTranslations('Tools.StartupGuide');

    const countryKey = slug as keyof typeof STARTUP_CONTENT.countries;
    const content = STARTUP_CONTENT.countries[countryKey];

    if (!content) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <Link href="/tools/startup-guide" className="text-sm font-medium text-gray-500 hover:text-blue-600 mb-4 inline-block">
                        ← {t('title')}
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="text-6xl">
                            {content.flag}
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
                                {t('heroTitle').replace('Idé', 'Bedrift')} {t('content.readMore')} {content.name}
                            </h1>
                            <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">
                                Official resources for starting in {content.name}.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">

                {/* OFFICIAL RESOURCES */}
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="text-red-500">🏛️</span> {t('content.resources')}
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        {content.agencies.map((agency, idx) => (
                            <a
                                key={idx}
                                href={agency.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block p-6 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-green-500 hover:shadow-lg transition-all"
                            >
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-green-600 flex items-center justify-between">
                                    {agency.name}
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">{agency.desc}</p>
                            </a>
                        ))}
                    </div>
                </section>

                {/* LOCAL SERVICES */}
                <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8 border border-blue-100 dark:border-blue-800">
                        <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-200 mb-4">
                            Find Local Experts
                        </h2>
                        <p className="text-blue-800 dark:text-blue-300 mb-6">
                            Need help with taxes or legal issues in {content.name}?
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link
                                href={`/search?q=Accountant&country=${slug.toUpperCase()}`}
                                className="px-6 py-3 rounded-lg bg-white text-blue-600 font-semibold shadow-sm hover:shadow-md transition-all"
                            >
                                Find Accountants in {content.name}
                            </Link>
                            <Link
                                href={`/search?q=Laywer&country=${slug.toUpperCase()}`}
                                className="px-6 py-3 rounded-lg bg-white text-blue-600 font-semibold shadow-sm hover:shadow-md transition-all"
                            >
                                Find Lawyers in {content.name}
                            </Link>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
