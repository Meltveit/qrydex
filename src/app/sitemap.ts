import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { routing } from '@/i18n/routing';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';
    const locales = routing.locales;

    // Helper to generate alternates for a given path
    const getAlternates = (path: string) => {
        const languages: Record<string, string> = {};
        locales.forEach(locale => {
            languages[locale] = `${baseUrl}/${locale}${path}`;
        });
        return { languages };
    };

    // 1. Static Pages
    // We explicitly list the localized versions.
    // The specific paths we want to index:
    const routes = ['', '/search', '/verify'];

    // Create an entry for every route in every locale
    const staticPages: MetadataRoute.Sitemap = [];

    routes.forEach(route => {
        locales.forEach(locale => {
            staticPages.push({
                url: `${baseUrl}/${locale}${route}`,
                lastModified: new Date(),
                changeFrequency: route === '' ? 'daily' : (route === '/search' ? 'always' : 'monthly'),
                priority: route === '' ? 1 : (route === '/search' ? 0.9 : 0.7),
                alternates: getAlternates(route)
            });
        });
    });

    // 2. Dynamic Business Pages
    const businessPages: MetadataRoute.Sitemap = [];
    const MAX_URLS = 45000;
    // We fetch businesses, and for each business we create N entries (one per locale).
    // So distinct businesses we can support is MAX_URLS / locales.length.
    // 45000 / 8 ~= 5600 businesses.

    const BATCH_SIZE = 1000;

    try {
        let hasMore = true;
        let start = 0;

        // Loop until we run out of data or hit the URL limit
        while (hasMore && (businessPages.length + staticPages.length) < MAX_URLS) {
            const end = start + BATCH_SIZE - 1;

            const { data: businesses, error } = await supabase
                .from('businesses')
                .select('org_number, updated_at, trust_score')
                .order('trust_score', { ascending: false })
                .range(start, end);

            if (error) {
                console.error('Error fetching sitemap batch:', error);
                break;
            }

            if (!businesses || businesses.length === 0) {
                hasMore = false;
            } else {
                for (const business of businesses) {
                    // Check if adding this business (all locales) would exceed limit
                    if ((businessPages.length + staticPages.length + locales.length) > MAX_URLS) {
                        hasMore = false;
                        break;
                    }

                    const path = `/business/${business.org_number}`;
                    const alts = getAlternates(path);

                    locales.forEach(locale => {
                        businessPages.push({
                            url: `${baseUrl}/${locale}${path}`,
                            lastModified: new Date(business.updated_at),
                            changeFrequency: 'weekly',
                            priority: business.trust_score > 70 ? 0.8 : 0.6,
                            alternates: alts
                        });
                    });
                }

                if (businesses.length < BATCH_SIZE) {
                    hasMore = false;
                }

                start += BATCH_SIZE;
            }
        }

    } catch (error) {
        console.error('Error generating sitemap:', error);
    }

    return [...staticPages, ...businessPages];
}
