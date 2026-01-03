'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function IPCalculatorModal({ onClose }: { onClose: () => void }) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                        {t('ipCalculator')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 md:p-8">
                    {/* Main Display */}
                    <div className="mb-8 text-center">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">{t('myIpTitle')}</h3>
                        {loading ? (
                            <div className="h-12 w-64 mx-auto bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
                        ) : (
                            <div className="text-4xl md:text-5xl font-mono font-bold text-gray-900 dark:text-white tracking-tight">
                                {ipData?.ip || '---.---.---.---'}
                            </div>
                        )}
                    </div>

                    {/* Grid Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('city')}</div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">{ipData?.city || '-'}</div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('country')}</div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">{ipData?.country_name || '-'}</div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('isp')}</div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100 truncate" title={ipData?.org}>{ipData?.org || '-'}</div>
                        </div>
                    </div>

                    {/* SEO Content / Educational */}
                    <div className="space-y-6 text-sm text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-slate-800 pt-6">
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{t('whatIsIpTitle')}</h4>
                            <p className="leading-relaxed">{t('whatIsIpText')}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{t('whyCheckIpTitle')}</h4>
                            <p className="leading-relaxed">{t('whyCheckIpText')}</p>
                        </div>

                        {/* Hidden Keywords for "Context" (Visible but subtle) */}
                        <div className="pt-2">
                            <p className="text-xs text-gray-400 dark:text-gray-600 italic">
                                Keywords: {t('seoKeywords')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
