// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { routing } from '@/i18n/routing';

const BUSINESSES_PER_SITEMAP = 1000;

// Generate sitemaps for all business pages
export async function generateSitemaps() {
    try {
        const { count } = await supabase
            .from('businesses')
            .select('org_number', { count: 'exact', head: true });

        const numberOfSitemaps = Math.max(1, Math.ceil((count || 0) / BUSINESSES_PER_SITEMAP));

        return Array.from({ length: numberOfSitemaps }, (_, i) => ({
            id: i.toString()
        }));
    } catch (error) {
        console.error('Error generating sitemap params:', error);
        return [{ id: '0' }];
    }
}

export default async function sitemap({
    id
}: {
    id: string
}): Promise<MetadataRoute.Sitemap> {
    // In sitemap.ts with generateSitemaps, id is passed directly as a string, not a Promise (unlike page params)
    // However, depending on Next.js version, it might be safe to handle both, but standard docs show { id }: { id: string }

    const effectiveId = parseInt(id, 10);
    const parsedId = isNaN(effectiveId) ? 0 : effectiveId;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';
    const locales = routing.locales;

    // Map country codes to native locales
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
        // Default fallbacks
        'AU': 'en',
        'CA': 'en',
    };

    const start = parsedId * BUSINESSES_PER_SITEMAP;
    const end = start + BUSINESSES_PER_SITEMAP - 1;

    let sitemapEntries: MetadataRoute.Sitemap = [];

    // 1. Static Pages - Only in first sitemap (id 0)
    if (parsedId === 0) {
        const staticRoutes = [
            { path: '', changeFrequency: 'daily' as const, priority: 1.0 },
            { path: '/search', changeFrequency: 'always' as const, priority: 0.9 },
            { path: '/verify', changeFrequency: 'monthly' as const, priority: 0.7 },
            { path: '/tools/dns-lookup', changeFrequency: 'monthly' as const, priority: 0.7 },
            { path: '/tools/ip-calculator', changeFrequency: 'monthly' as const, priority: 0.7 },
            { path: '/tools/bandwidth-calculator', changeFrequency: 'monthly' as const, priority: 0.7 }
        ];

        for (const route of staticRoutes) {
            // Static pages exist in ALL locales
            for (const locale of locales) {
                sitemapEntries.push({
                    url: `${baseUrl}/${locale}${route.path}`,
                    lastModified: new Date(),
                    changeFrequency: route.changeFrequency,
                    priority: route.priority,
                    alternates: {
                        languages: Object.fromEntries(
                            locales.map(l => [l, `${baseUrl}/${l}${route.path}`])
                        )
                    }
                });
            }
        }
    }

    // 2. Dynamic Business Pages
    try {
        const { data: businesses, error } = await supabase
            .from('businesses')
            .select('org_number, updated_at, trust_score, country_code, translations')
            .order('trust_score', { ascending: false })
            .order('org_number', { ascending: true })
            .range(start, end);

        if (error) {
            console.error(`Error fetching sitemap batch ${parsedId}:`, error);
        } else if (businesses && businesses.length > 0) {
            console.log(`Sitemap ${parsedId}: Processing ${businesses.length} businesses`);

            for (const business of businesses) {
                const path = `/business/${business.org_number}`;
                const priority = business.trust_score > 70 ? 0.8 : 0.6;
                const countryCode = business.country_code?.toUpperCase() || 'NO'; // Default to NO if missing

                // Determine Valid Locales
                const nativeLocale = countryToLocale[countryCode] || 'en';
                const validLocales = new Set<string>();

                // 1. Always include Native Locale if supported
                if (locales.includes(nativeLocale as any)) {
                    validLocales.add(nativeLocale);
                } else {
                    // Fallback to English if native locale not supported
                    validLocales.add('en');
                }

                // 2. Include English (Global) if it's not the native one, 
                //    BUT ideally only if we have content? For now we assume English is always a good fallback/global 
                //    or check if 'en' key exists in translations.
                //    Let's check translations for strictly valid secondary languages.
                if (business.translations && typeof business.translations === 'object') {
                    const translatedCodes = Object.keys(business.translations);
                    for (const code of translatedCodes) {
                        if (locales.includes(code as any)) {
                            validLocales.add(code);
                        }
                    }
                }

                // If set is empty (rare), fallback to 'en'
                if (validLocales.size === 0) validLocales.add('en');

                const validLocalesArray = Array.from(validLocales);

                // Generate entries for VALID locales only
                for (const locale of validLocalesArray) {
                    sitemapEntries.push({
                        url: `${baseUrl}/${locale}${path}`,
                        lastModified: new Date(business.updated_at),
                        changeFrequency: 'weekly',
                        priority: priority,
                        alternates: {
                            languages: Object.fromEntries(
                                validLocalesArray.map(l => [l, `${baseUrl}/${l}${path}`])
                            )
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.error(`Error generating sitemap ${parsedId}:`, error);
    }

    return sitemapEntries;
}
