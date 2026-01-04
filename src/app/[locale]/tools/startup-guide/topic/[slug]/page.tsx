
'use client';

import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import { STARTUP_CONTENT } from '@/lib/content/StartupContent';
import Link from 'next/link';
import { use } from 'react';

// For Next.js 15, params is a Promise
export default function StartupTopicPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = use(params);
    const t = useTranslations('Tools.StartupGuide');

    // Type-safe lookup
    const topicKey = slug as keyof typeof STARTUP_CONTENT.topics;
    const content = STARTUP_CONTENT.topics[topicKey];

    if (!content) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20">
            {/* Breadcrumbish Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <Link href="/tools/startup-guide" className="text-sm font-medium text-gray-500 hover:text-blue-600 mb-4 inline-block">
                        ← {t('title')}
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl bg-${content.color}-50 dark:bg-${content.color}-900/20 text-${content.color}-600`}>
                            {content.icon}
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                                {t(`topics.${slug}.title`)}
                            </h1>
                            <p className="text-lg text-gray-500 dark:text-gray-400">
                                {t(`topics.${slug}.desc`)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">

                {/* ACTION STEPS */}
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="text-blue-600">⚡</span> Action Plan
                    </h2>
                    <div className="relative border-l-2 border-gray-200 dark:border-slate-700 ml-3 space-y-8 pl-8 pb-4">
                        {content.steps.map((step, idx) => (
                            <div key={idx} className="relative">
                                {/* Dot */}
                                <span className={`absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-${content.color}-100 dark:bg-${content.color}-900 border-2 border-${content.color}-500 flex items-center justify-center text-xs font-bold text-${content.color}-700 dark:text-${content.color}-300`}>
                                    {idx + 1}
                                </span>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                                    {step.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* SEARCH TOOLS */}
                <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-200 dark:border-slate-700 shadow-xl">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="text-blue-600">🔍</span> {t('content.findSuppliers')}
                        </h2>
                        <p className="text-gray-500 mb-6">Use Qrydex to find verified partners instantly.</p>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {content.searches.map((search, idx) => (
                                <Link
                                    key={idx}
                                    href={`/search?q=${encodeURIComponent(search.query)}`}
                                    className={`group flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50 hover:bg-blue-600 hover:text-white transition-all border border-gray-100 dark:border-slate-600 hover:shadow-lg`}
                                >
                                    <span className="font-semibold group-hover:text-white">{search.label}</span>
                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-white transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
