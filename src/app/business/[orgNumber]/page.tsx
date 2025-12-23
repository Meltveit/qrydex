import { getBusinessByOrgNumber } from '@/lib/search';
import { formatTrustScore } from '@/lib/trust-engine';
import TrustScoreBadge from '@/components/TrustScoreBadge';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface BusinessPageProps {
    params: Promise<{ orgNumber: string }>;
}

export default async function BusinessPage({ params }: BusinessPageProps) {
    const { orgNumber } = await params;
    const business = await getBusinessByOrgNumber(orgNumber);

    if (!business) {
        notFound();
    }

    const trustScore = formatTrustScore(business);
    const registry = business.registry_data;
    const quality = business.quality_analysis;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            {/* Header */}
            <header className="border-b border-white/50 bg-white/30 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="text-white font-bold text-xl">Q</span>
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Qrydex
                        </span>
                    </Link>
                    <nav className="flex items-center gap-6">
                        <Link href="/search" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                            Search
                        </Link>
                        <Link href="/verify" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                            Verify
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <nav className="mb-6">
                    <ol className="flex items-center gap-2 text-sm text-gray-500">
                        <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
                        <li>/</li>
                        <li><Link href="/search" className="hover:text-blue-600">Search</Link></li>
                        <li>/</li>
                        <li className="text-gray-900">{business.legal_name}</li>
                    </ol>
                </nav>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header Card */}
                        <div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-lg">
                            <div className="flex items-start justify-between gap-6 mb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-3xl font-bold text-gray-900">{business.legal_name}</h1>
                                        {business.verification_status === 'verified' && (
                                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                Verified
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-500">
                                        <span className="font-mono text-lg">{business.org_number}</span>
                                        <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">{business.country_code}</span>
                                    </div>
                                </div>
                                <TrustScoreBadge
                                    score={trustScore.score}
                                    color={trustScore.color}
                                    label={trustScore.label}
                                    size="lg"
                                />
                            </div>

                            {quality?.ai_summary && (
                                <p className="text-gray-600 text-lg leading-relaxed">
                                    {quality.ai_summary}
                                </p>
                            )}
                        </div>

                        {/* Registry Information */}
                        <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-lg">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Official Registry Information
                            </h2>
                            <div className="grid md:grid-cols-2 gap-4">
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
                            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-lg">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    AI Quality Analysis
                                </h2>
                                <div className="grid md:grid-cols-2 gap-4">
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
                                    <div className="mt-4 p-4 bg-red-50 rounded-xl">
                                        <h3 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            Red Flags Detected
                                        </h3>
                                        <ul className="space-y-1">
                                            {quality.red_flags.map((flag, i) => (
                                                <li key={i} className="text-sm text-red-700">• {flag}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* News Signals */}
                        {business.news_signals && business.news_signals.length > 0 && (
                            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-lg">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                    </svg>
                                    Recent News
                                </h2>
                                <div className="space-y-3">
                                    {business.news_signals.map((signal, i) => (
                                        <div
                                            key={i}
                                            className={`p-4 rounded-xl ${signal.sentiment === 'positive' ? 'bg-green-50' :
                                                    signal.sentiment === 'negative' ? 'bg-red-50' : 'bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{signal.headline}</p>
                                                    <p className="text-sm text-gray-500">{signal.source} • {signal.date}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${signal.sentiment === 'positive' ? 'bg-green-200 text-green-800' :
                                                        signal.sentiment === 'negative' ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-800'
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
                    <div className="space-y-6">
                        {/* Trust Score Breakdown */}
                        <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-lg">
                            <h3 className="font-semibold text-gray-900 mb-4">Trust Score Breakdown</h3>
                            <div className="space-y-4">
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
                            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-lg">
                                <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
                                <div className="space-y-2">
                                    <a
                                        href={`https://${business.domain}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                        </svg>
                                        <span className="text-sm text-gray-700">{business.domain}</span>
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Last Updated */}
                        <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500 text-center">
                            Last updated: {new Date(business.updated_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </main>
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
        green: 'bg-green-100 text-green-700',
        red: 'bg-red-100 text-red-700',
        yellow: 'bg-yellow-100 text-yellow-700',
        gray: 'bg-gray-100 text-gray-700',
    };

    return (
        <div>
            <dt className="text-sm text-gray-500 mb-1">{label}</dt>
            <dd className="font-medium text-gray-900">
                {badge ? (
                    <span className={`px-2 py-1 rounded text-sm ${badgeColors[badge]}`}>{value}</span>
                ) : link ? (
                    <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {value}
                    </a>
                ) : (
                    value
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
        green: 'bg-green-500',
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
    };

    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <span className="font-medium text-gray-900">{score}/{max}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                    className={`${colors[color]} h-2 rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
