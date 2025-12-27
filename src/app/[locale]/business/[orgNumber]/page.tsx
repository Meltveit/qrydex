import SchemaBreadcrumbs from '@/components/SchemaBreadcrumbs';

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Business, NewsSignal } from '@/types/database';
import TrustScoreBadge from '@/components/TrustScoreBadge';
import { generateBusinessSchema } from '@/lib/seo/schema-generator';
import { formatTrustScore } from '@/lib/trust-engine';

interface BusinessPageProps {
    params: any;
}

export default async function BusinessPage(props: any) {
    const params = await props.params;
    const { orgNumber } = params;
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
                    { name: 'Home', item: '/' },
                    { name: 'Search', item: '/search' },
                    { name: business.legal_name, item: `/business/${orgNumber}` }
                ]}
            />

            {/* Breadcrumb Visual */}
            <nav className="mb-4 md:mb-6 px-4 md:px-0">
                <ol className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                    <li><Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">Home</Link></li>
                    <li>/</li>
                    <li className="hidden sm:block"><Link href="/search" className="hover:text-blue-600 dark:hover:text-blue-400">Search</Link></li>
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
                                                    Verified
                                                </span>
                                            )}
                                            <span className="text-gray-400 dark:text-gray-600 text-xs md:text-sm">•</span>
                                            <span className="font-mono text-gray-500 dark:text-gray-400 text-xs md:text-sm truncate">{business.org_number}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Company Description */}
                                <div className="prose prose-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-none">
                                    <p className="text-sm md:text-base">{business.company_description || quality.ai_summary || "No description available."}</p>
                                </div>

                                {/* Social Media Links */}
                                {business.social_media && Object.keys(business.social_media as object).length > 0 && (
                                    <div className="flex gap-3 mt-4">
                                        {Object.entries(business.social_media as Record<string, string>).map(([platform, url]) => (
                                            <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                                                className="text-gray-400 hover:text-blue-600 transition-colors capitalize text-sm flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-full hover:bg-blue-50">
                                                {platform}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex md:flex-col items-center justify-center md:justify-start gap-3 md:gap-2 w-full md:w-auto">
                                <TrustScoreBadge
                                    score={trustScore.score}
                                    color={trustScore.color}
                                    label={trustScore.label}
                                    size="lg"
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Trust Score</span>
                            </div>
                        </div>
                    </div>

                    {/* Registry Information */}
                    <div className="p-4 md:p-6 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-700 shadow-lg">
                        <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="text-base md:text-xl">Official Registry</span>
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
                            <InfoRow label="Legal Name" value={registry?.legal_name} />
                            <InfoRow label="Organization Number" value={registry?.org_nr} />
                            <InfoRow label="VAT Number" value={registry?.vat_number} />
                            <InfoRow
                                label="VAT Status"
                                value={registry?.vat_status}
                                badge={registry?.vat_status === 'Active' ? 'green' : 'gray'}
                            />
                            <InfoRow
                                label="Company Status"
                                value={registry?.company_status}
                                badge={registry?.company_status === 'Active' ? 'green' : registry?.company_status === 'Liquidation' ? 'red' : 'gray'}
                            />
                            <InfoRow label="Registration Date" value={registry?.registration_date} />
                            <InfoRow label="Employee Count" value={registry?.employee_count?.toString()} />
                            <InfoRow label="Address" value={registry?.registered_address} />
                            {registry?.industry_codes && registry.industry_codes.length > 0 && (
                                <div className="md:col-span-2">
                                    <InfoRow label="Industry Codes" value={registry.industry_codes.join(', ')} />
                                </div>
                            )}
                        </div>
                        {registry?.last_verified_registry && (
                            <p className="mt-4 text-sm text-gray-500">
                                Last verified: {new Date(registry.last_verified_registry).toLocaleDateString()}
                            </p>
                        )}
                    </div>

                    {/* Quality Analysis */}
                    {quality && (
                        <div className="p-4 md:p-6 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-700 shadow-lg">
                            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                AI Quality Analysis
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
                                <InfoRow label="Industry Category" value={quality.industry_category} />
                                <InfoRow label="Website" value={quality.website_url} link />
                                <InfoRow
                                    label="SSL/HTTPS"
                                    value={quality.has_ssl ? 'Secure' : 'Not Secure'}
                                    badge={quality.has_ssl ? 'green' : 'red'}
                                />
                                <InfoRow
                                    label="Professional Email"
                                    value={quality.professional_email ? 'Yes' : 'No'}
                                    badge={quality.professional_email ? 'green' : 'yellow'}
                                />
                                <InfoRow label="Contact Email" value={quality.contact_email} />
                                <InfoRow label="Content Freshness" value={quality.content_freshness} />
                            </div>

                            {quality.red_flags && quality.red_flags.length > 0 && (
                                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                                    <h3 className="font-medium text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        Red Flags Detected
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
                                Recent News
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
                        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">Trust Score Breakdown</h3>
                        <div className="space-y-3 md:space-y-4">
                            <ScoreBar
                                label="Registry Verified"
                                score={trustScore.breakdown.registry.score}
                                max={trustScore.breakdown.registry.max}
                                color="green"
                            />
                            <ScoreBar
                                label="Quality Score"
                                score={trustScore.breakdown.quality.score}
                                max={trustScore.breakdown.quality.max}
                                color="blue"
                            />
                            <ScoreBar
                                label="News Sentiment"
                                score={trustScore.breakdown.news.score}
                                max={trustScore.breakdown.news.max}
                                color="purple"
                            />
                        </div>
                    </div>

                    {/* Quick Links */}
                    {business.domain && (
                        <div className="p-4 md:p-6 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-700 shadow-lg">
                            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">Quick Links</h3>
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

                    {/* Last Updated */}
                    <div className="p-3 md:p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg md:rounded-xl text-xs md:text-sm text-gray-500 dark:text-gray-400 text-center border border-gray-100 dark:border-slate-700">
                        Last updated: {new Date(business.updated_at).toLocaleDateString()}
                    </div>
                </div>
            </div>

        </div >
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
