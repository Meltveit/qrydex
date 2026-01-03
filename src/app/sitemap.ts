// app/sitemap/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { routing } from '@/i18n/routing';

const BUSINESSES_PER_SITEMAP = 1000;

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    const effectiveId = isNaN(id) ? 0 : id;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';
    const locales = routing.locales;

    const start = effectiveId * BUSINESSES_PER_SITEMAP;
    const end = start + BUSINESSES_PER_SITEMAP - 1;

    let xmlUrls: string[] = [];

    // Helper function to generate hreflang links
    const generateHreflangLinks = (path: string): string => {
        return locales
            .map(locale =>
                `    <xhtml:link rel="alternate" hreflang="${locale}" href="${baseUrl}/${locale}${path}"/>`
            )
            .join('\n');
    };

    // 1. Static Pages - Only in first sitemap (id 0)
    if (effectiveId === 0) {
        const staticRoutes = [
            { path: '', changeFreq: 'daily', priority: 1.0 },
            { path: '/search', changeFreq: 'always', priority: 0.9 },
            { path: '/verify', changeFreq: 'monthly', priority: 0.7 },
            { path: '/tools/dns-lookup', changeFreq: 'monthly', priority: 0.7 },
            { path: '/tools/ip-calculator', changeFreq: 'monthly', priority: 0.7 },
            { path: '/tools/bandwidth-calculator', changeFreq: 'monthly', priority: 0.7 }
        ];

        for (const route of staticRoutes) {
            for (const locale of locales) {
                const url = `  <url>
    <loc>${baseUrl}/${locale}${route.path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${route.changeFreq}</changefreq>
    <priority>${route.priority}</priority>
${generateHreflangLinks(route.path)}
  </url>`;
                xmlUrls.push(url);
            }
        }
    }

    // 2. Dynamic Business Pages
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
            console.log(`Sitemap ${effectiveId}: Processing ${businesses.length} businesses`);

            for (const business of businesses) {
                const path = `/business/${business.org_number}`;
                const priority = business.trust_score > 70 ? 0.8 : 0.6;

                for (const locale of locales) {
                    const url = `  <url>
    <loc>${baseUrl}/${locale}${path}</loc>
    <lastmod>${new Date(business.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
${generateHreflangLinks(path)}
  </url>`;
                    xmlUrls.push(url);
                }
            }
        }
    } catch (error) {
        console.error(`Error generating sitemap ${effectiveId}:`, error);
    }

    // Generate XML with proper formatting
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${xmlUrls.join('\n')}
</urlset>`;

    return new NextResponse(xml, {
        status: 200,
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
        }
    });
}

// Generate static params for all sitemaps at build time
export async function generateStaticParams() {
    try {
        const { count } = await supabase
            .from('businesses')
            .select('org_number', { count: 'exact', head: true });

        const numberOfSitemaps = Math.max(1, Math.ceil((count || 0) / BUSINESSES_PER_SITEMAP));

        return Array.from({ length: numberOfSitemaps }, (_, i) => ({
            id: i.toString()
        }));
    } catch (error) {
        console.error('Error generating sitemap params:', error);
        return [{ id: '0' }];
    }
}