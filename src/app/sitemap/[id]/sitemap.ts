import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { routing } from '@/i18n/routing';

const BUSINESSES_PER_CHUNK = 500;

// This function tells Next.js which sitemap IDs exist
export async function generateSitemaps() {
    const { count } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

    const totalChunks = Math.ceil((count || 0) / BUSINESSES_PER_CHUNK);

    return Array.from({ length: totalChunks }, (_, i) => ({ id: i }));
}

export default async function sitemap({
    id,
}: {
    id: number;
}): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';
    const locales = routing.locales;

    const countryToLocale: Record<string, string> = {
        'NO': 'no',
        'SE': 'sv',
        'DK': 'da',
        'FI': 'fi',
        'DE': 'de',
        'FR': 'fr',
        'ES': 'es',
        'US': 'en',
        'GB': 'en',
        'AU': 'en',
        'CA': 'en',
    };

    const offset = id * BUSINESSES_PER_CHUNK;

    const { data: businesses } = await supabase
        .from('businesses')
        .select('org_number, updated_at, trust_score, country_code, translations')
        .order('org_number', { ascending: true })
        .range(offset, offset + BUSINESSES_PER_CHUNK - 1);

    if (!businesses || businesses.length === 0) {
        return [];
    }

    const entries: MetadataRoute.Sitemap = [];

    for (const business of businesses) {
        const path = `/business/${business.org_number}`;
        const priority = business.trust_score > 70 ? 0.8 : 0.6;
        const countryCode = business.country_code?.toUpperCase() || 'NO';

        const nativeLocale = countryToLocale[countryCode] || 'en';
        const validLocales = new Set<string>();

        if (locales.includes(nativeLocale as any)) {
            validLocales.add(nativeLocale);
        } else {
            validLocales.add('en');
        }

        if (business.translations && typeof business.translations === 'object') {
            Object.keys(business.translations).forEach((code) => {
                if (locales.includes(code as any)) validLocales.add(code);
            });
        }

        if (validLocales.size === 0) validLocales.add('en');
        const validLocalesArray = Array.from(validLocales);

        for (const locale of validLocalesArray) {
            entries.push({
                url: `${baseUrl}/${locale}${path}`,
                lastModified: new Date(business.updated_at),
                changeFrequency: 'weekly',
                priority: priority,
                alternates: {
                    languages: Object.fromEntries(
                        validLocalesArray.map((l) => [l, `${baseUrl}/${l}${path}`])
                    ),
                },
            });
        }
    }

    return entries;
}
