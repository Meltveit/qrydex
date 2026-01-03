'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

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
        const bitsPerSec = speed * UNITS[timeSpeedUnit]; // Speed units are usually usually /s, but mapped to same UNIT constant as value
        // Note: Map Mb to 1,000,000 not 1024*1024 for network speeds usually, but calculator.net uses binary or decimal? 
        // Standard data transfer is usually decimal (1000) but Windows files are binary (1024). 
        // Let's stick to standard decimal for bits and binary for bytes? Or just consistent.
        // For simplicity and matching most online tools, we utilize checks.
        // Let's assume standard base 10 for 'bits' (telecom) and base 2 for 'Bytes' (storage).
        // Actually, UNITS above is mixed. Let's simplify: Use Base 1000 for everything for consistency 
        // OR fix UNITS to be accurate (1000 vs 1024).
        // Let's stick to base 1000 for simplicity in this V1 unless user complains.

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
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 mb-4">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        {t('close')}
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">{t('bandwidthCalc')}</h1>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-8">
                    <button onClick={() => setActiveTab('converter')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'converter' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{t('unitConverter')}</button>
                    <button onClick={() => setActiveTab('time')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'time' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{t('transferTime')}</button>
                    <button onClick={() => setActiveTab('website')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'website' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{t('websiteEstimator')}</button>
                    <button onClick={() => setActiveTab('hosting')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'hosting' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{t('hostingConverter')}</button>
                </div>

                {/* Main Content Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-6 md:p-8">

                    {/* 1. Converter */}
                    {activeTab === 'converter' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('unitConverter')}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('inputValue')}</label>
                                    <input type="number" value={convValue} onChange={e => setConvValue(e.target.value)} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-900 border-gray-300 dark:border-slate-600 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('fromUnit')}</label>
                                    <select value={convFrom} onChange={e => setConvFrom(e.target.value as Unit)} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-900 border-gray-300 dark:border-slate-600 dark:text-white">
                                        {Object.entries(UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center justify-center md:pb-3 text-gray-400">➔</div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('toUnit')}</label>
                                    <select value={convTo} onChange={e => setConvTo(e.target.value as Unit)} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-900 border-gray-300 dark:border-slate-600 dark:text-white">
                                        {Object.entries(UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button onClick={calculateConverter} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">{t('calc')}</button>
                            {convResult && <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-800 dark:text-blue-300 font-mono text-xl">{convResult}</div>}
                        </div>
                    )}

                    {/* 2. Transfer Time */}
                    {activeTab === 'time' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('transferTime')}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('fileSize')}</label>
                                    <div className="flex gap-2">
                                        <input type="number" value={timeSize} onChange={e => setTimeSize(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border dark:bg-slate-900 border-gray-300 dark:border-slate-600 dark:text-white" />
                                        <select value={timeSizeUnit} onChange={e => setTimeSizeUnit(e.target.value as Unit)} className="px-4 py-2 rounded-xl border dark:bg-slate-900 border-gray-300 dark:border-slate-600 dark:text-white">
                                            <option value="MB">MB</option>
                                            <option value="GB">GB</option>
                                            <option value="TB">TB</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('speed')}</label>
                                    <div className="flex gap-2">
                                        <input type="number" value={timeSpeed} onChange={e => setTimeSpeed(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border dark:bg-slate-900 border-gray-300 dark:border-slate-600 dark:text-white" />
                                        <select value={timeSpeedUnit} onChange={e => setTimeSpeedUnit(e.target.value as Unit)} className="px-4 py-2 rounded-xl border dark:bg-slate-900 border-gray-300 dark:border-slate-600 dark:text-white">
                                            <option value="Kb">Kb/s</option>
                                            <option value="Mb">Mb/s</option>
                                            <option value="Gb">Gb/s</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button onClick={calculateTime} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">{t('calc')}</button>
                            {timeResult && <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl text-green-800 dark:text-green-300 font-mono text-xl">{timeResult}</div>}
                        </div>
                    )}

                    {/* 3. Website Estimator */}
                    {activeTab === 'website' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('websiteEstimator')}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('pageViews')}</label>
                                    <div className="flex gap-2">
                                        <input type="number" value={webViews} onChange={e => setWebViews(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border dark:bg-slate-900 border-gray-300 dark:border-slate-600 dark:text-white" />
                                        <select value={webViewUnit} onChange={e => setWebViewUnit(e.target.value as any)} className="px-4 py-2 rounded-xl border dark:bg-slate-900 border-gray-300 dark:border-slate-600 dark:text-white">
                                            <option value="day">{t('per')} {t('day')}</option>
                                            <option value="month">{t('per')} {t('month')}</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('avgPageSize')}</label>
                                    <div className="flex gap-2">
                                        <input type="number" value={webPageSize} onChange={e => setWebPageSize(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border dark:bg-slate-900 border-gray-300 dark:border-slate-600 dark:text-white" />
                                        <select value={webPageSizeUnit} onChange={e => setWebPageSizeUnit(e.target.value as Unit)} className="px-4 py-2 rounded-xl border dark:bg-slate-900 border-gray-300 dark:border-slate-600 dark:text-white">
                                            <option value="KB">KB</option>
                                            <option value="MB">MB</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('redundancy')}</label>
                                    <input type="number" step="0.1" value={webRedundancy} onChange={e => setWebRedundancy(e.target.value)} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-900 border-gray-300 dark:border-slate-600 dark:text-white" />
                                    <p className="text-xs text-gray-500 mt-1">{t('redundancyHelp')}</p>
                                </div>
                            </div>
                            <button onClick={calculateWebsite} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">{t('calc')}</button>
                            {webResult && <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl text-purple-800 dark:text-purple-300 font-mono text-xl">{webResult}</div>}
                        </div>
                    )}

                    {/* 4. Hosting Converter */}
                    {activeTab === 'hosting' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('hostingConverter')}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('monthlyUsage')}</label>
                                    <div className="flex gap-2">
                                        <input type="number" value={hostUsage} onChange={e => setHostUsage(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border dark:bg-slate-900 border-gray-300 dark:border-slate-600 dark:text-white" />
                                        <select value={hostUsageUnit} onChange={e => setHostUsageUnit(e.target.value as Unit)} className="px-4 py-2 rounded-xl border dark:bg-slate-900 border-gray-300 dark:border-slate-600 dark:text-white">
                                            <option value="GB">GB</option>
                                            <option value="TB">TB</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button onClick={calculateHosting} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">{t('calc')}</button>
                            {hostResult && <div className="p-4 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-800 dark:text-orange-300 font-mono text-xl">{hostResult}</div>}
                        </div>
                    )}
                </div>

                {/* SEO Text Content */}
                <div className="space-y-8 mt-12">
                    <div className="prose dark:prose-invert max-w-none">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('bwSeoTitle1')}</h2>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">{t('bwSeoText1')}</p>

                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('bwSeoTitle2')}</h2>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">{t('bwSeoText2')}</p>

                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('bwSeoTitle3')}</h2>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{t('bwSeoText3')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
