import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import BandwidthClient from './BandwidthClient';

type Props = {
    params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Tools' });

    // Hreflang alternates
    const languages = {
        'en': 'en',
        'no': 'no',
        'sv': 'sv',
        'da': 'da',
        'fi': 'fi',
        'de': 'de',
        'fr': 'fr',
        'es': 'es'
    };

    return {
        title: `${t('bandwidthCalc')} - Qrydex`,
        description: t('bwSeoText1'),
        keywords: t('bwSeoKeywordsLong'),
        alternates: {
            languages: Object.fromEntries(
                Object.entries(languages).map(([lang, code]) => [
                    code,
                    `/${code}/tools/bandwidth-calculator`
                ])
            ),
            canonical: `/${locale}/tools/bandwidth-calculator`
        },
        openGraph: {
            title: `${t('bandwidthCalc')} - Qrydex`,
            description: t('bwSeoText1'),
            type: 'website',
        }
    };
}

export default function BandwidthCalculatorPage() {
    return <BandwidthClient />;
}
