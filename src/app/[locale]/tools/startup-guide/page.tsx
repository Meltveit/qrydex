
'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function StartupGuideHub() {
    const t = useTranslations('Tools.StartupGuide');

    const topics = [
        { id: 'validation', emoji: '🧪', color: 'blue' },
        { id: 'prototyping', emoji: '🛠️', color: 'indigo' },
        { id: 'funding', emoji: '💰', color: 'green' },
        { id: 'starting', emoji: '🏢', color: 'purple' },
        { id: 'sourcing', emoji: '🚢', color: 'orange' },
        { id: 'distribution', emoji: '🚚', color: 'teal' },
    ];

    const countries = [
        { code: 'no', flag: '🇳🇴', name: 'Norge' },
        { code: 'se', flag: '🇸🇪', name: 'Sverige' },
        { code: 'dk', flag: '🇩🇰', name: 'Danmark' },
        { code: 'uk', flag: '🇬🇧', name: 'UK' },
        { code: 'us', flag: '🇺🇸', name: 'USA' },
        { code: 'de', flag: '🇩🇪', name: 'Tyskland' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20">
            {/* Hero */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-6">
                        {t('heroTitle')}
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        {t('heroSubtitle')}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

                {/* Section 1: Phase / Topic */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm">1</span>
                    {t('sections.byTopic')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {topics.map((topic) => (
                        <Link
                            key={topic.id}
                            href={`/tools/startup-guide/topic/${topic.id}`}
                            className={`group p-8 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-all hover:-translate-y-1 relative overflow-hidden`}
                        >
                            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                                <span className="text-9xl">{topic.emoji}</span>
                            </div>
                            <div className="relative z-10">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-6 bg-${topic.color}-50 dark:bg-${topic.color}-900/20 text-${topic.color}-600`}>
                                    {topic.emoji}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    {t(`topics.${topic.id}.title`)}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {t(`topics.${topic.id}.desc`)}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Section 2: Country */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 text-sm">2</span>
                    {t('sections.byCountry')}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {countries.map((c) => (
                        <Link
                            key={c.code}
                            href={`/tools/startup-guide/country/${c.code}`}
                            className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all text-center group"
                        >
                            <span className="text-4xl mb-3 block group-hover:scale-110 transition-transform duration-300">{c.flag}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{c.name}</span>
                        </Link>
                    ))}
                </div>

            </div>
        </div>
    );
}
