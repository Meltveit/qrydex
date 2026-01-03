'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'; 
import { supabase } from '@/lib/supabase';

// Mock type if BusinessCard type not exported
interface Business {
    org_number: string;
    legal_name: string;
    industry_code_desc?: string;
    business_address_city?: string;
    trust_score?: number;
}

export default function RelatedBusinesses() {
    const t = useTranslations('Tools');
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [locationName, setLocationName] = useState<string>('');
    // const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchBusinesses = async () => {
            try {
                // 1. Get User Location (Simple IP-based)
                let userCity = '';
                try {
                    const ipRes = await fetch('https://ipapi.co/json/');
                    const ipData = await ipRes.json();
                    if (ipData && ipData.city) {
                        userCity = ipData.city;
                    }
                } catch (err) {
                    console.warn('Failed to fetch location', err);
                }

                // 2. Try to fetch businesses in that city (IT/Data/Web)
                let data: Business[] = [];

                if (userCity) {
                    const { data: localData } = await supabase
                        .from('businesses')
                        .select('org_number, legal_name, industry_code_desc, business_address_city, trust_score')
                        .gt('trust_score', 60) // Slightly lower threshold for local relevance
                        .ilike('business_address_city', userCity)
                        .ilike('industry_code_desc', '%data%') // Broad IT filter
                        .limit(6);

                    if (localData && localData.length > 0) {
                        data = localData;
                        setLocationName(userCity);
                    }
                }

                // 3. Fallback to National/Top Rated if no local companies found
                if (!data || data.length === 0) {
                    const { data: topData } = await supabase
                        .from('businesses')
                        .select('org_number, legal_name, industry_code_desc, business_address_city, trust_score')
                        .gt('trust_score', 70)
                        .ilike('industry_code_desc', '%data%')
                        .limit(6);

                    if (topData) data = topData;
                }

                if (data) {
                    setBusinesses(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchBusinesses();
    }, []);

    if (businesses.length === 0 && !loading) return null;

    return (
        <div className="mt-16 pt-12 border-t border-gray-100 dark:border-slate-800">
            <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {locationName ? t('relatedBusinessesTitleLocal', { city: locationName }) : t('relatedBusinessesTitle')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                    {locationName ? t('relatedBusinessesSubtitleLocal') : t('relatedBusinessesSubtitle')}
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-gray-100 dark:bg-slate-800 rounded-xl"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {businesses.map((business) => (
                        <Link
                            key={business.org_number}
                            href={`/business/${business.org_number}`}
                            className="block group bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 hover:shadow-lg hover:-translate-y-1 transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                {business.trust_score && (
                                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded">
                                        Trust {business.trust_score}
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {business.legal_name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">
                                {business.industry_code_desc || 'IT Services'}
                            </p>
                            <div className="flex items-center text-xs text-gray-400">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {business.business_address_city || 'Norge'}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
