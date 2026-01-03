import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

const BUSINESSES_PER_SITEMAP = 1000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';

    try {
        const { count } = await supabase
            .from('businesses')
            .select('org_number', { count: 'exact', head: true });

        const numberOfSitemaps = Math.max(1, Math.ceil((count || 0) / BUSINESSES_PER_SITEMAP));

        // Generate sitemap index entries
        const sitemapEntries: MetadataRoute.Sitemap = Array.from(
            { length: numberOfSitemaps },
            (_, i) => ({
                url: `${baseUrl}/sitemap/${i}.xml`,
                lastModified: new Date()
            })
        );

        return sitemapEntries;
    } catch (error) {
        console.error('Error generating sitemap index:', error);
        return [{
            url: `${baseUrl}/sitemap/0.xml`,
            lastModified: new Date()
        }];
    }
}
