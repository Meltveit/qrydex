
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
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 animate-fade-in-up">
                        {t('title')}
                    </h1>
                    <p className="text-2xl font-light text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        {t('intro')}
                    </p>
                </div>

                <div className="space-y-16 md:space-y-24">
                    {/* Why We Exist */}
                    <section className="bg-white dark:bg-gray-900 rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 dark:border-gray-800">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                            {t('whyExistTitle')}
                        </h2>
                        <div className="space-y-4 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                            <p>{t('whyExistText1')}</p>
                            <p className="font-medium text-blue-600 dark:text-blue-400">{t('whyExistText2')}</p>
                        </div>
                    </section>

                    {/* From Noise to Insight & Vision Grid */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <section className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 rounded-3xl p-8 shadow-sm border border-blue-100 dark:border-blue-900/30">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mb-6">
                                <span className="text-2xl text-blue-600">🎯</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {t('insightTitle')}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                {t('insightText')}
                            </p>
                        </section>

                        <section className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-900 rounded-3xl p-8 shadow-sm border border-purple-100 dark:border-purple-900/30">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center mb-6">
                                <span className="text-2xl text-purple-600">🚀</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {t('visionTitle')}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                {t('visionText')}
                            </p>
                        </section>
                    </div>

                    {/* Scaling & Story */}
                    <div className="space-y-12">
                        <section className="text-center max-w-2xl mx-auto">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                                {t('scalingTitle')}
                            </h2>
                            <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                                {t('scalingText')}
                            </p>
                        </section>

                        <section className="bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-8 md:p-12 border border-gray-100 dark:border-gray-800">
                            <div className="max-w-3xl mx-auto">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                                    <span>💡</span> {t('originTitle')}
                                </h3>
                                <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                                    <p className="text-lg leading-relaxed italic border-l-4 border-blue-500 pl-6 py-2">
                                        "{t('originText')}"
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
