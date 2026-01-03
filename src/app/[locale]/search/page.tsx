import SearchBar from '@/components/SearchBar';
import { Metadata } from 'next';
import BusinessCard from '@/components/BusinessCard';
import { searchBusinesses } from '@/lib/search';
import Link from 'next/link';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { getTranslations } from 'next-intl/server';

interface SearchPageProps {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{
        q?: string;
        country?: string;
        page?: string;
    }>;
}

export async function generateMetadata({ params, searchParams }: SearchPageProps): Promise<Metadata> {
    const { locale } = await params;
    const { q, country } = await searchParams;
    const query = q || '';

    // Translation Maps for SEO
    const titles: Record<string, { prefix: string, suffix: string, default: string }> = {
        no: { prefix: 'Selskaper i', suffix: '- Qrydex', default: 'Bedriftssøk - Qrydex' },
        en: { prefix: 'Companies in', suffix: '- Qrydex', default: 'Business Search - Qrydex' },
        de: { prefix: 'Unternehmen in', suffix: '- Qrydex', default: 'Unternehmenssuche - Qrydex' },
        fr: { prefix: 'Entreprises à', suffix: '- Qrydex', default: 'Recherche d\'entreprises - Qrydex' },
        es: { prefix: 'Empresas en', suffix: '- Qrydex', default: 'Búsqueda de empresas - Qrydex' },
        da: { prefix: 'Virksomheder i', suffix: '- Qrydex', default: 'Virksomhedssøgning - Qrydex' },
        sv: { prefix: 'Företag i', suffix: '- Qrydex', default: 'Företagssök - Qrydex' },
        fi: { prefix: 'Yritykset', suffix: '- Qrydex', default: 'Yrityshaku - Qrydex' }
    };

    const descriptions: Record<string, { prefix: string, suffix: string, default: string }> = {
        no: { prefix: 'Finn pålitelige bedrifter innen', suffix: 'Sjekk Trust Score og anmeldelser.', default: 'Søk i vår database av verifiserte bedrifter.' },
        en: { prefix: 'Find trusted companies in', suffix: 'Check Trust Scores and reviews.', default: 'Search our database of verified companies.' },
        de: { prefix: 'Finden Sie vertrauenswürdige Unternehmen in', suffix: 'Prüfen Sie Trust Scores und Bewertungen.', default: 'Durchsuchen Sie unsere Datenbank verifizierter Unternehmen.' },
        fr: { prefix: 'Trouvez des entreprises de confiance dans', suffix: 'Vérifiez les scores de confiance et les avis.', default: 'Recherchez dans notre base de données d\'entreprises vérifiées.' },
        es: { prefix: 'Encuentre empresas confiables en', suffix: 'Verifique Trust Scores y reseñas.', default: 'Busque en nuestra base de datos de empresas verificadas.' },
        da: { prefix: 'Find betroede virksomheder i', suffix: 'Tjek Trust Scores og anmeldelser.', default: 'Søg i vores database af bekræftede virksomheder.' },
        sv: { prefix: 'Hitta pålitliga företag inom', suffix: 'Kontrollera Trust Scores och recensioner.', default: 'Sök i vår databas med verifierade företag.' },
        fi: { prefix: 'Löydä luotettavat yritykset alan', suffix: 'Tarkista Trust Scores ja arvostelut.', default: 'Hae varmennettujen yritysten tietokannastamme.' }
    };

    const tTitle = titles[locale] || titles.en;
    const tDesc = descriptions[locale] || descriptions.en;

    // Helper to get localized country name (Simple map for common ones)
    const getCountryName = (code: string) => {
        if (!code) return '';
        const cMaps: Record<string, Record<string, string>> = {
            'NO': { no: 'Norge', en: 'Norway' },
            'SE': { no: 'Sverige', en: 'Sweden' },
            'DK': { no: 'Danmark', en: 'Denmark' },
            'FI': { no: 'Finland', en: 'Finland' },
            'DE': { no: 'Tyskland', en: 'Germany' },
            'FR': { no: 'Frankrike', en: 'France' },
            'US': { no: 'USA', en: 'USA' },
            'GB': { no: 'Storbritannia', en: 'UK' },
        };
        const map = cMaps[code.toUpperCase()];
        if (!map) return code;
        return map[locale] || map['en'] || code;
    };

    const locationSuffix = country ? ` ${locale === 'no' ? 'i' : 'in'} ${getCountryName(country)}` : '';

    const title = query
        ? `${tTitle.prefix} ${query}${locationSuffix} ${tTitle.suffix}`
        : tTitle.default;

    const description = query
        ? `${tDesc.prefix} ${query}${locationSuffix}. ${tDesc.suffix}`
        : tDesc.default;

    return {
        title,
        description,
        alternates: {
            // Include country param in canonical if present
            canonical: `https://qrydex.com/${locale}/search${query ? `?q=${encodeURIComponent(query)}` : ''}${country ? `&country=${country}` : ''}`,
        },
        robots: {
            index: !!query, // Only index if there is a query (Category page), avoid indexing empty search
            follow: true,
        }
    };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
    const { locale } = await params;
    const searchParamsValues = await searchParams;
    const query = searchParamsValues.q || '';
    const countryFilter = searchParamsValues.country as string | undefined;
    const page = searchParamsValues.page ? parseInt(searchParamsValues.page, 10) : 1;
    const t = await getTranslations({ locale, namespace: 'SearchPage' });

    // Analytics Context (Bot B)
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || '127.0.0.1';
    const country = headersList.get('x-vercel-ip-country') || 'NO'; // Fallback to NO for dev
    const region = headersList.get('x-vercel-ip-city') || undefined;
    const ua = headersList.get('user-agent') || '';
    const date = new Date().toISOString().split('T')[0];
    const sessionId = crypto.createHash('sha256').update(`${ip}${ua}${date}`).digest('hex').substring(0, 16);

    const results = await searchBusinesses(query, { country: countryFilter }, page, 20, {
        country,
        region,
        sessionId
    });

    return (
        <div className="min-h-screen bg-[var(--color-background)] dark:bg-slate-950">
            {/* Header with search */}
            <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-[var(--color-border)] transition-colors">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 flex-shrink-0 p-2 -m-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-[var(--color-primary)] dark:bg-blue-600 flex items-center justify-center shadow">
                            <span className="text-white font-bold text-lg">Q</span>
                        </div>
                        <span className="text-xl font-bold text-[var(--color-primary)] dark:text-blue-400 hidden sm:block">
                            Qrydex
                        </span>
                    </Link>

                    {/* Search bar */}
                    <div className="flex-1 max-w-xl">
                        <SearchBar defaultQuery={query} />
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
                {/* Results info */}
                <div className="mb-4 md:mb-6">
                    <p className="text-sm md:text-base text-[var(--color-text-secondary)] dark:text-gray-400">
                        {t('showingResults', { count: results.total })}
                        {results.articles && results.articles.length > 0 && t('andArticles', { count: results.articles.length })}
                        {query && t('forQuery', { query })}
                    </p>
                </div>

                {/* News Articles Section (if any) */}
                {results.articles && results.articles.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('relevantNews')}</h2>
                        <div className="grid gap-3">
                            {results.articles.map((article) => (
                                <a
                                    key={article.id}
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-200 transition-colors shadow-sm hover:shadow-md group"
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                                                {article.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                                {article.summary}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                    News
                                                </span>
                                                <span>•</span>
                                                <span>{new Date(article.published_at || '').toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mb-3">
                    {results.businesses.length > 0 && (
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('businesses')}</h2>
                    )}
                </div>

                {/* Results */}
                {results.businesses.length > 0 ? (
                    <div className="space-y-3">
                        {results.businesses.map((business) => (
                            <BusinessCard
                                key={business.id}
                                business={business}
                                locale={locale}
                            />
                        ))}
                    </div>
                ) : (
                    !results.articles?.length && (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">
                                {t('noResults')}
                            </h3>
                            <p className="text-[var(--color-text-secondary)]">
                                {query
                                    ? t('noResultsQuery', { query })
                                    : t('searchPrompt')}
                            </p>
                        </div>
                    )
                )}

                {/* Pagination */}
                {results.total > results.pageSize && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                        {page > 1 && (
                            <Link
                                href={`/${locale}/search?q=${query}&page=${page - 1}`}
                                className="px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg dark:text-blue-400"
                            >
                                ← {t('previous')}
                            </Link>
                        )}
                        <span className="px-4 py-2 text-sm text-[var(--color-text-secondary)] dark:text-gray-400">
                            {t('pageIndicator', { page: page, total: Math.ceil(results.total / results.pageSize) })}
                        </span>
                        {page < Math.ceil(results.total / results.pageSize) && (
                            <Link
                                href={`/${locale}/search?q=${query}&page=${page + 1}`}
                                className="px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg dark:text-blue-400"
                            >
                                {t('next')} →
                            </Link>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
