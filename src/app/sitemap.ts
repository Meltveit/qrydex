import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/search`,
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/verify`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
    ];

    // Dynamic business pages
    const businessPages: MetadataRoute.Sitemap = [];
    const BATCH_SIZE = 1000;
    const MAX_URLS = 45000; // Keep under Google's 50k limit for single file

    try {
        let hasMore = true;
        let start = 0;

        while (hasMore && businessPages.length < MAX_URLS) {
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
                const batch = businesses.map((business) => ({
                    url: `${baseUrl}/business/${business.org_number}`,
                    lastModified: new Date(business.updated_at),
                    changeFrequency: 'weekly' as const,
                    priority: business.trust_score > 70 ? 0.8 : 0.6,
                }));

                businessPages.push(...batch);

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
