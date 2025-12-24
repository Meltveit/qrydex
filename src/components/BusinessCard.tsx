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

    return (
        <Link href={`/business/${business.org_number}`}>
            <div className="p-5 bg-white rounded-xl border border-[var(--color-border)]
        hover:border-[var(--color-primary-light)] hover:shadow-md
        transition-all duration-200 cursor-pointer group">

                {/* Header row */}
                <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        {/* Verified checkmark */}
                        {business.verification_status === 'verified' && (
                            <svg className="w-5 h-5 text-[var(--color-verified)] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        )}
                        {/* Company name */}
                        <h3 className="font-semibold text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                            {business.legal_name}
                        </h3>
                    </div>

                    {/* Distance */}
                    {distance !== undefined && (
                        <span className="text-sm text-[var(--color-text-secondary)] flex-shrink-0">
                            {distance} km ↗
                        </span>
                    )}
                </div>

                {/* AI description */}
                {business.quality_analysis?.ai_summary && (
                    <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-1">
                        {business.quality_analysis.ai_summary}
                    </p>
                )}

                {/* Metadata row */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                    {/* Location */}
                    <span className="flex items-center gap-1">
                        📍 {business.registry_data?.registered_address?.split(',')[0] || business.country_code}
                    </span>

                    {/* Employees */}
                    {business.registry_data?.employee_count && (
                        <span className="flex items-center gap-1">
                            👥 {business.registry_data.employee_count}
                        </span>
                    )}

                    {/* Trust Score */}
                    <span className={`font-medium ${trustScore.score >= 70 ? 'text-[var(--color-verified)]' :
                        trustScore.score >= 40 ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-secondary)]'
                        }`}>
                        ⭐ {trustScore.score}/100
                    </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            // Open contact (website or email)
                            const url = business.quality_analysis?.website_url || business.domain;
                            if (url) window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-[var(--color-primary)] 
              hover:bg-[var(--color-primary)] hover:text-white
              rounded-lg border border-[var(--color-primary)] transition-colors"
                    >
                        Kontakt
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            // TODO: Add to comparison
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)]
              hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Sammenlign
                    </button>
                    <span className="ml-auto text-sm text-[var(--color-primary)] group-hover:underline">
                        Se profil →
                    </span>
                </div>
            </div>
        </Link>
    );
}
