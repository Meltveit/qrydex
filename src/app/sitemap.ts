import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';
    const limit = 20000; // Increase limit for single file

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
    let businessPages: MetadataRoute.Sitemap = [];

    try {
        const { data: businesses } = await supabase
            .from('businesses')
            .select('org_number, updated_at, trust_score')
            .order('trust_score', { ascending: false })
            .limit(limit);

        if (businesses) {
            businessPages = businesses.map((business) => ({
                url: `${baseUrl}/business/${business.org_number}`,
                lastModified: new Date(business.updated_at),
                changeFrequency: 'weekly',
                priority: business.trust_score > 70 ? 0.8 : 0.6,
            }));
        }
    } catch (error) {
        console.error('Error generating sitemap:', error);
    }

    return [...staticPages, ...businessPages];
}
