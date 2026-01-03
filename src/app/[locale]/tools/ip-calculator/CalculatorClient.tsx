'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { calculateSubnet, SubnetInfo } from '@/lib/tools/ip-calc';

export default function CalculatorClient() {
    const t = useTranslations('Tools');
    const [ipInput, setIpInput] = useState('');
    const [maskInput, setMaskInput] = useState('24'); // Default /24
    const [result, setResult] = useState<SubnetInfo | null>(null);
    const [error, setError] = useState(false);

    // Reference table data generator
    const generateReferenceTable = () => {
        const rows = [];
        for (let i = 1; i <= 32; i++) {
            const subnet = calculateSubnet('0.0.0.0', i.toString()); // Dummy IP to get mask stats
            if (subnet) {
                // Formatting usability for display
                const usable = subnet.hosts === 1 ? 0 : subnet.hosts; // /32 really has 1 IP but 0 hosts usually defined in this context
                rows.push({
                    cidr: `/${i}`,
                    mask: subnet.netmask,
                    hosts: subnet.hosts.toLocaleString(),
                });
            }
        }
        return rows;
    };

    const referenceTable = generateReferenceTable();

    const handleCalculate = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError(false);
        setResult(null);

        const cleanIp = ipInput.trim();
        // If user typed CIDR in IP box, handle it
        let finalIp = cleanIp;
        let finalMask = maskInput;

        if (cleanIp.includes('/')) {
            const parts = cleanIp.split('/');
            finalIp = parts[0];
            finalMask = parts[1];
        }

        if (!finalIp) return;

        const info = calculateSubnet(finalIp, finalMask);
        if (info) {
            setResult(info);
            // Sync state if they typed CIDR manually
            if (cleanIp.includes('/')) {
                setIpInput(finalIp);
                setMaskInput(finalMask);
            }
        } else {
            setError(true);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4 md:px-8">
            <div className="max-w-5xl mx-auto">
                {/* Header / Nav */}
                <div className="mb-8 ">
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
                        {t('subnetCalc')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                        {t('seoTextContent1') /* Fallback safe */}
                        {t('inputLabel')}
                    </p>
                </div>


                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Col: Calculator */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Calculator Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                            <div className="p-6 md:p-8 bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-slate-800/50">
                                <form onSubmit={handleCalculate} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {t('addr')}
                                            </label>
                                            <input
                                                type="text"
                                                value={ipInput}
                                                onChange={(e) => setIpInput(e.target.value)}
                                                placeholder="192.168.0.1"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                {t('netmask')} / {t('prefix')}
                                            </label>
                                            <select
                                                value={maskInput}
                                                onChange={(e) => setMaskInput(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white font-mono"
                                            >
                                                {referenceTable.map((row) => (
                                                    <option key={row.cidr} value={row.cidr.replace('/', '')}>
                                                        {row.cidr} - {row.mask} ({row.hosts} hosts)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            {t('calculate')}
                                        </button>
                                    </div>

                                    {error && (
                                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                            Invalid IP address format.
                                        </div>
                                    )}
                                </form>
                            </div>

                            {/* Results Table */}
                            {result && (
                                <div className="border-t border-gray-100 dark:border-slate-700 animate-in slide-in-from-top-4 duration-300">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                                <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t('addr')}</td>
                                                    <td className="px-6 py-4 font-mono text-blue-700 dark:text-blue-300">{result.address}</td>
                                                    <td className="px-6 py-4 font-mono text-xs text-gray-500 hidden md:table-cell">{result.binaryIp}</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t('netmask')}</td>
                                                    <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">{result.netmask}</td>
                                                    <td className="px-6 py-4 font-mono text-xs text-gray-500 hidden md:table-cell">{result.binaryNetmask}</td>
                                                </tr>
                                                <tr className="bg-gray-50/50 dark:bg-slate-800">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">CIDR</td>
                                                    <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">/{result.cidr}</td>
                                                    <td className="px-6 py-4"></td>
                                                </tr>
                                                <tr>
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t('network')}</td>
                                                    <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">{result.network}</td>
                                                    <td className="px-6 py-4 font-mono text-xs text-gray-500 hidden md:table-cell"></td>
                                                </tr>
                                                <tr className="bg-gray-50/50 dark:bg-slate-800">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t('broadcast')}</td>
                                                    <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">{result.broadcast}</td>
                                                    <td className="px-6 py-4"></td>
                                                </tr>
                                                <tr>
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t('hostMin')}</td>
                                                    <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">{result.hostMin}</td>
                                                    <td className="px-6 py-4"></td>
                                                </tr>
                                                <tr className="bg-gray-50/50 dark:bg-slate-800">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t('hostMax')}</td>
                                                    <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">{result.hostMax}</td>
                                                    <td className="px-6 py-4"></td>
                                                </tr>
                                                <tr>
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t('hosts')}</td>
                                                    <td className="px-6 py-4 font-mono font-bold text-green-600 dark:text-green-400">{result.hosts.toLocaleString()}</td>
                                                    <td className="px-6 py-4"></td>
                                                </tr>
                                                <tr className="bg-gray-50/50 dark:bg-slate-800">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t('class')}</td>
                                                    <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">{result.class}</td>
                                                    <td className="px-6 py-4"></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SEO Text Content Sections */}
                        <div className="space-y-8 mt-12">
                            <div className="prose dark:prose-invert max-w-none">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('seoTitle1')}</h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                                    {t('seoText1')}
                                </p>

                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('seoTitle2')}</h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                                    {t('seoText2')}
                                </p>

                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('seoTitle3')}</h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {t('seoText3')}
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* Right Col: Reference Table */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden sticky top-24">
                            <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                                <h3 className="font-bold text-gray-900 dark:text-white">{t('referenceTableTitle')}</h3>
                            </div>
                            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 font-medium">CIDR</th>
                                            <th className="px-3 py-2 font-medium">{t('decimalMask')}</th>
                                            <th className="px-3 py-2 font-medium">{t('hostsPerSubnet')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {referenceTable.map((row) => (
                                            <tr
                                                key={row.cidr}
                                                className="hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                                                onClick={() => setMaskInput(row.cidr.replace('/', ''))}
                                            >
                                                <td className="px-3 py-2 font-mono font-medium text-blue-600 dark:text-blue-400">{row.cidr}</td>
                                                <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400">{row.mask}</td>
                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-200 text-right">{row.hosts}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center border-t border-gray-100 dark:border-slate-800 pt-8">
                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">
                        {t('seoKeywordsLong').split(', ').map((k: string) => `#${k}`).join(' ')}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        Powered by Qrydex Network Tools • Free for personal and commercial use
                    </p>
                </div>
            </div>
        </div>
    );
}
