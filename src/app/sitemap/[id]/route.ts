import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-static';
export const revalidate = 86400; // 1 day

const BUSINESSES_PER_CHUNK = 150;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const chunkId = parseInt(id.replace('.xml', ''), 10);

    if (isNaN(chunkId) || chunkId < 0) {
        return new Response('Invalid chunk ID', { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://qrydex.com';
    const locales = routing.locales;

    // Map country codes to native locales
    const countryToLocale: Record<string, string> = {
        'NO': 'no',
        'SE': 'sv',
        'DK': 'da',
        'FI': 'fi',
        'DE': 'de',
        'FR': 'fr',
        'ES': 'es',
        'US': 'en',
        'GB': 'en',
        'AU': 'en',
        'CA': 'en',
    };

    const offset = chunkId * BUSINESSES_PER_CHUNK;

    try {
        // Fetch businesses for this chunk with pagination
        const { data: businesses, error } = await supabase
            .from('businesses')
            .select('org_number, updated_at, trust_score, country_code, translations')
            .order('org_number', { ascending: true })
            .range(offset, offset + BUSINESSES_PER_CHUNK - 1);

        if (error) {
            console.error(`Error fetching chunk ${chunkId}:`, error);
            return new Response('Error fetching sitemap data', { status: 500 });
        }

        if (!businesses || businesses.length === 0) {
            // Return empty sitemap for out-of-range chunks
            return new Response(
                `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
</urlset>`,
                {
                    headers: {
                        'Content-Type': 'application/xml',
                        'Cache-Control': 'public, max-age=86400',
                    },
                }
            );
        }

        // Generate XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

        for (const business of businesses) {
            const path = `/business/${business.org_number}`;
            const priority = business.trust_score > 70 ? 0.8 : 0.6;
            const countryCode = business.country_code?.toUpperCase() || 'NO';

            const nativeLocale = countryToLocale[countryCode] || 'en';
            const validLocales = new Set<string>();

            if (locales.includes(nativeLocale as any)) {
                validLocales.add(nativeLocale);
            } else {
                validLocales.add('en');
            }

            if (business.translations && typeof business.translations === 'object') {
                Object.keys(business.translations).forEach(code => {
                    if (locales.includes(code as any)) validLocales.add(code);
                });
            }

            if (validLocales.size === 0) validLocales.add('en');
            const validLocalesArray = Array.from(validLocales);

            for (const locale of validLocalesArray) {
                const url = `${baseUrl}/${locale}${path}`;
                const lastmod = new Date(business.updated_at).toISOString();

                xml += `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
`;
                // Add hreflang alternates
                for (const altLocale of validLocalesArray) {
                    xml += `    <xhtml:link rel="alternate" hreflang="${altLocale}" href="${baseUrl}/${altLocale}${path}" />
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
    } catch (error) {
        console.error(`Critical error generating chunk ${chunkId}:`, error);
        return new Response('Internal server error', { status: 500 });
    }
}
