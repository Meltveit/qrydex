import { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-static';
export const revalidate = 86400; // 1 day

export async function GET(request: NextRequest) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';
    const locales = routing.locales;

    // Define static routes
    const staticRoutes = [
        { path: '', changeFrequency: 'daily' as const, priority: 1.0 },
        { path: '/search', changeFrequency: 'always' as const, priority: 0.9 },
        { path: '/verify', changeFrequency: 'monthly' as const, priority: 0.7 },
        { path: '/tools/dns-lookup', changeFrequency: 'monthly' as const, priority: 0.7 },
        { path: '/tools/ip-calculator', changeFrequency: 'monthly' as const, priority: 0.7 },
        { path: '/tools/bandwidth-calculator', changeFrequency: 'monthly' as const, priority: 0.7 },
        { path: '/tools/startup-guide', changeFrequency: 'weekly' as const, priority: 0.8 }
    ];

    const lastModified = new Date().toISOString();

    // Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

    for (const route of staticRoutes) {
        for (const locale of locales) {
            const url = `${baseUrl}/${locale}${route.path}`;

            xml += `  <url>
    <loc>${url}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${route.changeFrequency}</changefreq>
    <priority>${route.priority}</priority>
`;
            // Add hreflang alternates
            for (const altLocale of locales) {
                xml += `    <xhtml:link rel="alternate" hreflang="${altLocale}" href="${baseUrl}/${altLocale}${route.path}" />
`;
            }
            xml += `  </url>
`;
        }
    }

    xml += `</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=86400',
        },
    });
}
