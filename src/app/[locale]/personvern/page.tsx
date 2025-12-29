import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'PrivacyPage' });
    return {
        title: t('title'),
        description: t('noTrackingText').substring(0, 160),
    };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'PrivacyPage' });

    return (
        <div className="min-h-screen bg-[var(--color-background)] py-12 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto bg-[var(--color-surface)] rounded-2xl shadow-xl p-8 sm:p-12 border border-[var(--color-border)]">
                <header className="mb-10 text-center">
                    <h1 className="text-3xl font-bold text-[var(--color-text)] mb-4">{t('title')}</h1>
                    <div className="inline-block px-4 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium border border-green-200">
                        {t('badge')}
                    </div>
                </header>

                <div className="space-y-8 text-[var(--color-text)] leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-[var(--color-primary)]">{t('noTrackingTitle')}</h2>
                        <p className="text-[var(--color-text-secondary)]">
                            {t('noTrackingText')}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-[var(--color-primary)]">{t('noCookiesTitle')}</h2>
                        <p className="text-[var(--color-text-secondary)]">
                            {t('noCookiesText')}
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-[var(--color-text-secondary)]">
                            <li>Local Storage (Dark Mode preferences)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-[var(--color-primary)]">{t('publicDataTitle')}</h2>
                        <p className="text-[var(--color-text-secondary)]">
                            {t('publicDataText')}
                        </p>
                    </section>

                    <hr className="border-[var(--color-border)] my-8" />

                    <div className="text-center">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            {t('contactText').split('privacy@qrydex.com')[0]}
                            <br />
                            <a href="mailto:privacy@qrydex.com" className="text-[var(--color-primary)] hover:underline mt-2 inline-block">
                                privacy@qrydex.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
