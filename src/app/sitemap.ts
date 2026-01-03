// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { routing } from '@/i18n/routing';

export const revalidate = 3600; // Cache for 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';
    const locales = routing.locales;

    // Map country codes to native locales
    const countryToLocale: Record<string, string> = {
        'NO': 'no', 'SE': 'sv', 'DK': 'da', 'FI': 'fi', 'DE': 'de',
        'FR': 'fr', 'ES': 'es', 'US': 'en', 'GB': 'en',
        'AU': 'en', 'CA': 'en',
    };

    let sitemapEntries: MetadataRoute.Sitemap = [];

    // 1. Static Pages
    const staticRoutes = [
        { path: '', changeFrequency: 'daily' as const, priority: 1.0 },
        { path: '/search', changeFrequency: 'always' as const, priority: 0.9 },
        { path: '/verify', changeFrequency: 'monthly' as const, priority: 0.7 },
        { path: '/tools/dns-lookup', changeFrequency: 'monthly' as const, priority: 0.7 },
        { path: '/tools/ip-calculator', changeFrequency: 'monthly' as const, priority: 0.7 },
        { path: '/tools/bandwidth-calculator', changeFrequency: 'monthly' as const, priority: 0.7 }
    ];

    for (const route of staticRoutes) {
        for (const locale of locales) {
            sitemapEntries.push({
                url: `${baseUrl}/${locale}${route.path}`,
                lastModified: new Date(),
                changeFrequency: route.changeFrequency,
                priority: route.priority,
                alternates: {
                    languages: Object.fromEntries(
                        locales.map((l: string) => [l, `${baseUrl}/${l}${route.path}`])
                    )
                }
            });
        }
    }

    // 2. Dynamic Business Pages - Fetch in batches
    // Limit to 5000 businesses (~40k URLs total with translations) to stay safely within Google's 50k limit per file
    const BATCH_SIZE = 1000;
    const MAX_BUSINESSES = 5000;
    let hasMore = true;
    let offset = 0;

    console.log('Generating Single Sitemap...');

    while (hasMore && offset < MAX_BUSINESSES) {
        try {
            const { data: businesses, error } = await supabase
                .from('businesses')
                .select('org_number, updated_at, trust_score, country_code, translations')
                .order('trust_score', { ascending: false })
                .range(offset, offset + BATCH_SIZE - 1);

            if (error) {
                console.error(`Error fetching sitemap batch offset ${offset}:`, error);
                hasMore = false;
                break;
            }

            if (!businesses || businesses.length === 0) {
                hasMore = false;
                break;
            }

            console.log(`Processing batch ${offset} - ${offset + businesses.length}`);

            for (const business of businesses) {
                const path = `/business/${business.org_number}`;
                const priority = business.trust_score > 70 ? 0.8 : 0.6;
                const countryCode = business.country_code?.toUpperCase() || 'NO';

                // Determine Valid Locales
                const nativeLocale = countryToLocale[countryCode] || 'en';
                const validLocales = new Set<string>();

                // Native
                if (locales.includes(nativeLocale as any)) validLocales.add(nativeLocale);
                else validLocales.add('en');

                // Translations
                if (business.translations && typeof business.translations === 'object') {
                    Object.keys(business.translations).forEach(code => {
                        if (locales.includes(code as any)) validLocales.add(code);
                    });
                }

                if (validLocales.size === 0) validLocales.add('en');
                const validLocalesArray = Array.from(validLocales);

                // Generate entries for VALID locales only
                for (const locale of validLocalesArray) {
                    sitemapEntries.push({
                        url: `${baseUrl}/${locale}${path}`,
                        lastModified: business.updated_at ? new Date(business.updated_at) : new Date(),
                        changeFrequency: 'weekly',
                        priority: priority,
                        alternates: {
                            languages: Object.fromEntries(
                                validLocalesArray.map((l: string) => [l, `${baseUrl}/${l}${path}`])
                            )
                        }
                    });
                }
            }

            offset += businesses.length;
            if (businesses.length < BATCH_SIZE) hasMore = false;

        } catch (err) {
            console.error('Error in sitemap loop:', err);
            hasMore = false;
        }
    }

    console.log(`Sitemap generated with ${sitemapEntries.length} URLs.`);
    return sitemapEntries;
}
