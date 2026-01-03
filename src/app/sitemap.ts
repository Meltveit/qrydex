
import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { routing } from '@/i18n/routing';

const BUSINESSES_PER_SITEMAP = 500; // ~4MB per file with 8 locales + alternates

export async function generateSitemaps() {
    // Fetch total count of businesses to determine number of sitemaps
    const { count, error } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

    if (error || count === null) {
        console.error('Error fetching business count for sitemap:', error);
        return [{ id: 0 }]; // Fallback to just one
    }

    const numberOfSitemaps = Math.ceil(count / BUSINESSES_PER_SITEMAP);
    return Array.from({ length: numberOfSitemaps }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
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

    // 1. Static Pages - Only include in the first sitemap (id 0)
    if (id === 0) {
        const routes = ['', '/search', '/verify'];
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
    // Calculate range for this id
    const start = id * BUSINESSES_PER_SITEMAP;
    const end = start + BUSINESSES_PER_SITEMAP - 1;

    try {
        const { data: businesses, error } = await supabase
            .from('businesses')
            .select('org_number, updated_at, trust_score')
            .order('trust_score', { ascending: false })
            .order('org_number', { ascending: true }) // Deterministic sort
            .range(start, end);

        if (error) {
            console.error(`Error fetching sitemap batch ${id}:`, error);
        } else if (businesses) {
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
    }

    return sitemapEntries;
}

