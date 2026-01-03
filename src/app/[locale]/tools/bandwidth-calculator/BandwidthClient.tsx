'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import RelatedBusinesses from '@/components/tools/RelatedBusinesses';

type Unit = 'b' | 'B' | 'Kb' | 'KB' | 'Mb' | 'MB' | 'Gb' | 'GB' | 'Tb' | 'TB' | 'Pb' | 'PB';
const UNITS: { [key in Unit]: number } = {
    'b': 1,
    'B': 8,
    'Kb': 1000,
    'KB': 8000,
    'Mb': 1000 * 1000,
    'MB': 8000 * 1000,
    'Gb': 1000 * 1000 * 1000,
    'GB': 8000 * 1000 * 1000,
    'Tb': 1000 * 1000 * 1000 * 1000,
    'TB': 8000 * 1000 * 1000 * 1000,
    'Pb': 1000 * 1000 * 1000 * 1000 * 1000,
    'PB': 8000 * 1000 * 1000 * 1000 * 1000,
};

// Labels for dropdowns
const UNIT_LABELS = {
    'b': 'Bits (b)',
    'B': 'Bytes (B)',
    'Kb': 'Kilobits (Kb)',
    'KB': 'Kilobytes (KB)',
    'Mb': 'Megabits (Mb)',
    'MB': 'Megabytes (MB)',
    'Gb': 'Gigabits (Gb)',
    'GB': 'Gigabytes (GB)',
    'Tb': 'Terabits (Tb)',
    'TB': 'Terabytes (TB)',
    'Pb': 'Petabits (Pb)',
    'PB': 'Petabytes (PB)',
};

export default function BandwidthClient() {
    const t = useTranslations('Tools');
    const [activeTab, setActiveTab] = useState<'converter' | 'time' | 'website' | 'hosting'>('converter');

    // 1. Converter State
    const [convValue, setConvValue] = useState<string>('1');
    const [convFrom, setConvFrom] = useState<Unit>('GB');
    const [convTo, setConvTo] = useState<Unit>('MB');
    const [convResult, setConvResult] = useState<string>('');

    // 2. Time State
    const [timeSize, setTimeSize] = useState<string>('10');
    const [timeSizeUnit, setTimeSizeUnit] = useState<Unit>('GB');
    const [timeSpeed, setTimeSpeed] = useState<string>('100');
    const [timeSpeedUnit, setTimeSpeedUnit] = useState<Unit>('Mb'); // Speed usually in bits
    const [timeResult, setTimeResult] = useState<string>('');

    // 3. Website State
    const [webViews, setWebViews] = useState<string>('1000');
    const [webViewUnit, setWebViewUnit] = useState<'day' | 'month'>('day');
    const [webPageSize, setWebPageSize] = useState<string>('2');
    const [webPageSizeUnit, setWebPageSizeUnit] = useState<Unit>('MB');
    const [webRedundancy, setWebRedundancy] = useState<string>('1.2');
    const [webResult, setWebResult] = useState<string>('');

    // 4. Hosting State
    const [hostUsage, setHostUsage] = useState<string>('500');
    const [hostUsageUnit, setHostUsageUnit] = useState<Unit>('GB');
    const [hostResult, setHostResult] = useState<string>('');


    // Logic
    const calculateConverter = () => {
        const val = parseFloat(convValue);
        if (isNaN(val)) return;
        const bits = val * UNITS[convFrom];
        const result = bits / UNITS[convTo];
        setConvResult(`${result.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${convTo}`);
    };

    const calculateTime = () => {
        const size = parseFloat(timeSize);
        const speed = parseFloat(timeSpeed);
        if (isNaN(size) || isNaN(speed) || speed === 0) return;

        const totalBits = size * UNITS[timeSizeUnit];
        const bitsPerSec = speed * UNITS[timeSpeedUnit];

        const seconds = totalBits / bitsPerSec;

        // Format seconds
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = (seconds % 60).toFixed(2);

        let timeStr = "";
        if (d > 0) timeStr += `${d}d `;
        if (h > 0) timeStr += `${h}h `;
        if (m > 0) timeStr += `${m}m `;
        timeStr += `${s}s`;

        setTimeResult(timeStr);
    };

    const calculateWebsite = () => {
        const views = parseFloat(webViews);
        const size = parseFloat(webPageSize);
        const redundancy = parseFloat(webRedundancy);
        if (isNaN(views) || isNaN(size) || isNaN(redundancy)) return;

        let monthlyViews = views;
        if (webViewUnit === 'day') monthlyViews = views * 30;

        const totalSizePerMonthBits = monthlyViews * (size * UNITS[webPageSizeUnit]) * redundancy;

        // Convert to GB/TB
        const gb = totalSizePerMonthBits / UNITS['GB']; // binary GB usually? 
        const tb = totalSizePerMonthBits / UNITS['TB'];

        // Also Mbit/s needed
        const secondsInMonth = 30 * 24 * 3600;
        const mbps = (totalSizePerMonthBits / 1000000) / secondsInMonth;

        setWebResult(`${gb.toFixed(2)} GB/mo (${mbps.toFixed(2)} Mbit/s constant)`);
    };

    const calculateHosting = () => {
        const usage = parseFloat(hostUsage);
        if (isNaN(usage)) return;

        const totalBits = usage * UNITS[hostUsageUnit];
        const secondsInMonth = 30 * 24 * 3600;
        const mbps = (totalBits / 1000000) / secondsInMonth;

        setHostResult(`${mbps.toFixed(2)} Mbit/s`);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4 md:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 mb-4">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        {t('close')}
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">{t('bandwidthCalc')}</h1>
                </div>


                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Tabs */}
                        <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                            <button onClick={() => setActiveTab('converter')} className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all ${activeTab === 'converter' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>{t('unitConverter')}</button>
                            <button onClick={() => setActiveTab('time')} className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all ${activeTab === 'time' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>{t('transferTime')}</button>
                            <button onClick={() => setActiveTab('website')} className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all ${activeTab === 'website' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>{t('websiteEstimator')}</button>
                            <button onClick={() => setActiveTab('hosting')} className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all ${activeTab === 'hosting' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>{t('hostingConverter')}</button>
                        </div>

                        {/* Main Content Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                            <div className="p-6 md:p-8">
                                {/* 1. Converter */}
                                {activeTab === 'converter' && (
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('unitConverter')}</h2>
                                            <span className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
                                            <div className="space-y-4">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t('fromUnit')}</label>
                                                <input type="number" value={convValue} onChange={e => setConvValue(e.target.value)} className="w-full px-4 py-3 rounded-xl border dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white font-mono text-lg mb-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="1" />
                                                <select value={convFrom} onChange={e => setConvFrom(e.target.value as Unit)} className="w-full px-4 py-3 rounded-xl border dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition">
                                                    {Object.entries(UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                </select>
                                            </div>

                                            <div className="flex flex-col justify-center items-center md:hidden py-2 text-gray-400">
                                                <svg className="w-6 h-6 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t('toUnit')}</label>
                                                <div className="h-[54px] w-full bg-transparent flex items-end pb-2 hidden md:flex">
                                                    {/* Spacer to align with input on left */}
                                                </div>
                                                <select value={convTo} onChange={e => setConvTo(e.target.value as Unit)} className="w-full px-4 py-3 rounded-xl border dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition">
                                                    {Object.entries(UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="pt-4">
                                            <button onClick={calculateConverter} className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
                                                <span>{t('calc')}</span>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                        </div>

                                        {convResult && (
                                            <div className="mt-6 p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
                                                <p className="text-blue-100 text-sm mb-1 uppercase tracking-widest font-semibold">{t('bandwidthResult')}</p>
                                                <p className="text-3xl md:text-4xl font-mono font-bold tracking-tight">{convResult}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Other tabs would follow same enhanced pattern... (Time, Website, Hosting) */}
                                {/* For brevity keeping structure similar but applying better classes */}
                                {activeTab === 'time' && (
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('transferTime')}</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">{t('fileSize')}</label>
                                                <div className="flex gap-2">
                                                    <input type="number" value={timeSize} onChange={e => setTimeSize(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white font-mono" />
                                                    <select value={timeSizeUnit} onChange={e => setTimeSizeUnit(e.target.value as Unit)} className="px-4 py-3 rounded-xl border dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white bg-white dark:bg-slate-800">
                                                        <option value="MB">MB</option>
                                                        <option value="GB">GB</option>
                                                        <option value="TB">TB</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">{t('speed')}</label>
                                                <div className="flex gap-2">
                                                    <input type="number" value={timeSpeed} onChange={e => setTimeSpeed(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white font-mono" />
                                                    <select value={timeSpeedUnit} onChange={e => setTimeSpeedUnit(e.target.value as Unit)} className="px-4 py-3 rounded-xl border dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white bg-white dark:bg-slate-800">
                                                        <option value="Kb">Kb/s</option>
                                                        <option value="Mb">Mb/s</option>
                                                        <option value="Gb">Gb/s</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={calculateTime} className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">{t('calc')}</button>
                                        {timeResult && <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-900/50 text-green-800 dark:text-green-300 font-mono text-2xl font-bold text-center">{timeResult}</div>}
                                    </div>
                                )}

                                {activeTab === 'website' && (
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('websiteEstimator')}</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">{t('pageViews')}</label>
                                                <div className="flex gap-2">
                                                    <input type="number" value={webViews} onChange={e => setWebViews(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white font-mono" />
                                                    <select value={webViewUnit} onChange={e => setWebViewUnit(e.target.value as any)} className="px-4 py-3 rounded-xl border dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white bg-white dark:bg-slate-800">
                                                        <option value="day">{t('per')} {t('day')}</option>
                                                        <option value="month">{t('per')} {t('month')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">{t('avgPageSize')}</label>
                                                <div className="flex gap-2">
                                                    <input type="number" value={webPageSize} onChange={e => setWebPageSize(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white font-mono" />
                                                    <select value={webPageSizeUnit} onChange={e => setWebPageSizeUnit(e.target.value as Unit)} className="px-4 py-3 rounded-xl border dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white bg-white dark:bg-slate-800">
                                                        <option value="KB">KB</option>
                                                        <option value="MB">MB</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">{t('redundancy')}</label>
                                                <input type="number" step="0.1" value={webRedundancy} onChange={e => setWebRedundancy(e.target.value)} className="w-full px-4 py-3 rounded-xl border dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white font-mono" />
                                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {t('redundancyHelp')}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={calculateWebsite} className="w-full md:w-auto px-8 py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/30">{t('calc')}</button>
                                        {webResult && <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-900/50 text-purple-800 dark:text-purple-300 font-mono text-xl font-bold text-center">{webResult}</div>}
                                    </div>
                                )}

                                {activeTab === 'hosting' && (
                                    <div className="space-y-6">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('hostingConverter')}</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">{t('monthlyUsage')}</label>
                                                <div className="flex gap-2">
                                                    <input type="number" value={hostUsage} onChange={e => setHostUsage(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white font-mono" />
                                                    <select value={hostUsageUnit} onChange={e => setHostUsageUnit(e.target.value as Unit)} className="px-4 py-3 rounded-xl border dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white bg-white dark:bg-slate-800">
                                                        <option value="GB">GB</option>
                                                        <option value="TB">TB</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={calculateHosting} className="w-full md:w-auto px-8 py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/30">{t('calc')}</button>
                                        {hostResult && <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-900/50 text-orange-800 dark:text-orange-300 font-mono text-xl font-bold text-center">{hostResult}</div>}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SEO Text Content */}
                        <div className="space-y-8 mt-12 px-4 md:px-0">
                            <div className="prose dark:prose-invert max-w-none">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('bwSeoTitle1')}</h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">{t('bwSeoText1')}</p>

                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('bwSeoTitle2')}</h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">{t('bwSeoText2')}</p>

                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('bwSeoTitle3')}</h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t('bwSeoText3')}</p>
                            </div>
                        </div>

                        {/* Business Listings */}
                        <RelatedBusinesses />

                    </div>

                    {/* Right Col: Cross Links */}
                    <div className="lg:col-span-1">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl sticky top-24">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                {t('relatedTools')}
                            </h3>
                            <p className="text-blue-100 text-sm mb-4">
                                Planning a network? Check your subnets!
                            </p>
                            <Link href="/tools/ip-calculator" className="block w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg text-center font-medium transition-colors border border-white/20">
                                {t('checkIpCalc')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
