import SchemaBreadcrumbs from '@/components/SchemaBreadcrumbs';

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Business, NewsSignal } from '@/types/database';
import TrustScoreBadge from '@/components/TrustScoreBadge';
import { generateBusinessSchema } from '@/lib/seo/schema-generator';
import { formatTrustScore } from '@/lib/trust-score';
import { getTranslations } from 'next-intl/server';

import RelatedBusinesses from '@/components/RelatedBusinesses';
import SocialLinks from '@/components/SocialLinks';
import { ResolvingMetadata } from 'next';

// ... imports

interface BusinessPageProps {
    params: Promise<{
        locale: string;
        orgNumber: string;
    }>;
}

/**
 * Generate Dynamic Metadata for SEO and Social Sharing
 */
export async function generateMetadata(
    props: { params: Promise<{ locale: string; orgNumber: string }> },
    parent: ResolvingMetadata
): Promise<Metadata> {
    const params = await props.params;
    const { orgNumber, locale } = params;

    // Fetch business data
    const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('org_number', orgNumber)
        .single();

    if (!business) {
        return {
            title: 'Business Not Found | Qrydex',
        };
    }

    // Get localized fields
    const translations = business.translations as Record<string, any> | null;
    const description =
        translations?.[locale]?.company_description ||
        business.company_description ||
        business.quality_analysis?.ai_summary ||
        `View trusted business information for ${business.legal_name} on Qrydex.`;

    // Truncate description for SEO (max ~160 chars)
    const metaDescription = description.length > 160
        ? description.substring(0, 157) + '...'
        : description;

    // Construct valid OG Image
    const ogImages = [];
    if (business.logo_url) {
        ogImages.push({
            url: business.logo_url,
            width: 800,
            height: 600,
            alt: `${business.legal_name} Logo`,
        });
    } else {
        // Fallback to Qrydex default
        ogImages.push('/og-image.png');
    }

    const baseUrl = 'https://qrydex.com';
    const languages: Record<string, string> = {};
    const locales = ['en', 'no', 'de', 'fr', 'es', 'da', 'sv', 'fi'];

    locales.forEach(l => {
        languages[l] = `${baseUrl}/${l}/business/${orgNumber}`;
    });

    // pSEO: Enriched Titles & Descriptions
    const trustScore = formatTrustScore(business);
    const countryName = locale === 'no' ? 'Norge' : 'Norway'; // Simplified map, can be expanded

    // "Equinor - Trust Score, Reviews & Key Figures (Norway)"
    const seoTitle = `${business.legal_name} - ${translations?.[locale]?.industry_text || business.quality_analysis?.industry_category || 'Business'} in ${countryName}`;
    const seoDescription = `${business.legal_name} has a Trust Score of ${trustScore.score}/100. ${metaDescription}`;

    return {
        title: seoTitle,
        description: seoDescription,
        alternates: {
            canonical: `${baseUrl}/${locale}/business/${orgNumber}`,
            languages: languages,
        },
        openGraph: {
            title: seoTitle,
            description: seoDescription,
            url: `https://qrydex.com/${locale}/business/${orgNumber}`,
            siteName: 'Qrydex',
            images: ogImages,
            locale: locale,
            type: 'profile',
        },
        twitter: {
            card: 'summary',
            title: seoTitle,
            description: seoDescription,
            images: ogImages,
        },
    };
}

export default async function BusinessPage(props: any) {
    const params = await props.params;
    const { orgNumber, locale } = params;
    const t = await getTranslations({ locale, namespace: 'Business' });
    const tTrust = await getTranslations({ locale, namespace: 'TrustScore' });
    const tNav = await getTranslations({ locale, namespace: 'Navigation' });
    const tHome = await getTranslations({ locale, namespace: 'HomePage' });

    const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('org_number', orgNumber)
        .single();

    if (!business) {
        notFound();
    }

    const registry = business.registry_data;
    const quality = business.quality_analysis;
    const trustScore = formatTrustScore(business);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Header ... */}

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(generateBusinessSchema(business)),
                }}
            />

            <SchemaBreadcrumbs
                items={[
                    { name: 'Home', item: `/${locale}` },
                    { name: tNav('search'), item: `/${locale}/search` },
                    { name: business.legal_name, item: `/${locale}/business/${orgNumber}` }
                ]}
            />

            {/* Breadcrumb Visual */}
            <nav className="mb-4 md:mb-6 px-4 md:px-0">
                <ol className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                    <li><Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">Home</Link></li>
                    <li>/</li>
                    <li className="hidden sm:block"><Link href="/search" className="hover:text-blue-600 dark:hover:text-blue-400">{tNav('search')}</Link></li>
                    <li className="hidden sm:block">/</li>
                    <li className="text-gray-900 dark:text-gray-200 line-clamp-1 truncate">{business.legal_name}</li>
                </ol>
            </nav>
            {/* ... */}

            <div className="grid lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 px-4 md:px-0">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-4 md:space-y-6">
                    {/* Header Card */}
                    <div className="p-4 md:p-6 lg:p-8 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-700 shadow-lg relative overflow-hidden">
                        {/* Background texture/logo hint if available */}
                        {business.logo_url && (
                            <div className="absolute -right-10 -top-10 w-40 h-40 opacity-5 pointer-events-none">
                                <img src={business.logo_url} alt="" className="w-full h-full object-contain" />
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row items-start md:justify-between gap-4 md:gap-6 mb-4 md:mb-6">
                            <div className="flex-1 w-full">
                                <div className="flex items-start gap-3 md:gap-4 mb-4">
                                    {business.logo_url ? (
                                        <img src={business.logo_url} alt={`${business.legal_name} logo`} className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0 object-contain rounded-lg border border-gray-100 dark:border-slate-600 bg-white p-1" />
                                    ) : (
                                        <div className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                                            <span className="text-xl md:text-2xl font-bold">{business.legal_name.charAt(0)}</span>
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-2">{business.legal_name}</h1>
                                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                                            {business.verification_status === 'verified' && (
                                                <span className="px-2 md:px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold flex items-center gap-1 border border-green-200 dark:border-green-800">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    {t('verified')}
                                                </span>
                                            )}
                                            <span className="text-gray-400 dark:text-gray-600 text-xs md:text-sm">•</span>
                                            <span className="font-mono text-gray-500 dark:text-gray-400 text-xs md:text-sm truncate">{business.org_number}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Company Description */}
                                <div className="prose prose-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-none">
                                    <p className="text-sm md:text-base">
                                        {business.translations?.[locale]?.company_description ||
                                            business.company_description ||
                                            quality?.ai_summary ||
                                            "No description available."}
                                    </p>
                                </div>

                                {/* Social Media Links - Enhanced UI */}
                                <SocialLinks links={business.social_media as Record<string, string>} />
                            </div>
                            <div className="flex md:flex-col items-center justify-center md:justify-start gap-3 md:gap-2 w-full md:w-auto">
                                <TrustScoreBadge
                                    score={trustScore.score}
                                    color={trustScore.color}
                                    label={tTrust(trustScore.labelKey)}
                                    size="lg"
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('trustScore')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Registry Information */}
                    <div className="p-4 md:p-6 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-700 shadow-lg">
                        <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="text-base md:text-xl">{t('officialRegistry')}</span>
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
                            <InfoRow label={t('legalName')} value={registry?.legal_name} />
                            <InfoRow label={t('orgNumber')} value={registry?.org_nr} />

                            {/* Smart VAT Display - CHECK BOTH REGISTRY AND SCRAPED DATA */}
                            {(registry?.vat_number || quality?.contact_info?.vat_number) && (
                                <InfoRow
                                    label={t('vatNumber')}
                                    value={registry?.vat_number || quality?.contact_info?.vat_number}
                                    badge={!registry?.vat_number ? 'gray' : undefined} // Gray badge if scraped (unofficial)
                                />
                            )}

                            {registry?.vat_status && registry.vat_status !== 'Unknown' && (
                                <InfoRow
                                    label={t('vatStatus')}
                                    value={registry?.vat_status}
                                    badge={registry?.vat_status === 'Active' ? 'green' : 'gray'}
                                />
                            )}

                            <InfoRow
                                label={t('companyStatus')}
                                value={registry?.company_status}
                                badge={registry?.company_status === 'Active' ? 'green' : registry?.company_status === 'Liquidation' ? 'red' : 'gray'}
                            />
                            <InfoRow label={t('registrationDate')} value={registry?.registration_date} />
                            <InfoRow label={t('employees')} value={registry?.employee_count?.toString()} />
                            {(() => {
                                let address = registry?.registered_address || '';
                                if (locale === 'en' && address) {
                                    // Simple Country Mapping for Address String
                                    address = address
                                        .replace(/\bNorge\b/g, 'Norway')
                                        .replace(/\bDeutschland\b/g, 'Germany')
                                        .replace(/\bSverige\b/g, 'Sweden')
                                        .replace(/\bDanmark\b/g, 'Denmark')
                                        .replace(/\bSuomi\b/g, 'Finland')
                                        .replace(/\bSpania\b/g, 'Spain')
                                        .replace(/\bFrankrike\b/g, 'France');
                                }
                                return <InfoRow label={t('address')} value={address} />;
                            })()}

                            {/* Industry Codes with Smart Translation */}
                            {(() => {
                                const industryCodes = registry?.industry_codes || [];
                                const translatedIndustry = business.translations?.[locale]?.industry_text;

                                // Show translation if available, preserving code prefix if present
                                const displayValue = translatedIndustry
                                    ? (industryCodes.length > 0 && industryCodes[0].includes(':')
                                        ? `${industryCodes[0].split(':')[0]}: ${translatedIndustry}`
                                        : translatedIndustry)
                                    : industryCodes.join(', ');

                                if (!displayValue) return null;

                                return (
                                    <div className="md:col-span-2">
                                        <InfoRow label={t('industryCodes')} value={displayValue} />
                                    </div>
                                );
                            })()}
                        </div>
                        {registry?.last_verified_registry && (
                            <p className="mt-4 text-sm text-gray-500">
                                {t('lastVerified')}: {new Date(registry.last_verified_registry).toLocaleDateString()}
                            </p>
                        )}
                    </div>

                    {/* Key Personnel (NEW) - "Haiene" 🦈 */}
                    {business.key_personnel && (business.key_personnel as any[]).length > 0 && (
                        <div className="p-4 md:p-6 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-700 shadow-lg">
                            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 md:w-6 md:h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {locale === 'no' ? 'Nøkkelpersoner' : 'Key Personnel'}
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {(business.key_personnel as any[]).map((person: any, i: number) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/30">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                            {person.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{person.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{person.role}</p>
                                            {person.email && (
                                                <p className="text-xs text-blue-600 mt-1 truncate max-w-[200px]">{person.email}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* pSEO Internal Linking - "Topic Clusters" 🔗 */}
                    {quality?.industry_category && (
                        <div className="p-4 md:p-6 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-700 shadow-lg">
                            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
                                {locale === 'no' ? 'Utforsk mer' : 'Explore More'}
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    href={`/${locale}/search?q=${encodeURIComponent(quality.industry_category)}`}
                                    className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                >
                                    {locale === 'no' ? `Alle selskaper innen ${quality.industry_category}` : `All companies in ${quality.industry_category}`}
                                </Link>
                                {registry?.registered_address && (
                                    <Link
                                        href={`/${locale}/search?q=${encodeURIComponent(registry.registered_address.split(' ').pop() || '')}`} // Extract City heuristic
                                        className="px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                    >
                                        {locale === 'no' ? `Selskaper i ${registry.registered_address.split(' ').pop()}` : `Companies in ${registry.registered_address.split(' ').pop()}`}
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Quality Analysis */}
                    {quality && (
                        <div className="p-4 md:p-6 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-700 shadow-lg">
                            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                {t('aiAnalysis')}
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
                                <InfoRow label={t('industry')} value={quality.industry_category} />
                                <InfoRow label={t('website')} value={quality.website_url} link />
                                <InfoRow
                                    label={t('sslHttps')}
                                    value={quality.has_ssl ? t('secure') : t('notSecure')}
                                    badge={quality.has_ssl ? 'green' : 'red'}
                                />
                                <InfoRow
                                    label={t('professionalEmail')}
                                    value={quality.professional_email ? t('yes') : t('no')}
                                    badge={quality.professional_email ? 'green' : 'yellow'}
                                />
                                <InfoRow label={t('contactEmail')} value={quality.contact_email} />
                                <InfoRow label={t('contentFreshness')} value={quality.content_freshness} />
                            </div>

                            {quality.red_flags && quality.red_flags.length > 0 && (
                                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                                    <h3 className="font-medium text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {t('redFlags')}
                                    </h3>
                                    <ul className="space-y-1">
                                        {(quality.red_flags as string[]).map((flag, i) => (
                                            <li key={i} className="text-sm text-red-700 dark:text-red-400">• {flag}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* News Signals */}
                    {(business.news_signals as unknown as NewsSignal[]) && (business.news_signals as unknown as NewsSignal[]).length > 0 && (
                        <div className="p-4 md:p-6 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-700 shadow-lg">
                            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 md:w-6 md:h-6 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                </svg>
                                {t('newsSentiment')}
                            </h2>
                            <div className="space-y-3">
                                {(business.news_signals as unknown as NewsSignal[]).map((signal, i) => (
                                    <div
                                        key={i}
                                        className={`p-3 md:p-4 rounded-xl ${signal.sentiment === 'positive' ? 'bg-green-50 dark:bg-green-900/20' :
                                            signal.sentiment === 'negative' ? 'bg-red-50 dark:bg-red-900/20' :
                                                'bg-gray-50 dark:bg-slate-700/50'
                                            }`}
                                    >
                                        <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm md:text-base">{signal.headline}</p>
                                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{signal.source} • {signal.date}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${signal.sentiment === 'positive' ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' :
                                                signal.sentiment === 'negative' ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200' :
                                                    'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                                }`}>
                                                {signal.sentiment}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4 md:space-y-6">
                    {/* Trust Score Breakdown */}
                    <div className="p-4 md:p-6 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-700 shadow-lg">
                        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">{t('trustScoreBreakdown')}</h3>
                        <div className="space-y-3 md:space-y-4">
                            <ScoreBar
                                label={t('registryVerified')}
                                score={trustScore.breakdown.registry.score}
                                max={trustScore.breakdown.registry.max}
                                color="green"
                            />
                            <ScoreBar
                                label={t('qualityScore')}
                                score={
                                    trustScore.breakdown.quality.score +
                                    trustScore.breakdown.social.score +
                                    trustScore.breakdown.technical.score
                                }
                                max={
                                    trustScore.breakdown.quality.max +
                                    trustScore.breakdown.social.max +
                                    trustScore.breakdown.technical.max
                                }
                                color="blue"
                            />
                            <ScoreBar
                                label={t('newsSentiment')}
                                score={trustScore.breakdown.news.score}
                                max={trustScore.breakdown.news.max}
                                color="purple"
                            />
                        </div>
                    </div>

                    {/* Quick Links */}
                    {business.domain && (
                        <div className="p-4 md:p-6 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-700 shadow-lg">
                            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">{t('quickLinks')}</h3>
                            <div className="space-y-2">
                                <a
                                    href={`https://${business.domain}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{business.domain}</span>
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Scraped Sitelinks / Highlights */}
                    {business.sitelinks && (
                        <div className="p-4 md:p-6 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-700 shadow-lg">
                            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                {t('webHighlights')}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(business.sitelinks as any[]).slice(0, 8).map((link: any, i: number) => (
                                    <a
                                        key={i}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer nofollow"
                                        className="group block p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-all"
                                    >
                                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 mb-0.5 truncate">
                                            {link.title}
                                        </div>
                                        {link.description && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 group-hover:text-indigo-600/70 dark:group-hover:text-indigo-300/70">
                                                {link.description}
                                            </div>
                                        )}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Last Updated */}
                    <div className="p-3 md:p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg md:rounded-xl text-xs md:text-sm text-gray-500 dark:text-gray-400 text-center border border-gray-100 dark:border-slate-700">
                        {t('lastUpdated')}: {new Date(business.updated_at).toLocaleDateString()}
                    </div>
                </div>
            </div>

            {/* Related Businesses - Full Width */}
            <div className="px-4 md:px-0 mt-8">
                <RelatedBusinesses
                    orgNumber={orgNumber}
                    industryCategory={quality?.industry_category}
                    countryCode={business.country_code}
                    locale={locale}
                />
            </div>

        </div>
    );
}

function InfoRow({ label, value, badge, link }: {
    label: string;
    value?: string;
    badge?: 'green' | 'red' | 'yellow' | 'gray';
    link?: boolean;
}) {
    if (!value) return null;

    const badgeColors = {
        green: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
        red: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
        yellow: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
        gray: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
    };

    return (
        <div>
            <dt className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100 text-sm md:text-base">
                {badge ? (
                    <span className={`px-2 py-1 rounded text-xs md:text-sm ${badgeColors[badge]}`}>{value}</span>
                ) : link ? (
                    <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">
                        {value}
                    </a>
                ) : (
                    <span className="break-words">{value}</span>
                )}
            </dd>
        </div>
    );
}

function ScoreBar({ label, score, max, color }: {
    label: string;
    score: number;
    max: number;
    color: 'green' | 'blue' | 'purple';
}) {
    const percentage = (score / max) * 100;
    const colors = {
        green: 'bg-green-500 dark:bg-green-400',
        blue: 'bg-blue-500 dark:bg-blue-400',
        purple: 'bg-purple-500 dark:bg-purple-400',
    };

    return (
        <div>
            <div className="flex justify-between text-xs md:text-sm mb-1.5">
                <span className="text-gray-600 dark:text-gray-300">{label}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{score}/{max}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                <div
                    className={`${colors[color]} h-2 rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
