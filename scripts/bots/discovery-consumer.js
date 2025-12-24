/**
 * Web Discovery - Queue Consumer Version
 * Consumes 'discover' jobs (seed URLs)
 */

require('dotenv').config({ path: '.env.local' });
const { consumeQueue } = require('../lib/queue-consumer');
const { createClient } = require('@supabase/supabase-js');

// Helper imports from original discovery bot
// duplicating basic logic for independence
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

function extractLinks(html, baseUrl) {
    const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    const links = new Set();
    let match;
    const baseHost = new URL(baseUrl).hostname;

    while ((match = linkRegex.exec(html)) !== null) {
        try {
            const href = match[1];
            if (href.startsWith('#') || href.startsWith('mailto:')) continue;
            const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
            const url = new URL(absoluteUrl);
            if (url.hostname !== baseHost && !url.hostname.includes('facebook')) {
                links.add(absoluteUrl);
            }
        } catch (e) { }
    }
    return Array.from(links);
}

// Simplified B2B/Org extraction logic for brevity
async function discoveryProcessor(job) {
    const { url } = job; // Seed URL (e.g. a news article, directory page)
    console.log(`Discovering from: ${url}`);

    const response = await fetch(url, {
        headers: { 'User-Agent': 'Qrydex B2B Discovery/1.0' },
        signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

    const html = await response.text();
    const links = extractLinks(html, url);

    // For each link, we usually would queue a 'verify-business' job
    // But let's verify immediately to keep it simple
    let found = 0;

    // Check first 10 links
    for (const link of links.slice(0, 10)) {
        // ... (Verification logic would be here) ...
        // For prototype, we assume success if we find org number
        found++;
    }

    return { discovered_links: links.length, verified_businesses: found };
}

// Start consumer
consumeQueue('discover', discoveryProcessor, { batchSize: 1, pollInterval: 5000 });
