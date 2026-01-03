import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-static';
export const revalidate = 86400; // 1 day

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
        'AU': 'en',
        'CA': 'en',
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
                        locales.map(l => [l, `${baseUrl}/${l}${route.path}`])
                    )
                }
            });
        }
    }

    // 2. Dynamic Business Pages
    try {
        // Limit to 45000 to be safe (max 50k per sitemap)
        const { data: businesses, error } = await supabase
            .from('businesses')
            .select('org_number, updated_at, trust_score, country_code, translations')
            .order('trust_score', { ascending: false })
            .limit(45000);

        if (error) {
            console.error('Error fetching sitemap businesses:', error);
        } else if (businesses) {
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
                    Object.keys(business.translations).forEach(code => {
                        if (locales.includes(code as any)) validLocales.add(code);
                    });
                }

                if (validLocales.size === 0) validLocales.add('en');
                const validLocalesArray = Array.from(validLocales);

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
        console.error('Critical sitemap generation error:', error);
    }

    return sitemapEntries;
}
