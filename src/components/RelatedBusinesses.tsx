import { supabase } from '@/lib/supabase';
import BusinessCard from './BusinessCard';
import { getTranslations } from 'next-intl/server';
import { Business } from '@/types/database';

interface Props {
    orgNumber: string;
    industryCategory?: string;
    countryCode?: string;
    locale: string;
}

export default async function RelatedBusinesses({ orgNumber, industryCategory, countryCode, locale }: Props) {
    const t = await getTranslations({ locale, namespace: 'RelatedBusinesses' });

    // If no industry or country, match is too broad.
    // We can fallback to just Country + High Score, but user asked for "Same Sector".
    if (!industryCategory || industryCategory === 'Unknown') return null;

    // Fetch logic with proper typing and filters
    // Note: We use query chaining to build the request
    let query = supabase
        .from('businesses')
        .select('*')
        .neq('org_number', orgNumber) // Exclude self
        .eq('quality_analysis->>industry_category', industryCategory) // Match Industry
        .gte('trust_score', 70) // Trust Score >= 70
        .limit(3);

    // Add country filter if present
    if (countryCode) {
        query = query.eq('country_code', countryCode);
    }

    const { data: related } = await query;

    if (!related || related.length === 0) return null;

    return (
        <div className="mt-8 md:mt-12">
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span role="img" aria-label="recommendation">🌟</span> {t('title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {related.map((b) => (
                    <BusinessCard key={b.id} business={b as Business} locale={locale} hideSitelinks={true} />
                ))}
            </div>
        </div>
    );
}
