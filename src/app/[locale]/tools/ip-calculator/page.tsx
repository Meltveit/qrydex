'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function IPCalculatorPage() {
    const t = useTranslations('Tools');
    const [ipData, setIpData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIp = async () => {
            try {
                const res = await fetch('https://ipapi.co/json/');
                if (res.ok) {
                    const data = await res.json();
                    setIpData(data);
                }
            } catch (error) {
                console.error('IP calculation failed', error);
            } finally {
                setLoading(false);
            }
        };

        fetchIp();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors mb-4"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        {t('close')}
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('ipCalculator')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                        {t('whyCheckIpText')}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-8 md:p-12 text-center border-b border-gray-100 dark:border-slate-700 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-slate-800 dark:to-slate-800">
                        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">
                            {t('myIpTitle')}
                        </h2>

                        {loading ? (
                            <div className="h-16 w-64 mx-auto bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                        ) : (
                            <div className="relative inline-block">
                                <div className="text-5xl md:text-7xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 tracking-tight">
                                    {ipData?.ip || '---.---.---.---'}
                                </div>
                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${ipData?.ip ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800'}`}>
                                        <span className={`w-2 h-2 rounded-full mr-1.5 ${ipData?.ip ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                        {ipData?.ip ? 'Online' : 'Loading...'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-slate-700">
                        <div className="p-6 md:p-8 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex items-center gap-3 mb-2 text-gray-500 dark:text-gray-400">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-xs font-semibold uppercase tracking-wider">{t('city')}</span>
                            </div>
                            <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                {loading ? <div className="h-8 w-24 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" /> : (ipData?.city || '-')}
                            </div>
                        </div>

                        <div className="p-6 md:p-8 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex items-center gap-3 mb-2 text-gray-500 dark:text-gray-400">
                                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs font-semibold uppercase tracking-wider">{t('country')}</span>
                            </div>
                            <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                                {loading ? <div className="h-8 w-24 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" /> : (ipData?.country_name || '-')}
                            </div>
                        </div>

                        <div className="p-6 md:p-8 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex items-center gap-3 mb-2 text-gray-500 dark:text-gray-400">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                                <span className="text-xs font-semibold uppercase tracking-wider">{t('isp')}</span>
                            </div>
                            <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate" title={ipData?.org}>
                                {loading ? <div className="h-8 w-32 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" /> : (ipData?.org || '-')}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid md:grid-cols-2 gap-6 md:gap-8">
                    <div className="p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {t('whatIsIpTitle')}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                            {t('whatIsIpText')}
                        </p>
                    </div>

                    <div className="p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {t('whyCheckIpTitle')}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                            {t('whyCheckIpText')}
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center text-sm text-gray-400 dark:text-gray-500">
                    <p>Powered by Qrydex Network Analysis • {new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    );
}
