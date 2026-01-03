'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { calculateSubnet, SubnetInfo } from '@/lib/tools/ip-calc';

export default function IPCalculatorPage() {
    const t = useTranslations('Tools');
    const [input, setInput] = useState('');
    const [result, setResult] = useState<SubnetInfo | null>(null);
    const [error, setError] = useState(false);

    const handleCalculate = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError(false);
        setResult(null);

        // Simple cleaner
        const cleanInput = input.trim();
        if (!cleanInput) return;

        // Default to /24 if no mask provided
        let calcInput = cleanInput;
        if (!calcInput.includes('/') && !calcInput.includes(' ')) {
            // Heuristic: if it looks like just an IP
            calcInput = `${calcInput}/24`;
        }

        // Handle space as separator
        calcInput = calcInput.replace(' ', '/');

        const parts = calcInput.split('/');
        const ip = parts[0];
        const mask = parts[1] || '24';

        const info = calculateSubnet(ip, mask);
        if (info) {
            setResult(info);
        } else {
            setError(true);
        }
    };

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
                    <div className="p-6 md:p-8 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-slate-800 dark:to-slate-800">
                        <form onSubmit={handleCalculate} className="max-w-xl mx-auto">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('inputLabel')}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="192.168.0.1/24"
                                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white font-mono"
                                />
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-500/30"
                                >
                                    {t('calculate')}
                                </button>
                            </div>
                            {error && (
                                <p className="mt-2 text-red-500 text-sm">Invalid IP address or netmask format.</p>
                            )}
                        </form>
                    </div>

                    {result && (
                        <div className="border-t border-gray-100 dark:border-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-2">
                                {/* Left Column: Visual / Main Info */}
                                <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        {t('subnetCalc')}
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('addr')}</div>
                                            <div className="font-mono text-xl text-blue-600 dark:text-blue-400 font-bold">{result.address}</div>
                                            <div className="text-xs text-gray-400 font-mono mt-0.5">{result.binaryIp}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('netmask')}</div>
                                            <div className="font-mono text-lg text-purple-600 dark:text-purple-400 font-semibold">{result.netmask} = {result.cidr}</div>
                                            <div className="text-xs text-gray-400 font-mono mt-0.5">{result.binaryNetmask}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('wildcard')}</div>
                                            <div className="font-mono text-gray-700 dark:text-gray-300">{result.wildcard}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Detailed Stats */}
                                <div className="p-6 md:p-8 bg-gray-50/50 dark:bg-slate-900/50">
                                    <div className="space-y-3">
                                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">{t('network')}</span>
                                            <span className="font-mono text-gray-900 dark:text-white">{result.network}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">{t('broadcast')}</span>
                                            <span className="font-mono text-gray-900 dark:text-white">{result.broadcast}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">{t('hostMin')}</span>
                                            <span className="font-mono text-gray-900 dark:text-white">{result.hostMin}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">{t('hostMax')}</span>
                                            <span className="font-mono text-gray-900 dark:text-white">{result.hostMax}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">{t('hosts')}</span>
                                            <span className="font-mono text-gray-900 dark:text-white font-bold">{result.hosts.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between py-2">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">{t('class')}</span>
                                            <span className="font-mono text-gray-900 dark:text-white">{result.class}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 grid md:grid-cols-2 gap-6 md:gap-8">
                    {/* Information blocks remain same as before or can be customized */}
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
            </div>
        </div>
    );
}
