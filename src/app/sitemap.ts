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
            changeFrequency: 'hourly',
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
            .select('org_number, updated_at')
            .eq('verification_status', 'verified')
            .order('trust_score', { ascending: false })
            .limit(5000); // Limit for sitemap performance

        if (businesses) {
            businessPages = businesses.map((business) => ({
                url: `${baseUrl}/business/${business.org_number}`,
                lastModified: new Date(business.updated_at),
                changeFrequency: 'weekly' as const,
                priority: 0.8,
            }));
        }
    } catch (error) {
        console.error('Error generating sitemap:', error);
    }

    return [...staticPages, ...businessPages];
}
