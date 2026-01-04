
'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import Link from 'next/link';

export default function StartupGuidePage() {
    const t = useTranslations('Tools.StartupGuide');
    const [activeTab, setActiveTab] = useState('validation');
    const [activeCountry, setActiveCountry] = useState('NO');

    const tabs = [
        { id: 'validation', label: t('tabs.validation') },
        { id: 'prototyping', label: t('tabs.prototyping') },
        { id: 'funding', label: t('tabs.funding') },
        { id: 'starting', label: t('tabs.starting') },
    ];

    const countries = [
        { code: 'NO', name: 'Norge' },
        { code: 'SE', name: 'Sverige' },
        { code: 'DK', name: 'Danmark' },
        { code: 'UK', name: 'UK' },
        { code: 'US', name: 'USA' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20">
            {/* Hero Section */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
                        {t('title')}
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        {t('subtitle')}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {countries.map(c => (
                            <button
                                key={c.code}
                                onClick={() => setActiveCountry(c.code)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCountry === c.code
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                                    }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                    {/* Tabs */}
                    <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-700">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 min-w-[120px] px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-6 md:p-10">
                        {/* VALIDATION */}
                        {activeTab === 'validation' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('validationTitle')}</h2>
                                    <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                                        {t('validationText')}
                                    </p>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                        <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2">Checklist</h3>
                                        <ul className="space-y-2 text-sm text-indigo-800 dark:text-indigo-200">
                                            <li className="flex items-center gap-2">✅ Talk to 10 potential customers</li>
                                            <li className="flex items-center gap-2">✅ Analyze competitors in Qrydex</li>
                                            <li className="flex items-center gap-2">✅ Define your UPS (Unique Selling Proposition)</li>
                                        </ul>
                                    </div>
                                    <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                                        <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">Useful Tools</h3>
                                        <div className="flex flex-wrap gap-2">
                                            <Link href="/tools/bandwidth-calculator" className="text-sm underline text-green-700 hover:text-green-900">Bandwidth Calc</Link>
                                            <span className="text-green-400">•</span>
                                            <Link href="/search?q=Market+Research" className="text-sm underline text-green-700 hover:text-green-900">Market Research Agencys</Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PROTOTYPING */}
                        {activeTab === 'prototyping' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Build Your Product</h2>
                                <p className="text-lg text-gray-600 dark:text-gray-300">
                                    Moving from idea to physical or digital product requires partners. Find them directly in our index.
                                </p>

                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <SupplierCard
                                        emoji="🏭"
                                        title="Manufacturing"
                                        query="Contract Manufacturing"
                                        desc="Factories for mass production."
                                        country={activeCountry}
                                    />
                                    <SupplierCard
                                        emoji="🪵"
                                        title="Prototyping"
                                        query="Prototype Manufacturer"
                                        desc="Specialists in low-volume / MVP."
                                        country={activeCountry}
                                    />
                                    <SupplierCard
                                        emoji="📦"
                                        title="Packaging"
                                        query="Packaging Suppliers"
                                        desc="Custom boxes and branding."
                                        country={activeCountry}
                                    />
                                    <SupplierCard
                                        emoji="💻"
                                        title="Software Dev"
                                        query="Software Development Agency"
                                        desc="Build your App or SaaS."
                                        country={activeCountry}
                                    />
                                    <SupplierCard
                                        emoji="⚖️"
                                        title="Legal Help"
                                        query="Corporate Law Firm"
                                        desc="Patents, NDAs, and contracts."
                                        country={activeCountry}
                                    />
                                    <SupplierCard
                                        emoji="🎨"
                                        title="Design"
                                        query="Industrial Design Agency"
                                        desc="CAD and Product Design."
                                        country={activeCountry}
                                    />
                                </div>
                            </div>
                        )}

                        {/* FUNDING */}
                        {activeTab === 'funding' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Get Funded</h2>
                                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                    <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-4">
                                        Resources in {countries.find(c => c.code === activeCountry)?.name}
                                    </h3>

                                    {activeCountry === 'NO' && (
                                        <ul className="space-y-3">
                                            <li><a href="https://www.innovasjonnorge.no" target="_blank" className="text-blue-600 hover:underline">Innovasjon Norge</a> - Grants for startups.</li>
                                            <li><a href="https://investinor.no" target="_blank" className="text-blue-600 hover:underline">Investinor</a> - VC funding.</li>
                                            <li><Link href="/search?q=Venture+Capital&country=NO" className="text-blue-600 hover:underline">Find Norwegian VCs in Qrydex</Link></li>
                                        </ul>
                                    )}
                                    {activeCountry === 'SE' && (
                                        <ul className="space-y-3">
                                            <li><a href="https://www.almi.se" target="_blank" className="text-blue-600 hover:underline">Almi</a> - Loans and advice.</li>
                                            <li><a href="https://www.vinnova.se" target="_blank" className="text-blue-600 hover:underline">Vinnova</a> - Innovation grants.</li>
                                        </ul>
                                    )}
                                    {/* Default fallback */}
                                    {!['NO', 'SE'].includes(activeCountry) && (
                                        <p className="text-gray-500">
                                            Select "Norge" or "Sverige" to see specific local grants.
                                            <br />
                                            <Link href={`/search?q=Venture+Capital&country=${activeCountry}`} className="text-blue-600 hover:underline mt-2 inline-block">
                                                Search VCs in {activeCountry} via Qrydex
                                            </Link>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STARTING */}
                        {activeTab === 'starting' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Register Business</h2>
                                <p className="mb-4">Official links for registration in {countries.find(c => c.code === activeCountry)?.name}:</p>

                                {activeCountry === 'NO' && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <ResourceCard title="Brønnøysundregistrene" desc="Register AS or ENK." link="https://www.brreg.no" />
                                        <ResourceCard title="Skatteetaten" desc="Tax information for companies." link="https://www.skatteetaten.no" />
                                        <ResourceCard title="Altinn" desc="The portal for starting business." link="https://www.altinn.no" />
                                    </div>
                                )}
                                {activeCountry === 'UK' && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <ResourceCard title="Companies House" desc="Register your Ltd company." link="https://www.gov.uk/government/organisations/companies-house" />
                                        <ResourceCard title="HMRC" desc="Tax and Customs." link="https://www.gov.uk/government/organisations/hm-revenue-customs" />
                                    </div>
                                )}
                                {activeCountry === 'US' && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <ResourceCard title="IRS (EIN)" desc="Get your Employer ID Number." link="https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online" />
                                        <ResourceCard title="Delaware Inc" desc="Popular for tech startups." link="https://corp.delaware.gov/" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SupplierCard({ emoji, title, query, desc, country }: any) {
    return (
        <Link
            href={`/search?q=${encodeURIComponent(query)}&country=${country}`}
            className="group block p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all bg-white dark:bg-slate-800"
        >
            <div className="text-3xl mb-2">{emoji}</div>
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                {title} <span className="text-xs font-normal text-gray-400">({country})</span>
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
        </Link>
    );
}

function ResourceCard({ title, desc, link }: any) {
    return (
        <a
            href={link} target="_blank" rel="noopener noreferrer"
            className="block p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all bg-white dark:bg-slate-800"
        >
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {title}
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
        </a>
    );
}
