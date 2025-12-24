/**
 * Website Indexer Bot - Queue Consumer Version
 * Indexes entire websites based on jobs from crawl_queue
 */

require('dotenv').config({ path: '.env.local' });
const { consumeQueue } = require('./lib/queue-consumer');
const { createClient } = require('@supabase/supabase-js');

// Import existing indexer logic (copying relevant parts to avoid complex imports for now)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

// --- Indexer Utils (reused from index-websites.js) ---
function extractTextContent(html) {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractTitle(html) {
    const match = html.match(/<title>([^<]+)<\/title>/i);
    return match ? match[1].trim() : '';
}

function extractDescription(html) {
    const match = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    return match ? match[1].trim() : '';
}

function extractInternalLinks(html, baseUrl) {
    const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    const links = new Set();
    let match;
    const baseHost = new URL(baseUrl).hostname;

    while ((match = linkRegex.exec(html)) !== null) {
        try {
            const href = match[1];
            if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
            const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
            const url = new URL(absoluteUrl);
            if (url.hostname === baseHost) {
                url.hash = '';
                links.add(url.toString());
            }
        } catch (e) { }
    }
    return Array.from(links);
}

async function fetchPage(url) {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Qrydex B2B Indexer/1.0' },
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) return null;
        const html = await response.text();
        return {
            url,
            title: extractTitle(html),
            description: extractDescription(html),
            content: extractTextContent(html).slice(0, 20000),
            html,
        };
    } catch (err) {
        return null;
    }
}

async function crawlEntireWebsite(startUrl, maxPages = 50) {
    const visited = new Set();
    const queue = [startUrl];
    const pages = [];

    while (queue.length > 0 && pages.length < maxPages) {
        const url = queue.shift();
        if (visited.has(url)) continue;
        visited.add(url);

        const page = await fetchPage(url);
        if (!page) continue;

        pages.push({
            url: page.url,
            title: page.title,
            description: page.description,
            content: page.content,
        });

        const links = extractInternalLinks(page.html, startUrl);
        for (const link of links) {
            if (!visited.has(link) && pages.length < maxPages) {
                queue.push(link);
            }
        }
        await new Promise(r => setTimeout(r, 500));
    }
    return pages;
}

function generateSearchText(pages, businessName) {
    const allText = [
        businessName,
        ...pages.map(p => `${p.title} ${p.description} ${p.content}`)
    ].join(' ');
    return allText.slice(0, 100000);
}

// --- Processor Function ---

async function indexProcessor(job) {
    const { url, business_id } = job;
    console.log(`Processing indexing job for: ${url}`);

    // Fetch business name for search vector
    const { data: business } = await supabase
        .from('businesses')
        .select('legal_name, quality_analysis')
        .eq('id', business_id)
        .single();

    if (!business) throw new Error('Business not found');

    // Crawl
    const pages = await crawlEntireWebsite(url, 50);

    if (pages.length === 0) throw new Error('No pages indexed');

    // Generate search text
    const searchText = generateSearchText(pages, business.legal_name);

    // Update business
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
        .eq('id', business_id);

    if (error) throw error;

    return { pagesIndexed: pages.length };
}

// Start consumer
consumeQueue('index', indexProcessor, { batchSize: 1, pollInterval: 5000 });
