import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

const BUSINESSES_PER_CHUNK = 500;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';

    // Get total count to calculate chunks
    const { count } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

    const totalChunks = Math.ceil((count || 0) / BUSINESSES_PER_CHUNK);

    const sitemaps: MetadataRoute.Sitemap = [
        // Static pages sitemap
        {
            url: `${baseUrl}/sitemap/static.xml`,
            lastModified: new Date(),
        },
    ];

    // Add all dynamic chunks
    for (let i = 0; i < totalChunks; i++) {
        sitemaps.push({
            url: `${baseUrl}/sitemap/${i}.xml`,
            lastModified: new Date(),
        });
    }

    return sitemaps;
}
