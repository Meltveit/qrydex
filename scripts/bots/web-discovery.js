/**
 * Web Discovery Bot - Continuously crawls the web to find B2B businesses
 * Runs 24/7, validates org numbers, filters for B2B relevance
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

// Seed URLs - Business directories and B2B marketplaces
const SEED_URLS = [
    // Norwegian
    'https://www.proff.no/bransjer',
    'https://www.gulesider.no/bedrifter',

    // European
    'https://www.europages.com/companies/Norway.html',
    'https://www.europages.com/companies/Germany.html',
    'https://www.europages.com/companies/United-Kingdom.html',

    // Industry-specific
    'https://www.nho.no/medlemmer/',
    'https://www.norskteknologi.no/medlemmer/',
];

// B2B keywords for detection
const B2B_KEYWORDS = [
    'manufacturer', 'supplier', 'wholesale', 'distributor', 'b2b',
    'produsent', 'leverandør', 'grossist', 'enterprise', 'industrial',
    'software', 'iot', 'automation', 'logistics', 'export', 'import',
];

const NOISE_KEYWORDS = [
    'restaurant', 'hotel', 'blog', 'wordpress.com', 'wix.com',
    'facebook', 'instagram', 'personal', 'portfolio',
];

/**
 * Extract org/VAT numbers from HTML
 */
function extractOrgNumber(html, countryHint = 'NO') {
    // Norwegian (9 digits)
    if (countryHint === 'NO') {
        const patterns = [
            /org\.?\s*n(?:r|ummer)?\.?\s*:?\s*(\d{3}\s?\d{3}\s?\d{3})/gi,
            /organisasjonsnummer\.?\s*:?\s*(\d{3}\s?\d{3}\s?\d{3})/gi,
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                const orgNr = match[1].replace(/\s/g, '');
                if (orgNr.length === 9) {
                    return { type: 'NO', number: orgNr };
                }
            }
        }
    }

    // UK Company Number (8 digits)
    if (countryHint === 'GB') {
        const ukPattern = /company\s+number\.?\s*:?\s*(\d{8})/gi;
        const match = html.match(ukPattern);
        if (match) {
            return { type: 'GB', number: match[1] };
        }
    }

    return null;
}

/**
 * Check if page is B2B relevant
 */
function isB2BRelevant(html, url) {
    const lowerHtml = html.toLowerCase();
    const lowerUrl = url.toLowerCase();

    // Reject noise
    for (const noise of NOISE_KEYWORDS) {
        if (lowerUrl.includes(noise) || lowerHtml.includes(noise)) {
            return false;
        }
    }

    // Count B2B indicators
    let score = 0;
    for (const keyword of B2B_KEYWORDS) {
        if (lowerHtml.includes(keyword)) score++;
    }

    return score >= 2;
}

/**
 * Validate org number against Brønnøysund
 */
async function validateNorwegian(orgNr) {
    try {
        const response = await fetch(
            `https://data.brreg.no/enhetsregisteret/api/enheter/${orgNr}`
        );

        if (response.ok) {
            const data = await response.json();
            return {
                valid: true,
                name: data.navn,
                address: data.forretningsadresse?.adresse?.[0] || '',
                industryCode: data.naeringskode1?.kode,
            };
        }
    } catch (err) { }
    return { valid: false };
}

/**
 * Extract links from HTML
 */
function extractLinks(html, baseUrl) {
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

            // External links only (potential business websites)
            if (url.hostname !== baseHost &&
                !url.hostname.includes('facebook') &&
                !url.hostname.includes('linkedin') &&
                !url.hostname.includes('instagram')) {
                links.add(absoluteUrl);
            }
        } catch (e) { }
    }

    return Array.from(links);
}

/**
 * Crawl and discover businesses from a URL
 */
async function discoverFromUrl(url) {
    try {
        console.log(`Discovering from: ${url}`);

        const response = await fetch(url, {
            headers: { 'User-Agent': 'Qrydex B2B Indexer/1.0' },
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) return [];

        const html = await response.text();

        // Extract business links
        const links = extractLinks(html, url);
        console.log(`  Found ${links.length} potential business links`);

        const discovered = [];

        // Check each link
        for (const link of links.slice(0, 20)) { // Max 20 per seed
            try {
                const bizResponse = await fetch(link, {
                    headers: { 'User-Agent': 'Qrydex B2B Indexer/1.0' },
                    signal: AbortSignal.timeout(10000),
                });

                if (!bizResponse.ok) continue;

                const bizHtml = await bizResponse.text();

                // Check B2B relevance
                if (!isB2BRelevant(bizHtml, link)) {
                    console.log(`  ⚠️  Not B2B: ${link}`);
                    continue;
                }

                // Extract org number
                const orgData = extractOrgNumber(bizHtml, 'NO');
                if (!orgData) {
                    console.log(`  ⚠️  No org number: ${link}`);
                    continue;
                }

                // Validate
                const validation = await validateNorwegian(orgData.number);
                if (!validation.valid) {
                    console.log(`  ❌ Invalid org: ${orgData.number}`);
                    continue;
                }

                console.log(`  ✅ FOUND: ${validation.name} (${orgData.number})`);

                discovered.push({
                    org_number: orgData.number,
                    legal_name: validation.name,
                    country_code: 'NO',
                    domain: new URL(link).hostname.replace('www.', ''),
                    registry_data: {
                        org_nr: orgData.number,
                        legal_name: validation.name,
                        registered_address: validation.address,
                        industry_codes: validation.industryCode ? [validation.industryCode] : [],
                    },
                    trust_score: 60,
                    verification_status: 'verified',
                    website_status: 'active',
                });

                await new Promise(r => setTimeout(r, 1000)); // Rate limit
            } catch (err) {
                console.log(`  ❌ Error checking ${link}`);
            }
        }

        return discovered;
    } catch (err) {
        console.error(`Error discovering from ${url}:`, err.message);
        return [];
    }
}

/**
 * Main discovery loop
 */
async function runDiscovery(iterations = 1) {
    console.log('🌐 Web Discovery Bot Starting...\n');

    let totalDiscovered = 0;
    let totalAdded = 0;

    for (let i = 0; i < iterations; i++) {
        console.log(`\n=== Iteration ${i + 1}/${iterations} ===\n`);

        for (const seedUrl of SEED_URLS.slice(0, 2)) { // Start with 2 seeds
            const discovered = await discoverFromUrl(seedUrl);
            totalDiscovered += discovered.length;

            // Add to database
            for (const business of discovered) {
                try {
                    // Check if exists
                    const { data: existing } = await supabase
                        .from('businesses')
                        .select('org_number')
                        .eq('org_number', business.org_number)
                        .single();

                    if (existing) {
                        console.log(`  ⚠️  Already exists: ${business.legal_name}`);
                        continue;
                    }

                    // Insert
                    const { error } = await supabase
                        .from('businesses')
                        .insert(business);

                    if (!error) {
                        console.log(`  ✓ ADDED: ${business.legal_name}`);
                        totalAdded++;

                        // Log discovery
                        await supabase.from('crawl_logs').insert({
                            bot_name: 'web-discovery',
                            action: 'business_discovered',
                            url: `https://${business.domain}`,
                            details: { org_number: business.org_number },
                            success: true,
                        });
                    }
                } catch (err) {
                    console.error(`  ❌ DB Error: ${err.message}`);
                }
            }

            await new Promise(r => setTimeout(r, 5000)); // 5sec between seeds
        }
    }

    console.log(`\n📊 Discovery Summary:`);
    console.log(`   Discovered: ${totalDiscovered}`);
    console.log(`   Added: ${totalAdded}`);
}

// Run discovery
const iterations = parseInt(process.argv[2]) || 1;
runDiscovery(iterations).then(() => {
    console.log('\n✅ Web discovery completed!');
}).catch(console.error);
