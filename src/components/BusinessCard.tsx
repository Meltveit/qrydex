'use client';

import { Business } from '@/types/database';
import { formatTrustScore } from '@/lib/trust-engine';
import Link from 'next/link';

interface BusinessCardProps {
    business: Business;
    distance?: number;
}

export default function BusinessCard({ business, distance }: BusinessCardProps) {
    const trustScore = formatTrustScore(business);
    const trustColor = trustScore.score >= 70
        ? 'text-green-600 bg-green-50'
        : trustScore.score >= 40
            ? 'text-yellow-600 bg-yellow-50'
            : 'text-gray-600 bg-gray-50';

    return (
        <div
            className="group relative p-6 bg-white rounded-xl border border-gray-200
                       hover:border-blue-400 hover:shadow-xl
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
                <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Verified Badge */}
                        {business.verification_status === 'verified' && (
                            <div className="flex-shrink-0 relative">
                                <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            </div>
                        )}

                        {/* Company Name */}
                        <h3 className="font-semibold text-lg text-gray-900 truncate 
                                     group-hover:text-blue-600 transition-colors duration-200">
                            {business.legal_name}
                        </h3>
                    </div>

                    {/* Trust Score Badge */}
                    <div className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-semibold ${trustColor}
                                    transition-all duration-200 group-hover:scale-105`}>
                        ⭐ {trustScore.score}
                    </div>
                </div>

                {/* AI Description */}
                {business.quality_analysis?.ai_summary && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                        {business.quality_analysis.ai_summary}
                    </p>
                )}

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                    {/* Location */}
                    <span className="flex items-center gap-1.5 hover:text-gray-700 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {business.registry_data?.registered_address?.split(',')[0] || business.country_code}
                    </span>

                    {/* Employees */}
                    {business.registry_data?.employee_count && (
                        <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {business.registry_data.employee_count} ansatte
                        </span>
                    )}

                    {/* Distance */}
                    {distance !== undefined && (
                        <span className="flex items-center gap-1.5 text-blue-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            {distance} km unna
                        </span>
                    )}
                </div>
            </div>

            {/* Sitelinks - Google Style Navigation with Descriptions */}
            {Array.isArray(business.sitelinks) && (business.sitelinks as any[]).length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4 relative z-20">
                    {(business.sitelinks as Array<{ title: string; url: string; description?: string }>).slice(0, 6).map((link, i) => (
                        <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="group flex flex-col gap-0.5 px-3 py-2 text-sm bg-blue-50 
                                         hover:bg-blue-100 rounded-lg transition-all border border-blue-100 hover:border-blue-200
                                         hover:shadow-sm max-w-[200px]"
                        >
                            <div className="flex items-center gap-1.5 font-medium text-blue-700 group-hover:text-blue-800">
                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                <span className="truncate">{link.title}</span>
                            </div>
                            {link.description && (
                                <span className="text-xs text-blue-600/70 group-hover:text-blue-700/80 line-clamp-1">
                                    {link.description}
                                </span>
                            )}
                        </a>
                    ))}
                </div>
            )}


            {/* Action Buttons - Interactive */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100 relative z-20 pointer-events-auto">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        const url = business.quality_analysis?.website_url || business.domain;
                        if (url) window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 
                             hover:bg-blue-600 hover:text-white
                             rounded-lg border border-blue-600 transition-all duration-200
                             hover:shadow-md active:scale-95"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Besøk nettside
                </button>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Add to comparison
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600
                             hover:bg-gray-100 rounded-lg transition-all duration-200
                             hover:text-gray-900 active:scale-95"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Sammenlign
                </button>

                <Link
                    href={`/business/${business.org_number}`}
                    className="ml-auto flex items-center gap-1 text-sm font-medium text-blue-600 
                             hover:text-blue-700 transition-colors group/link"
                >
                    Se profil
                    <svg className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>
        </div >
    );
}
