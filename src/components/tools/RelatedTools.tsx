'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Calculator, Network, Wifi } from 'lucide-react';

export default function RelatedTools() {
    const t = useTranslations('Tools');

    const tools = [
        {
            key: 'ipCalculator',
            href: '/tools/ip-calculator',
            icon: Network,
            color: 'text-purple-500 bg-purple-500/10'
        },
        {
            key: 'bandwidthCalc',
            href: '/tools/bandwidth-calculator',
            icon: Wifi,
            color: 'text-blue-500 bg-blue-500/10'
        }
    ];

    return (
        <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t('relatedTools')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tools.map((tool) => (
                    <Link
                        key={tool.key}
                        href={tool.href}
                        className="group flex items-start gap-4 p-6 bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all"
                    >
                        <div className={`p-3 rounded-xl ${tool.color} group-hover:scale-110 transition-transform`}>
                            <tool.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-500 transition-colors">
                                {t(tool.key)}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {tool.key === 'ipCalculator'
                                    ? t('relatedIpCalcDesc')
                                    : t('relatedBandwidthDesc')}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
