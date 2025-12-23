'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import TrustScoreBadge from '@/components/TrustScoreBadge';

interface VerificationResult {
    verified: boolean;
    business?: {
        legal_name: string;
        org_number: string;
        country_code: string;
        trust_score: number;
        verification_status: string;
    };
    error?: string;
}

export default function VerifyPage() {
    const [orgNumber, setOrgNumber] = useState('');
    const [countryCode, setCountryCode] = useState('NO');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [stateCode, setStateCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<VerificationResult | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgNumber: orgNumber.trim(),
                    countryCode,
                    websiteUrl: websiteUrl.trim() || undefined,
                    stateCode: countryCode === 'US' ? stateCode : undefined,
                }),
            });

            const data = await response.json();
            setResult(data);
        } catch {
            setResult({ verified: false, error: 'Verification request failed' });
        } finally {
            setLoading(false);
        }
    };

    const getTrustColor = (score: number): 'green' | 'yellow' | 'red' => {
        if (score >= 70) return 'green';
        if (score >= 40) return 'yellow';
        return 'red';
    };

    const getTrustLabel = (score: number): string => {
        if (score >= 80) return 'Highly Trusted';
        if (score >= 70) return 'Trusted';
        if (score >= 50) return 'Moderately Trusted';
        if (score >= 40) return 'Requires Verification';
        return 'Low Trust';
    };

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
                        <Link href="/verify" className="text-blue-600 font-medium">
                            Verify
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-12">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">Verify a Business</h1>
                    <p className="text-gray-600">
                        Enter organization details to verify against official registries and get a Trust Score
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 bg-white rounded-2xl border border-gray-100 shadow-xl">
                    <div className="space-y-6">
                        {/* Country Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Country
                            </label>
                            <select
                                value={countryCode}
                                onChange={(e) => setCountryCode(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            >
                                <option value="NO">Norway (Brønnøysund)</option>
                                <option value="SE">Sweden (EU VIES)</option>
                                <option value="DK">Denmark (EU VIES)</option>
                                <option value="DE">Germany (EU VIES)</option>
                                <option value="NL">Netherlands (EU VIES)</option>
                                <option value="FR">France (EU VIES)</option>
                                <option value="GB">United Kingdom (Companies House)</option>
                                <option value="US">United States (SEC/State)</option>
                            </select>
                        </div>

                        {/* Org Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Organization/VAT Number
                            </label>
                            <input
                                type="text"
                                value={orgNumber}
                                onChange={(e) => setOrgNumber(e.target.value)}
                                placeholder={countryCode === 'NO' ? '987654321' : countryCode === 'GB' ? '12345678' : 'VAT number'}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                {countryCode === 'NO' && '9-digit Norwegian organization number'}
                                {countryCode === 'GB' && '8-digit UK company registration number'}
                                {countryCode === 'US' && 'CIK (SEC) or State registration number'}
                                {['SE', 'DK', 'DE', 'NL', 'FR'].includes(countryCode) && 'VAT number (without country prefix)'}
                            </p>
                        </div>

                        {/* US State Code (conditional) */}
                        {countryCode === 'US' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    State (for state registry lookup)
                                </label>
                                <select
                                    value={stateCode}
                                    onChange={(e) => setStateCode(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                >
                                    <option value="">Try SEC first</option>
                                    <option value="CA">California</option>
                                    <option value="DE">Delaware</option>
                                    <option value="NY">New York</option>
                                    <option value="TX">Texas</option>
                                    <option value="FL">Florida</option>
                                </select>
                            </div>
                        )}

                        {/* Website URL (optional) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Website URL (optional)
                            </label>
                            <input
                                type="text"
                                value={websiteUrl}
                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                placeholder="https://example.com"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Providing the website enables AI quality analysis for a more accurate Trust Score
                            </p>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !orgNumber.trim()}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold
                hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    Verify Business
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Result */}
                {result && (
                    <div className={`mt-8 p-6 rounded-2xl border ${result.verified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        {result.verified && result.business ? (
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <h3 className="text-lg font-semibold text-green-900">Verification Successful</h3>
                                    </div>
                                    <p className="text-green-800 font-medium">{result.business.legal_name}</p>
                                    <p className="text-green-700 text-sm">{result.business.org_number} • {result.business.country_code}</p>
                                    <Link
                                        href={`/business/${result.business.org_number}`}
                                        className="inline-block mt-3 text-sm text-green-700 hover:text-green-900 font-medium"
                                    >
                                        View full profile →
                                    </Link>
                                </div>
                                <TrustScoreBadge
                                    score={result.business.trust_score}
                                    color={getTrustColor(result.business.trust_score)}
                                    label={getTrustLabel(result.business.trust_score)}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <h3 className="font-semibold text-red-900">Verification Failed</h3>
                                    <p className="text-red-700 text-sm">{result.error || 'Business not found in registry'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
