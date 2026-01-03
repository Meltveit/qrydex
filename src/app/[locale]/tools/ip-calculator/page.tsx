import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import CalculatorClient from './CalculatorClient';

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
        title: `${t('subnetCalc')} - Qrydex`,
        description: t('seoText1'),
        keywords: t('seoKeywordsLong'),
        alternates: {
            languages: Object.fromEntries(
                Object.entries(languages).map(([lang, code]) => [
                    code,
                    `/ ${code}/tools/ip-calculator`
                ])
            ),
            // Canonical handled by parent layout or next-intl usually, but good to be explicit if needed.
            // For now relying on default next-intl setup for canonicals if configured.
            canonical: `/${locale}/tools/ip-calculator`
        },
        openGraph: {
            title: `${t('subnetCalc')} - Qrydex`,
            description: t('seoText1'),
            type: 'website',
        }
    };
}

export default function IPCalculatorPage() {
    return <CalculatorClient />;
}
