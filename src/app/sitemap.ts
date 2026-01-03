import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { routing } from '@/i18n/routing';

const BUSINESSES_PER_SITEMAP = 1000;

export async function generateSitemaps() {
    const { count, error } = await supabase
        .from('businesses')
        .select('org_number', { count: 'exact', head: true });

    if (error || count === null) {
        console.error('Error fetching business count for sitemap:', error);
        return [{ id: 0 }];
    }

    console.log(`Sitemap generation: Found ${count} businesses. Chunk size: ${BUSINESSES_PER_SITEMAP}.`);
    const numberOfSitemaps = Math.max(1, Math.ceil(count / BUSINESSES_PER_SITEMAP));
    return Array.from({ length: numberOfSitemaps }, (_, i) => ({ id: i }));
}

export default async function sitemap(props: { id: number | Promise<number> }): Promise<MetadataRoute.Sitemap> {
    const id = props.id instanceof Promise ? await props.id : props.id;
    const effectiveId = typeof id === 'number' && !isNaN(id) ? id : 0;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';
    const locales = routing.locales;

    // Helper to generate hreflang alternates
    const getAlternates = (path: string) => {
        const languages: Record<string, string> = {};
        locales.forEach(locale => {
            languages[locale] = `${baseUrl}/${locale}${path}`;
        });
        return { languages };
    };

    const sitemapEntries: MetadataRoute.Sitemap = [];

    // Calculate range for this sitemap chunk
    const start = effectiveId * BUSINESSES_PER_SITEMAP;
    const end = start + BUSINESSES_PER_SITEMAP - 1;

    // 1. Static Pages - Only in first sitemap (id 0)
    if (effectiveId === 0) {
        const staticRoutes = [
            { path: '', changeFreq: 'daily' as const, priority: 1.0 },
            { path: '/search', changeFreq: 'always' as const, priority: 0.9 },
            { path: '/verify', changeFreq: 'monthly' as const, priority: 0.7 },
            { path: '/tools/dns-lookup', changeFreq: 'monthly' as const, priority: 0.7 },
            { path: '/tools/ip-calculator', changeFreq: 'monthly' as const, priority: 0.7 },
            { path: '/tools/bandwidth-calculator', changeFreq: 'monthly' as const, priority: 0.7 }
        ];

        staticRoutes.forEach(route => {
            locales.forEach(locale => {
                sitemapEntries.push({
                    url: `${baseUrl}/${locale}${route.path}`,
                    lastModified: new Date(),
                    changeFrequency: route.changeFreq,
                    priority: route.priority,
                    alternates: getAlternates(route.path)
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
            .order('org_number', { ascending: true })
            .range(start, end);

        if (error) {
            console.error(`Error fetching sitemap batch ${effectiveId}:`, error);
        } else if (businesses && businesses.length > 0) {
            console.log(`Sitemap ${effectiveId}: Processing ${businesses.length} businesses (${start}-${end})`);

            for (const business of businesses) {
                const path = `/business/${business.org_number}`;
                const alternates = getAlternates(path);

                locales.forEach(locale => {
                    sitemapEntries.push({
                        url: `${baseUrl}/${locale}${path}`,
                        lastModified: new Date(business.updated_at),
                        changeFrequency: 'weekly',
                        priority: business.trust_score > 70 ? 0.8 : 0.6,
                        alternates: alternates
                    });
                });
            }
        } else {
            console.log(`Sitemap ${effectiveId}: No businesses found in range ${start}-${end}`);
        }
    } catch (error) {
        console.error(`Error generating sitemap ${effectiveId}:`, error);
    }

    return sitemapEntries;
}