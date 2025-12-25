import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export async function generateSitemaps() {
    // Determine how many sitemaps we need
    // For now, let's just generate a few IDs for simplicity or fetch count
    // Real implementation would count rows / 50000
    // Returning an array of identifiers for "batches"
    return [{ id: 0 }, { id: 1 }, { id: 2 }];
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';
    const limit = 10000;
    const start = id * limit;
    const end = start + limit - 1;

    // Static pages (only on first sitemap)
    const staticPages: MetadataRoute.Sitemap = id === 0 ? [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/search`,
            lastModified: new Date(),
            changeFrequency: 'always', // Search results change constantly
            priority: 0.9,
        },
        {
            url: `${baseUrl}/verify`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
    ] : [];

    // Dynamic business pages
    let businessPages: MetadataRoute.Sitemap = [];

    try {
        const { data: businesses } = await supabase
            .from('businesses')
            .select('org_number, updated_at, trust_score')
            // Remove .eq('verification_status', 'verified') to include seeded companies
            .order('trust_score', { ascending: false })
            .range(start, end);

        if (businesses) {
            businessPages = businesses.map((business) => ({
                url: `${baseUrl}/business/${business.org_number}`,
                lastModified: new Date(business.updated_at),
                changeFrequency: 'weekly',
                priority: business.trust_score > 70 ? 0.8 : 0.6, // Higher priority for trusted
            }));
        }
    } catch (error) {
        console.error('Error generating sitemap:', error);
    }

    return [...staticPages, ...businessPages];
}
