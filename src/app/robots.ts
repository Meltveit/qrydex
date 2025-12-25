import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/_next/'], // Disallow API and internal Next.js paths
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: '/api/',
            }
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl, // Explicitly state host
    };
}
