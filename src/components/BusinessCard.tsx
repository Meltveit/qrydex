'use client';

import { Business } from '@/types/database';
import { formatTrustScore } from '@/lib/trust-engine';
import { Link } from '@/i18n/routing';

interface BusinessCardProps {
    business: Business;
    distance?: number;
    locale?: string;
}

const countryNames: Record<string, Record<string, string>> = {
    no: {
        NO: 'Norge', SE: 'Sverige', DK: 'Danmark', FI: 'Finland', DE: 'Tyskland',
        US: 'USA', GB: 'Storbritannia', FR: 'Frankrike', ES: 'Spania',
        IT: 'Italia', NL: 'Nederland', PL: 'Polen', BE: 'Belgia', AT: 'Østerrike',
        CH: 'Sveits', IE: 'Irland', PT: 'Portugal', CZ: 'Tsjekkia', GR: 'Hellas'
    },
    en: {
        NO: 'Norway', SE: 'Sweden', DK: 'Denmark', FI: 'Finland', DE: 'Germany',
        US: 'USA', GB: 'United Kingdom', FR: 'France', ES: 'Spain',
        IT: 'Italy', NL: 'Netherlands', PL: 'Poland', BE: 'Belgium', AT: 'Austria',
        CH: 'Switzerland', IE: 'Ireland', PT: 'Portugal', CZ: 'Czech Republic', GR: 'Greece'
    },
    de: {
        NO: 'Norwegen', SE: 'Schweden', DK: 'Dänemark', FI: 'Finnland', DE: 'Deutschland',
        US: 'USA', GB: 'Großbritannien', FR: 'Frankreich', ES: 'Spanien',
        IT: 'Italien', NL: 'Niederlande', PL: 'Polen', BE: 'Belgien', AT: 'Österreich',
        CH: 'Schweiz', IE: 'Irland', PT: 'Portugal', CZ: 'Tschechien', GR: 'Griechenland'
    },
    fr: {
        NO: 'Norvège', SE: 'Suède', DK: 'Danemark', FI: 'Finlande', DE: 'Allemagne',
        US: 'États-Unis', GB: 'Royaume-Uni', FR: 'France', ES: 'Espagne',
        IT: 'Italie', NL: 'Pays-Bas', PL: 'Pologne', BE: 'Belgique', AT: 'Autriche',
        CH: 'Suisse', IE: 'Irlande', PT: 'Portugal', CZ: 'République tchèque', GR: 'Grèce'
    },
    es: {
        NO: 'Noruega', SE: 'Suecia', DK: 'Dinamarca', FI: 'Finlandia', DE: 'Alemania',
        US: 'Estados Unidos', GB: 'Reino Unido', FR: 'Francia', ES: 'España',
        IT: 'Italia', NL: 'Países Bajos', PL: 'Polonia', BE: 'Bélgica', AT: 'Austria',
        CH: 'Suiza', IE: 'Irlanda', PT: 'Portugal', CZ: 'República Checa', GR: 'Grecia'
    }
};

export default function BusinessCard({ business, distance, locale = 'no' }: BusinessCardProps) {
    const trustScore = formatTrustScore(business);
    const trustColor = trustScore.score >= 70
        ? 'text-green-600 bg-green-50'
        : trustScore.score >= 40
            ? 'text-yellow-600 bg-yellow-50'
            : 'text-gray-600 bg-gray-50';

    return (
        <div
            className="group relative p-4 md:p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700
                       hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl dark:hover:shadow-lg dark:hover:shadow-blue-900/10
                       transition-all duration-300 ease-out cursor-pointer
                       hover:-translate-y-1"
        >
            {/* Main Clickable Area - Invisible overlay for SEO */}
            <Link
                href={`/business/${business.org_number}`}
                className="absolute inset-0 z-0"
                aria-label={`Gå til ${business.legal_name}`}
            />

            <div className="relative z-10 pointer-events-none">
                {/* Header: Company Name + Verification */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Verified Badge */}
                        {business.verification_status === 'verified' && (
                            <div className="flex-shrink-0 relative">
                                <svg className="w-5 h-5 md:w-6 md:h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            </div>
                        )}

                        {/* Company Name */}
                        <h3 className="font-semibold text-base md:text-lg text-gray-900 dark:text-gray-100 truncate 
                                     group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                            {business.legal_name}
                        </h3>
                    </div>

                    {/* Trust Score Badge */}
                    <div className={`self-start flex-shrink-0 px-2.5 py-1 rounded-full text-xs md:text-sm font-semibold ${trustColor}
                                    transition-all duration-200 group-hover:scale-105`}>
                        ⭐ {trustScore.score}
                    </div>
                </div>

                {/* Company Description or AI Summary - Multilingual */}
                {(() => {
                    // Priority: 1. translations[locale], 2. company_description, 3. AI summary
                    const translations = business.translations as Record<string, { company_description?: string }> | null;
                    const description =
                        translations?.[locale]?.company_description ||
                        business.company_description ||
                        business.quality_analysis?.ai_summary;

                    // Hide if it's the placeholder text from registry crawler
                    if (description && description.includes('Automatic verification passed without AI')) {
                        return null;
                    }

                    if (description) {
                        return (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 leading-relaxed">
                                {description}
                            </p>
                        );
                    }
                    return null;
                })()}

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {/* Location with Smart Country Detection */}
                    <span className="flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {business.registry_data?.registered_address?.split(',')[0] || ''}
                        {business.registry_data?.registered_address && ', '}
                        {(() => {
                            // Smart country detection from registry data or address
                            const countryCode = business.country_code ||
                                (business.registry_data?.country_code) ||
                                'NO'; // Default fallback

                            // Get localized country name
                            const countryName = countryNames[locale]?.[countryCode] ||
                                countryNames['en']?.[countryCode] ||
                                countryCode;

                            return countryName;
                        })()}
                    </span>

                    {/* Employees */}
                    {business.registry_data?.employee_count && (
                        <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {business.registry_data.employee_count} ansatte
                        </span>
                    )}

                    {/* Distance */}
                    {distance !== undefined && (
                        <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            {distance} km unna
                        </span>
                    )}
                </div>
            </div>

            {/* Sitelinks - Google Style Navigation with Descriptions */}
            {
                Array.isArray(business.sitelinks) && (business.sitelinks as any[]).length > 0 && (
                    <div className="flex flex-wrap gap-2 md:gap-3 mb-4 relative z-20">
                        {(business.sitelinks as Array<{ title: string; url: string; description?: string }>).slice(0, 6).map((link, i) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="group flex flex-col gap-0.5 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm bg-blue-50 dark:bg-slate-700/50 
                                         hover:bg-blue-100 dark:hover:bg-slate-700 rounded-lg transition-all border border-blue-100 dark:border-slate-600 hover:border-blue-200
                                         hover:shadow-sm max-w-[160px] md:max-w-[200px]"
                            >
                                <div className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200">
                                    <svg className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    <span className="truncate">{link.title}</span>
                                </div>
                                {link.description && (
                                    <span className="hidden md:block text-xs text-blue-600/70 dark:text-blue-300/70 group-hover:text-blue-700/80 dark:group-hover:text-blue-200/80 line-clamp-1">
                                        {link.description}
                                    </span>
                                )}
                            </a>
                        ))}
                    </div>
                )
            }


            {/* Action Buttons - Interactive */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3 pt-4 border-t border-gray-100 dark:border-slate-700 relative z-20 pointer-events-auto">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        const url = business.quality_analysis?.website_url || business.domain;
                        if (url) window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
                    }}
                    className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-blue-600 dark:text-blue-400
                             hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white
                             rounded-lg border border-blue-600 dark:border-blue-500 transition-all duration-200
                             hover:shadow-md active:scale-95 flex-1 md:flex-none justify-center"
                >
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Besøk nettside
                </button>

                <Link
                    href={`/business/${business.org_number}`}
                    className="ml-auto flex items-center gap-1 text-xs md:text-sm font-medium text-blue-600 dark:text-blue-400
                             hover:text-blue-700 dark:hover:text-blue-300 transition-colors group/link w-full md:w-auto justify-end md:justify-start mt-2 md:mt-0"
                >
                    Se profil
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover/link:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>
        </div >
    );
}
