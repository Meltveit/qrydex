/**
 * Web Crawler - Crawls the internet to find and verify B2B businesses
 * 
 * Flow:
 * 1. Start from seed URLs (directories, industry lists)
 * 2. Find business websites
 * 3. Extract VAT/Org numbers from websites
 * 4. Validate against official registries
 * 5. Add verified businesses, reject invalid ones
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

// Seed URLs - Business directories and industry pages
const SEED_URLS = [
    // Norwegian business directories
    'https://www.proff.no/bransjer',
    'https://www.gulesider.no/bedrifter',

    // Industry-specific
    'https://www.nho.no/medlemmer/',
    'https://www.norskteknologi.no/medlemmer/',
];

// B2B keywords to identify relevant businesses
const B2B_KEYWORDS = [
    'produsent', 'leverandør', 'grossist', 'distributør', 'manufacturer',
    'supplier', 'wholesale', 'b2b', 'industri', 'enterprise', 'solutions',
    'it-solutions', 'iot', 'tech', 'software', 'hardware', 'data center',
    'entreprenør', 'transport', 'logistikk', 'warehouse', 'export', 'import'
];

// Non-B2B keywords to filter out (blogs, personal sites, etc.)
const NOISE_KEYWORDS = [
    'blog', 'wordpress', 'wix', 'squarespace', 'personal', 'portfolio',
    'forum', 'nyheter', 'news', 'avis', 'facebook', 'instagram', 'youtube'
];

/**
 * Extract org/VAT number from website HTML
 */
function extractOrgNumber(html, domain) {
    // Norwegian org numbers (9 digits)
    const noPatterns = [
        /org\.?\s*n(?:r|ummer)?\.?\s*:?\s*(\d{3}\s?\d{3}\s?\d{3})/gi,
        /organisasjonsnummer\.?\s*:?\s*(\d{3}\s?\d{3}\s?\d{3})/gi,
        /foretaksnummer\.?\s*:?\s*(\d{3}\s?\d{3}\s?\d{3})/gi,
    ];

    // EU VAT patterns
    const vatPatterns = [
        /VAT\.?\s*:?\s*([A-Z]{2}\d{8,12})/gi,
        /MVA\.?\s*:?\s*(\d{9})MVA/gi,
    ];

    for (const pattern of noPatterns) {
        const match = pattern.exec(html);
        if (match) {
            const orgNr = match[1].replace(/\s/g, '');
            if (orgNr.length === 9) {
                return { type: 'NO', number: orgNr };
            }
        }
    }

    for (const pattern of vatPatterns) {
        const match = pattern.exec(html);
        if (match) {
            return { type: 'VAT', number: match[1] };
        }
    }

    return null;
}

/**
 * Extract company name from website
 */
function extractCompanyName(html) {
    // Try various patterns
    const patterns = [
        /<title>([^<|–-]+)/i,
        /<meta\s+property="og:site_name"\s+content="([^"]+)"/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
    ];

    for (const pattern of patterns) {
        const match = pattern.exec(html);
        if (match) {
            return match[1].trim().replace(/\s*[-|–].*$/, '').trim();
        }
    }
    return null;
}

/**
 * Check if page is B2B relevant (not a blog/personal site)
 */
function isB2BRelevant(html, url) {
    const lowerHtml = html.toLowerCase();
    const lowerUrl = url.toLowerCase();

    // Check for noise keywords
    for (const keyword of NOISE_KEYWORDS) {
        if (lowerUrl.includes(keyword)) return false;
    }

    // Check for B2B keywords
    let b2bScore = 0;
    for (const keyword of B2B_KEYWORDS) {
        if (lowerHtml.includes(keyword)) b2bScore++;
    }

    return b2bScore >= 2; // At least 2 B2B keywords
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
                status: data.organisasjonsform?.kode === 'AS' ? 'Active' : 'Unknown',
                address: data.forretningsadresse?.adresse?.[0] || '',
            };
        }
        return { valid: false };
    } catch (err) {
        return { valid: false };
    }
}

/**
 * Crawl a single website
 */
async function crawlWebsite(url) {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Qrydex B2B Indexer/1.0' },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) return null;

        const html = await response.text();

        // Check if B2B relevant
        if (!isB2BRelevant(html, url)) {
            console.log(`  ⚠️  Not B2B relevant: ${url}`);
            return null;
        }

        // Extract org number
        const orgData = extractOrgNumber(html, url);
        if (!orgData) {
            console.log(`  ⚠️  No org number found: ${url}`);
            return null;
        }

        // Validate against registry
        let validation = null;
        if (orgData.type === 'NO') {
            validation = await validateNorwegian(orgData.number);
        }

        if (!validation?.valid) {
            console.log(`  ❌ Org number invalid: ${orgData.number}`);
            return null;
        }

        // Extract domain
        const domain = new URL(url).hostname.replace('www.', '');

        return {
            org_number: orgData.number,
            legal_name: validation.name || extractCompanyName(html),
            country_code: 'NO',
            domain: domain,
            registry_data: {
                org_nr: orgData.number,
                legal_name: validation.name,
                registered_address: validation.address,
                company_status: validation.status,
            },
            quality_analysis: {
                website_url: url,
                has_ssl: url.startsWith('https'),
                website_scraped: true,
                scraped_at: new Date().toISOString(),
            },
            trust_score: 60, // Good baseline - has website + registry verified
            verification_status: 'verified',
        };
    } catch (err) {
        console.log(`  ❌ Error crawling: ${url}`, err.message);
        return null;
    }
}

/**
 * Find business links from a directory page
 */
async function findBusinessLinks(directoryUrl) {
    try {
        const response = await fetch(directoryUrl, {
            headers: { 'User-Agent': 'Qrydex B2B Indexer/1.0' },
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) return [];

        const html = await response.text();

        // Extract external links (potential business websites)
        const linkRegex = /href="(https?:\/\/[^"]+)"/gi;
        const links = [];
        let match;

        while ((match = linkRegex.exec(html)) !== null) {
            const url = match[1];
            // Filter: external links, not social media, looks like company
            if (!url.includes('facebook') &&
                !url.includes('linkedin') &&
                !url.includes('twitter') &&
                !url.includes('youtube') &&
                url.includes('.no') || url.includes('.com')) {
                links.push(url);
            }
        }

        return [...new Set(links)].slice(0, 50); // Max 50 unique links
    } catch (err) {
        return [];
    }
}

/**
 * Main web crawler
 */
async function runWebCrawler(maxBusinesses = 50) {
    console.log('🕷️  Web Crawler Starting...\n');
    console.log('Searching for B2B businesses with verifiable org numbers...\n');

    let verified = 0;
    let rejected = 0;
    let checked = 0;

    // Also try some known B2B company URLs directly
    const directUrls = [
        'https://www.kongsberg.com',
        'https://www.visma.no',
        'https://www.atea.no',
        'https://www.crayon.com',
        'https://www.evry.no',
        'https://www.bouvet.no',
        'https://www.computas.com',
        'https://www.bekk.no',
        'https://www.miles.no',
        'https://www.kantega.no',
        'https://www.abb.com/no',
        'https://www.siemens.no',
        'https://www.schneider-electric.no',
        'https://www.telenor.no',
        'https://www.elkem.com',
        'https://www.yara.com',
        'https://www.norskhydro.com',
        'https://www.equinor.com',
        'https://www.dnv.com',
    ];

    for (const url of directUrls) {
        if (verified >= maxBusinesses) break;
        checked++;

        console.log(`Checking: ${url}`);
        const business = await crawlWebsite(url);

        if (business) {
            // Check if already exists
            const { data: existing } = await supabase
                .from('businesses')
                .select('org_number')
                .eq('org_number', business.org_number)
                .single();

            if (existing) {
                console.log(`  ⚠️  Already indexed: ${business.legal_name}\n`);
                continue;
            }

            // Insert
            const { error } = await supabase
                .from('businesses')
                .insert(business);

            if (!error) {
                console.log(`  ✓ VERIFIED & ADDED: ${business.legal_name} (${business.org_number})\n`);
                verified++;
            } else {
                console.log(`  ❌ DB Error: ${error.message}\n`);
                rejected++;
            }
        } else {
            rejected++;
        }

        await new Promise(r => setTimeout(r, 1000)); // Rate limit
    }

    console.log('\n📊 Results:');
    console.log(`   Checked: ${checked}`);
    console.log(`   Verified & Added: ${verified}`);
    console.log(`   Rejected: ${rejected}`);
}

/**
 * Remove businesses without valid websites
 */
async function cleanupInvalidBusinesses() {
    console.log('\n🧹 Cleaning up invalid businesses...\n');

    const { data: businesses } = await supabase
        .from('businesses')
        .select('id, legal_name, domain, trust_score')
        .lt('trust_score', 30);

    if (!businesses?.length) {
        console.log('No low-trust businesses to review.');
        return;
    }

    console.log(`Found ${businesses.length} low-trust businesses to review.`);
    // Could delete them here if needed
}

// Run
runWebCrawler(30).then(() => {
    console.log('\n✅ Web crawler finished!');
}).catch(console.error);
