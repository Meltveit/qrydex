import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { routing } from '@/i18n/routing';

const BUSINESSES_PER_SITEMAP = 2000; // Safe size to avoid API limits (1000) and timeouts

export async function generateSitemaps() {
    // Fetch total count of businesses to determine number of sitemaps
    const { count, error } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

    if (error || count === null) {
        console.error('Error fetching business count for sitemap:', error);
        return [{ id: '0' }]; // Fallback to just one
    }

    console.log(`Sitemap generation: Found ${count} businesses. Chunk size: ${BUSINESSES_PER_SITEMAP}.`);
    const numberOfSitemaps = Math.max(1, Math.ceil(count / BUSINESSES_PER_SITEMAP));
    return Array.from({ length: numberOfSitemaps }, (_, i) => ({ id: i.toString() }));
}

// Next.js 15: id might be a Promise
export default async function sitemap(props: { id: string | Promise<string> }): Promise<MetadataRoute.Sitemap> {
    const { id } = props;
    const rawId = id instanceof Promise ? await id : id;

    const safeId = parseInt(rawId, 10);
    // check if safeId is actually a number, otherwise default to 0 for safety but allow debug to show error
    const effectiveId = isNaN(safeId) ? 0 : safeId;

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

    const sitemapEntries: MetadataRoute.Sitemap = [];

    // Calculate range for this id
    const start = effectiveId * BUSINESSES_PER_SITEMAP;
    const end = start + BUSINESSES_PER_SITEMAP - 1;

    let debugMessage = `id-${rawId}-safeId-${safeId}-start-${start}`;

    // 1. Static Pages - Only include in the first sitemap (id 0)
    if (effectiveId === 0) {
        const routes = ['', '/search', '/verify', '/tools/dns-lookup', '/tools/ip-calculator', '/tools/bandwidth-calculator'];
        routes.forEach(route => {
            locales.forEach(locale => {
                sitemapEntries.push({
                    url: `${baseUrl}/${locale}${route}`,
                    lastModified: new Date(),
                    changeFrequency: route === '' ? 'daily' : (route === '/search' ? 'always' : 'monthly'),
                    priority: route === '' ? 1 : (route === '/search' ? 0.9 : 0.7),
                    alternates: getAlternates(route)
                });
            });
        });
    }

    // 2. Dynamic Business Pages for this chunk

    try {
        const { data: businesses, error } = await supabase
            .from('businesses')
            .select('org_number, updated_at, trust_score')
            .order('trust_score', { ascending: false })
            .order('org_number', { ascending: true }) // Deterministic sort
            .range(start, end);

        if (error) {
            console.error(`Error fetching sitemap batch ${effectiveId}:`, error);
            debugMessage += `-error-${error.code}`;
        } else if (businesses) {
            debugMessage += `-found-${businesses.length}`;
            // Grab the first org number to verify sort stability in debug
            if (businesses.length > 0) {
                debugMessage += `-firstOrg-${businesses[0].org_number}`;
            }

            for (const business of businesses) {
                const path = `/business/${business.org_number}`;
                const alts = getAlternates(path);

                locales.forEach(locale => {
                    sitemapEntries.push({
                        url: `${baseUrl}/${locale}${path}`,
                        lastModified: new Date(business.updated_at),
                        changeFrequency: 'weekly',
                        priority: business.trust_score > 70 ? 0.8 : 0.6,
                        alternates: alts
                    });
                });
            }
        }
    } catch (error) {
        console.error(`Error generating sitemap ${id}:`, error);
        debugMessage += `-exception`;
    }

    // INJECT DEBUG URL
    sitemapEntries.push({
        url: `${baseUrl}/debug-info/${debugMessage}`,
        lastModified: new Date(),
        changeFrequency: 'always',
        priority: 0.0
    });

    return sitemapEntries;
}
