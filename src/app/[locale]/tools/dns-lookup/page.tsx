import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import DnsClient from './DnsClient';
import RelatedBusinesses from '@/components/tools/RelatedBusinesses';

type Props = {
    params: { locale: string };
};

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'Tools.DnsLookup' });

    return {
        title: t('seoTitle'),
        description: t('seoDescription'),
        alternates: {
            languages: {
                'en': 'https://qrydex.com/en/tools/dns-lookup',
                'no': 'https://qrydex.com/no/tools/dns-lookup',
                'de': 'https://qrydex.com/de/tools/dns-lookup',
                'fr': 'https://qrydex.com/fr/tools/dns-lookup',
                'es': 'https://qrydex.com/es/tools/dns-lookup',
                'da': 'https://qrydex.com/da/tools/dns-lookup',
                'sv': 'https://qrydex.com/sv/tools/dns-lookup',
                'fi': 'https://qrydex.com/fi/tools/dns-lookup',
            },
        },
    };
}

export default function DnsLookupPage({ params: { locale } }: Props) {
    const t = useTranslations('Tools.DnsLookup');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950/50 pb-20">
            {/* Tool Section */}
            <div className="py-12 px-4 md:px-6">
                <DnsClient />
            </div>

            {/* Content Section (SEO Text) */}
            <div className="max-w-4xl mx-auto px-4 md:px-6 mb-20 space-y-8 text-gray-600 dark:text-gray-400">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('whatIsDnsTitle')}</h2>
                    <p className="mb-4">
                        {t('whatIsDnsText')}
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>A Record:</strong> {t('recordA')}</li>
                        <li><strong>MX Record:</strong> {t('recordMX')}</li>
                        <li><strong>TXT Record:</strong> {t('recordTXT')}</li>
                        <li><strong>NS Record:</strong> {t('recordNS')}</li>
                    </ul>
                </div>
            </div>

            {/* Business Listings */}
            <div className="max-w-7xl mx-auto px-4 md:px-6">
                <RelatedBusinesses />
            </div>
        </div>
    );
}
