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

    // If no industry ignore
    if (!industryCategory || industryCategory === 'Unknown') return null;

    // 1. Try strict match: Same Industry + Same Country + Score >= 70
    let query = supabase
        .from('businesses')
        .select('*')
        .neq('org_number', orgNumber)
        .eq('quality_analysis->>industry_category', industryCategory)
        .gte('trust_score', 70)
        .limit(3);

    if (countryCode) {
        query = query.eq('country_code', countryCode);
    }

    const { data: primaryMatches } = await query;
    let results = primaryMatches ? [...primaryMatches] : [];

    // 2. Failsafe: If fewer than 3, fill with International matches (Same Industry + Score >= 70)
    if (results.length < 3) {
        const needed = 3 - results.length;

        let fallbackQuery = supabase
            .from('businesses')
            .select('*')
            .neq('org_number', orgNumber)
            .eq('quality_analysis->>industry_category', industryCategory)
            .gte('trust_score', 70)
            .limit(needed + 2); // Fetch a few more to avoid duplicates

        // Exclude already found matches
        if (results.length > 0) {
            const existingIds = results.map(b => b.id);
            fallbackQuery = fallbackQuery.not('id', 'in', `(${existingIds.join(',')})`);
        }

        // Ideally exclude the current country to find international ones, 
        // but "not eq countryCode" handles that implicitly if priority match exhausted local ones.
        // However, explicit exclusion is cleaner if we want "International".
        // But purely filling up is better regardless of country.

        const { data: fallbackMatches } = await fallbackQuery;

        if (fallbackMatches) {
            for (const item of fallbackMatches) {
                if (results.length >= 3) break;
                // Double check duplicate (though .not('id', 'in') covers it)
                if (!results.find(r => r.id === item.id)) {
                    results.push(item);
                }
            }
        }
    }

    if (results.length === 0) return null;

    return (
        <div className="mt-8 md:mt-12">
            <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span role="img" aria-label="recommendation">🌟</span> {t('title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {results.map((b) => (
                    <BusinessCard key={b.id} business={b as Business} locale={locale} hideSitelinks={true} />
                ))}
            </div>
        </div>
    );
}
