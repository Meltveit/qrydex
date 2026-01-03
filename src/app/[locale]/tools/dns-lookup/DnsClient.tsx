'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Server, Shield, Globe, Mail, FileText, Share2, Globe2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { lookupDns, type DnsRecordType, type DnsResult } from '@/app/actions/dns-lookup';

export default function DnsClient() {
    // const t = useTranslations('Tools.DnsLookup'); // TODO: Add translations
    // Fallback translations until we add them to generic locale files
    const t = (key: string) => {
        const dictionary: Record<string, string> = {
            title: 'DNS Lookup Tool',
            subtitle: 'Check DNS records instantly for any domain',
            placeholder: 'Enter domain (e.g. qrydex.com)',
            button: 'Lookup DNS',
            all: 'All',
            error: 'Could not resolve domain',
            noRecords: 'No records found',
        };
        return dictionary[key] || key;
    };

    const [domain, setDomain] = useState('');
    const [selectedType, setSelectedType] = useState<DnsRecordType>('ALL');
    const [results, setResults] = useState<DnsResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchedDomain, setSearchedDomain] = useState('');

    const handleLookup = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!domain) return;

        setLoading(true);
        setError(null);
        setResults([]);
        setSearchedDomain(domain);

        try {
            const response = await lookupDns(domain, selectedType);
            if (response.success && response.records) {
                setResults(response.records);
            } else {
                setError(response.error || t('error'));
            }
        } catch (err) {
            setError(t('error'));
        } finally {
            setLoading(false);
        }
    };

    const recordTypes: { id: DnsRecordType; label: string; icon: any }[] = [
        { id: 'ALL', label: 'All', icon: Globe },
        { id: 'A', label: 'A', icon: Server },
        { id: 'MX', label: 'MX', icon: Mail },
        { id: 'TXT', label: 'TXT', icon: FileText },
        { id: 'NS', label: 'NS', icon: Share2 },
        { id: 'CNAME', label: 'CNAME', icon: Globe2 },
        { id: 'SOA', label: 'SOA', icon: Shield },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-4 group">
                    <Globe className="w-10 h-10 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                    {t('title')}
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    {t('subtitle')}
                </p>
            </div>

            {/* Search Card */}
            <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                <form onSubmit={handleLookup} className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                placeholder={t('placeholder')}
                                className="w-full pl-12 pr-4 h-14 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !domain}
                            className="h-14 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Search className="w-5 h-5" />
                                    <span>{t('button')}</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex flex-wrap gap-2 justify-center">
                        {recordTypes.map((type) => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => setSelectedType(type.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedType === type.id
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <type.icon className="w-4 h-4" />
                                {type.label}
                            </button>
                        ))}
                    </div>
                </form>
            </div>

            {/* Results Section */}
            <AnimatePresence mode="wait">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-center font-medium border border-red-200 dark:border-red-800"
                    >
                        {error}
                    </motion.div>
                )}

                {!loading && results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid gap-4"
                    >
                        <h3 className="text-xl font-semibold px-2">
                            Results for <span className="text-blue-500">{searchedDomain}</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {results.map((record, index) => (
                                <motion.div
                                    key={`${record.type}-${index}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300`}>
                                                {record.type}
                                            </span>
                                            {record.priority !== undefined && (
                                                <span className="text-xs text-gray-500">Pri: {record.priority}</span>
                                            )}
                                        </div>
                                        {/* <span className="text-xs text-gray-400 font-mono">TTL: {record.ttl || 'Auto'}</span> */}
                                    </div>
                                    <div className="font-mono text-sm break-all text-gray-800 dark:text-gray-200">
                                        {record.value}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
