import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // 1 day

const BUSINESSES_PER_CHUNK = 3000;

export async function GET(request: NextRequest) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';

    try {
        // Count total businesses to determine number of chunks needed
        const { count, error: countError } = await supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('Error counting businesses:', countError);
            return new Response('Error generating sitemap index', { status: 500 });
        }

        const totalBusinesses = count || 0;
        const totalChunks = Math.ceil(totalBusinesses / BUSINESSES_PER_CHUNK);
        const lastModified = new Date().toISOString();

        // Generate Sitemap Index XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

        // Add static pages sitemap
        xml += `  <sitemap>
    <loc>${baseUrl}/sitemap/static.xml</loc>
    <lastmod>${lastModified}</lastmod>
  </sitemap>
`;

        // Add business chunks
        for (let i = 0; i < totalChunks; i++) {
            xml += `  <sitemap>
    <loc>${baseUrl}/sitemap/${i}.xml</loc>
    <lastmod>${lastModified}</lastmod>
  </sitemap>
`;
        }

        xml += `</sitemapindex>`;

        return new Response(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=UTF-8',
                'Content-Disposition': 'inline',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch (error) {
        console.error('Critical error generating sitemap index:', error);
        return new Response('Internal server error', { status: 500 });
    }
}
