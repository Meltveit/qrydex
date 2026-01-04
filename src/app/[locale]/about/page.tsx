
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';

type Props = {
    params: { locale: string };
};

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'AboutPage' });
    return {
        title: t('title'),
        description: t('intro')
    };
}

export default function AboutPage() {
    const t = useTranslations('AboutPage');

    return (
        <div className="min-h-screen bg-[var(--color-background)] dark:bg-slate-950 py-12 md:py-20">
            <div className="max-w-4xl mx-auto px-4 md:px-6">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                        {t('title')}
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        {t('intro')}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
                    <div className="flex justify-center mb-6">
                        <span className="text-6xl">🚧</span>
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        {t('content')}
                    </p>
                </div>
            </div>
        </div>
    );
}
