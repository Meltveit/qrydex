/**
 * Full-Site Indexer
 * Deep crawls entire business websites and indexes all content for search
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

/**
 * Extract all text content from HTML
 */
function extractTextContent(html) {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract title from HTML
 */
function extractTitle(html) {
    const match = html.match(/<title>([^<]+)<\/title>/i);
    return match ? match[1].trim() : '';
}

/**
 * Extract meta description
 */
function extractDescription(html) {
    const match = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    return match ? match[1].trim() : '';
}

/**
 * Extract internal links from HTML
 */
function extractInternalLinks(html, baseUrl) {
    const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    const links = new Set();
    let match;

    const baseHost = new URL(baseUrl).hostname;

    while ((match = linkRegex.exec(html)) !== null) {
        try {
            const href = match[1];

            // Skip anchors, mailto, tel
            if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;

            // Make absolute URL
            const absoluteUrl = href.startsWith('http')
                ? href
                : new URL(href, baseUrl).toString();

            const url = new URL(absoluteUrl);

            // Only same domain
            if (url.hostname === baseHost) {
                // Remove hash
                url.hash = '';
                links.add(url.toString());
            }
        } catch (e) {
            // Invalid URL, skip
        }
    }

    return Array.from(links);
}

/**
 * Fetch and parse a single page
 */
async function fetchPage(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Qrydex B2B Indexer/1.0',
            },
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) return null;

        const html = await response.text();

        return {
            url,
            title: extractTitle(html),
            description: extractDescription(html),
            content: extractTextContent(html).slice(0, 20000), // Limit per page
            html, // Keep for link extraction
        };
    } catch (err) {
        console.log(`  ⚠️  Failed to fetch: ${url}`);
        return null;
    }
}

/**
 * Crawl entire website (breadth-first, max depth)
 */
async function crawlEntireWebsite(startUrl, maxPages = 50) {
    console.log(`\n🕷️  Full-site crawl: ${startUrl}`);

    const visited = new Set();
    const queue = [startUrl];
    const pages = [];

    while (queue.length > 0 && pages.length < maxPages) {
        const url = queue.shift();

        if (visited.has(url)) continue;
        visited.add(url);

        console.log(`  Crawling [${pages.length + 1}/${maxPages}]: ${url}`);

        const page = await fetchPage(url);
        if (!page) continue;

        // Save page data (without html)
        pages.push({
            url: page.url,
            title: page.title,
            description: page.description,
            content: page.content,
        });

        // Find more links to crawl
        const links = extractInternalLinks(page.html, startUrl);
        for (const link of links) {
            if (!visited.has(link) && pages.length < maxPages) {
                queue.push(link);
            }
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`  ✓ Indexed ${pages.length} pages`);
    return pages;
}

/**
 * Generate full-text search index from all pages
 */
function generateSearchText(pages, businessName) {
    const allText = [
        businessName, // Company name first (highest weight)
        ...pages.map(p => `${p.title} ${p.description} ${p.content}`)
    ].join(' ');

    return allText.slice(0, 100000); // Limit total size
}

/**
 * Index businesses that have domains but aren't fully indexed yet
 */
async function indexBusinessWebsites(limit = 10) {
    console.log('📚 Full-Site Indexer Starting...\n');

    // Find businesses with domain but not fully indexed
    const { data: businesses } = await supabase
        .from('businesses')
        .select('id, org_number, legal_name, domain, quality_analysis')
        .not('domain', 'is', null)
        .is('quality_analysis->indexed_pages', null)
        .limit(limit);

    if (!businesses || businesses.length === 0) {
        console.log('No businesses to index.');
        return;
    }

    console.log(`Found ${businesses.length} businesses to fully index\n`);

    let indexed = 0;
    let failed = 0;

    for (const business of businesses) {
        try {
            const websiteUrl = business.domain.startsWith('http')
                ? business.domain
                : `https://${business.domain}`;

            // Crawl entire website
            const pages = await crawlEntireWebsite(websiteUrl, 50);

            if (pages.length === 0) {
                failed++;
                console.log(`  ❌ No pages found for ${business.legal_name}\n`);
                continue;
            }

            // Generate full search text
            const searchText = generateSearchText(pages, business.legal_name);

            // Update database with indexed content
            const { error } = await supabase
                .from('businesses')
                .update({
                    quality_analysis: {
                        ...(business.quality_analysis || {}),
                        indexed_pages: pages,
                        total_pages: pages.length,
                        last_indexed: new Date().toISOString(),
                        full_text_indexed: searchText,
                    },
                })
                .eq('id', business.id);

            if (error) {
                console.error(`  ❌ DB Error for ${business.legal_name}:`, error.message);
                failed++;
            } else {
                console.log(`  ✅ INDEXED: ${business.legal_name} - ${pages.length} pages\n`);
                indexed++;
            }

            // Longer pause between full site crawls
            await new Promise(r => setTimeout(r, 3000));
        } catch (err) {
            console.error(`  ❌ Error indexing ${business.legal_name}:`, err.message);
            failed++;
        }
    }

    console.log('\n📊 Indexing Results:');
    console.log(`   Indexed: ${indexed}`);
    console.log(`   Failed: ${failed}`);
}

// Run indexer
indexBusinessWebsites(10).then(() => {
    console.log('\n✅ Full-site indexing completed!');
}).catch(console.error);
