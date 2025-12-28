/**
 * Website Discovery v2.0 - Google-Level Performance
 * Automatically finds missing websites for businesses using multiple strategies
 */

import { createServerClient } from '../supabase';
import { generateText } from '../ai/gemini-client';
import pLimit from 'p-limit';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONCURRENCY_LIMIT = 30; // Test many domains simultaneously
const TIMEOUT_MS = 4000; // Faster timeout for domain checks
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
];

// ============================================================================
// DOMAIN GENERATION - SMART HEURISTICS
// ============================================================================

/**
 * Clean company name for domain search
 */
function cleanCompanyName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+(as|asa|sa|ab|oy|oyj|aps|a\/s|gmbh|ltd|limited|inc|corp|llc|nv|bv|srl|spa|sarl)$/i, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

/**
 * Generate acronym from company name (e.g. "Digital Marketing Solutions" -> "dms")
 */
function generateAcronym(name: string): string | null {
    const words = name.split(' ').filter(w => w.length > 0 && !['as', 'asa', 'ab', 'the', 'and', 'of'].includes(w.toLowerCase()));

    if (words.length < 2 || words.length > 5) return null;

    return words.map(w => w[0].toLowerCase()).join('');
}

/**
 * Generate comprehensive domain candidates using advanced heuristics
 */
function generateDomainCandidates(companyName: string, country: string): string[] {
    const patterns: string[] = [];

    // Country-specific TLDs (Priority Order)
    const countryTLDs: Record<string, string[]> = {
        'NO': ['.no'],
        'SE': ['.se'],
        'DK': ['.dk'],
        'FI': ['.fi'],
        'DE': ['.de'],
        'FR': ['.fr'],
        'ES': ['.es'],
        'GB': ['.co.uk'],
        'US': ['.com'],
    };
    const globalTLDs = ['.com', '.net', '.io', '.eu'];

    const tlds = [...(countryTLDs[country] || []), ...globalTLDs];

    // Base variations
    const words = companyName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().split(/\s+/);
    const cleanFull = cleanCompanyName(companyName);
    const firstWord = words[0];
    const acronym = generateAcronym(companyName);

    // Generate candidates for each TLD
    for (const tld of tlds) {
        // 1. Full Cleaned Name (Highest Priority)
        // "Norsk Kylling" -> "norskkylling.no"
        if (cleanFull.length > 3 && cleanFull.length < 35) {
            patterns.push(`${cleanFull}${tld}`);
        }

        // 2. Acronym (e.g. "DMS" -> "dms.no") - Risky but good for big corps
        if (acronym && acronym.length >= 3) {
            patterns.push(`${acronym}${tld}`);
        }

        // 3. First Word (if unique enough, e.g. "Equinor")
        if (firstWord && firstWord.length > 4 && !['norsk', 'svensk', 'dansk', 'nordic'].includes(firstWord)) {
            patterns.push(`${firstWord}${tld}`);
        }

        // 4. Name with hyphens
        if (words.length > 1) {
            patterns.push(`${words.join('-')}${tld}`);
        }
    }

    // Deduplicate and return (limit to top 15 most likely to save time)
    return [...new Set(patterns)].slice(0, 15);
}

// ============================================================================
// DOMAIN VALIDATION
// ============================================================================

/**
 * Check if domain exists and is reachable (with retry)
 */
async function isDomainReachable(domain: string): Promise<boolean> {
    const tryFetch = async (protocol: 'https' | 'http'): Promise<boolean> => {
        try {
            const url = `${protocol}://${domain.replace(/^(https?:\/\/)/, '')}`;
            // Reduced timeout to 3s for speed
            const response = await fetch(url, {
                method: 'HEAD',
                signal: AbortSignal.timeout(3000),
                headers: {
                    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
                }
            });
            return response.ok || response.status === 403; // 403 = exists but blocking bots
        } catch {
            return false;
        }
    };

    // Try HTTPS first, then HTTP
    if (await tryFetch('https')) return true;
    return await tryFetch('http');
}

/**
 * Verify website belongs to the company
 */
async function verifyWebsite(domain: string, orgNumber: string, companyName: string): Promise<boolean> {
    try {
        const url = domain.startsWith('http') ? domain : `https://${domain}`;
        const response = await fetch(url, {
            signal: AbortSignal.timeout(6000), // 6s timeout
            headers: {
                'User-Agent': USER_AGENTS[0]
            }
        });

        if (!response.ok) return false;

        const html = (await response.text()).toLowerCase();
        const cleanOrgNumber = orgNumber.replace(/\s/g, '');

        // 1. Strict verification: Org Number
        if (html.includes(cleanOrgNumber) || html.includes(orgNumber)) return true;

        // 2. Title / Copyright Verification (Looser than before)
        const cleanName = companyName.toLowerCase()
            .replace(/\s+(as|asa|ab|gmbh|ltd|inc|oy|aps)$/i, '')
            .trim();

        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1].toLowerCase().includes(cleanName)) return true;

        // Check fuzzy match on domain
        if (domain.includes(cleanName.replace(/[^a-z0-9]/g, ''))) return true;

        return false;
    } catch {
        return false;
    }
}

// ============================================================================
// WEB SEARCH INTEGRATION (ENHANCED)
// ============================================================================

/**
 * Search Google for company website (Experimental scraping)
 * Uses high-risk scraping, extensive error handling required.
 */
async function searchGoogle(companyName: string, country: string): Promise<string | null> {
    const query = encodeURIComponent(`${companyName} ${country} official website`);
    const strategies = [
        `https://www.google.com/search?q=${query}&hl=en&num=3`,
        `https://www.google.no/search?q=${query}&hl=no&num=3` // Try local google
    ];

    for (const url of strategies) {
        try {
            // console.log(`    Trying Google search...`);
            const response = await fetch(url, {
                headers: {
                    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'https://www.google.com/'
                },
                signal: AbortSignal.timeout(6000)
            });

            if (!response.ok) continue;

            const html = await response.text();

            // Extract URL from Google's specific format (usually in <a href="/url?q=..."> or just <a href="...">)
            // Modern Google often puts main link in <div class="yuRUbf"><a href="...">
            const match = html.match(/<a href="\/url\?q=([^&]+)/) || html.match(/<a href="(https:\/\/[^"]+)"/);

            if (match) {
                let foundUrl = match[1];
                if (foundUrl.startsWith('/url?q=')) foundUrl = foundUrl.split('/url?q=')[1].split('&')[0];

                try {
                    const urlObj = new URL(decodeURIComponent(foundUrl));
                    const domain = urlObj.hostname.replace('www.', '');

                    // Filter junk
                    const junkDomains = ['google', 'facebook', 'linkedin', 'instagram', 'twitter', 'proff.no', '1881.no', 'gulesider.no', 'purehelp.no', 'allabolag.se'];
                    if (!junkDomains.some(j => domain.includes(j))) {
                        return domain;
                    }
                } catch { }
            }
        } catch (e) { }

        await new Promise(r => setTimeout(r, 1000));
    }
    return null;
}

/**
 * Search DuckDuckGo HTML for company website
 * Retries with multiple query variations
 */
async function searchDuckDuckGo(companyName: string, country: string, city?: string): Promise<string | null> {

    // Better queries for finding OFFICIAL site
    const strategies = [
        `${companyName} ${country} official site`,
        `${companyName} ${city || ''} contact`,
    ];

    for (const queryStr of strategies) {
        try {
            // console.log(`    Trying DDG search: "${queryStr}"`);
            const query = encodeURIComponent(queryStr);
            const url = `https://html.duckduckgo.com/html/?q=${query}`;

            const response = await fetch(url, {
                signal: AbortSignal.timeout(5000),
                headers: {
                    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });

            if (!response.ok) continue;

            const html = await response.text();

            // Extract result URLs
            // DDG HTML uses specific redirect links
            const linkMatches = html.matchAll(/class="result__a" href="([^"]+)"/g);

            for (const match of linkMatches) {
                // Determine actual URL (DDG often returns direct or redirect)
                // In HTML version, it's often a direct link or /l/?uddg=...
                let rawUrl = match[1];
                if (rawUrl.startsWith('//')) rawUrl = 'https:' + rawUrl;
                if (rawUrl.startsWith('/l/?uddg=')) {
                    rawUrl = decodeURIComponent(rawUrl.split('=')[1]);
                }

                // Clean URL
                try {
                    const urlObj = new URL(rawUrl);
                    const domain = urlObj.hostname.replace('www.', '');

                    // FILTER OUT JUNK (Directores, Social, News, etc.)
                    const junkDomains = ['facebook', 'linkedin', 'instagram', 'twitter', 'proff.no', '1881.no', 'gulesider.no', 'purehelp.no', 'allabolag.se', 'eniro.se', 'hitta.se', 'yelp', 'tripadvisor', 'wikipedia', 'bloomberg'];
                    if (junkDomains.some(j => domain.includes(j))) continue;

                    return domain; // Return first valid domain
                } catch { }
            }
        } catch (error) {
            // console.error('    DDG search error:', error);
        }
        await new Promise(r => setTimeout(r, 500));
    }
    return null;
}

/**
 * Find Social Media Profiles (LinkedIn, Facebook)
 * This doesn't find the website directly but fills the social_media JSONB
 */
async function findSocialMedia(companyName: string, country: string): Promise<Record<string, string>> {
    const socialLinks: Record<string, string> = {};

    // Only search LinkedIn for speed
    try {
        const query = encodeURIComponent(`site:linkedin.com/company ${companyName} ${country}`);
        const url = `https://html.duckduckgo.com/html/?q=${query}`;
        const response = await fetch(url, { headers: { 'User-Agent': USER_AGENTS[0] } });
        const html = await response.text();
        const match = html.match(/class="result__a" href="([^"]+)"/); // Updated regex
        if (match) {
            let rawUrl = match[1];
            if (rawUrl.startsWith('/l/?uddg=')) rawUrl = decodeURIComponent(rawUrl.split('=')[1]);
            if (rawUrl.includes('linkedin.com/company')) {
                socialLinks.linkedin = rawUrl;
            }
        }
    } catch { }

    return socialLinks;
}

/**
 * Use Gemini AI to search for company website (fallback)
 */
async function searchWithGemini(companyName: string, orgNumber: string, country: string, city?: string): Promise<string | null> {
    try {
        const prompt = `Find the official website for this company:
        
Company Name: ${companyName}
Location: ${city ? city + ', ' : ''}${country}

Search using your tools. Return ONLY the domain (e.g. "example.com").
If NOT FOUND or only social media, return "NOT_FOUND".`;

        const response = await generateText(prompt);
        if (!response) return null;

        const domain = response.trim().toLowerCase();
        if (domain.includes('not_found') || domain.includes(' ') || domain.length > 60) return null;

        return domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    } catch (error) {
        return null;
    }
}

// ============================================================================
// MAIN DISCOVERY LOGIC
// ============================================================================

/**
 * Discover website for a single business - Parallel Strategy
 */
export async function discoverWebsite(businessId: string): Promise<string | null> {
    const supabase = createServerClient();
    const startTime = Date.now();

    const { data: business } = await supabase
        .from('businesses')
        .select('id, legal_name, org_number, country_code, registry_data')
        .eq('id', businessId)
        .single();

    if (!business) return null;

    const city = business.registry_data?.city || business.registry_data?.registered_address;

    console.log(`\n🔍 Discovering website for: ${business.legal_name} (${business.country_code})`);

    // ========================================================================
    // PHASE 1: Parallel Domain Testing (Lightning Fast!)
    // ========================================================================

    const candidates = generateDomainCandidates(business.legal_name, business.country_code);
    const limit = pLimit(20); // Concurrency

    // Test candidates
    const results = await Promise.all(
        candidates.map(domain =>
            limit(async () => {
                if (await isDomainReachable(domain)) {
                    if (await verifyWebsite(domain, business.org_number, business.legal_name)) {
                        return domain;
                    }
                }
                return null;
            })
        )
    );

    const verifiedDomain = results.find(d => d !== null);

    if (verifiedDomain) {
        await supabase
            .from('businesses')
            .update({ domain: verifiedDomain.replace('www.', '') })
            .eq('id', business.id);
        console.log(`  ✨ VERIFIED Domain: ${verifiedDomain}`);
        return verifiedDomain;
    }

    // ========================================================================
    // PHASE 2: Web Search Integration (Deduced)
    // ========================================================================

    // console.log('  🌐 Phase 2: Web Search...');
    let searchResult = await searchDuckDuckGo(business.legal_name, business.country_code, city);

    // Fallback to Google if DDG fails
    if (!searchResult) {
        searchResult = await searchGoogle(business.legal_name, business.country_code);
    }

    if (searchResult && !searchResult.includes('duckduckgo.com') && await isDomainReachable(searchResult)) {
        console.log(`  🔎 Web Verified: ${searchResult}`);
        await supabase.from('businesses').update({ domain: searchResult }).eq('id', business.id);
        return searchResult;
    }

    // ========================================================================
    // PHASE 3: Social Media (Async - don't block return)
    // ========================================================================
    const socialLinks = await findSocialMedia(business.legal_name, business.country_code);
    if (Object.keys(socialLinks).length > 0) {
        // console.log(`  📱 Found Social`);
        await supabase.from('businesses').update({ social_media: socialLinks }).eq('id', businessId);
    }

    // ========================================================================
    // PHASE 4: Gemini AI Fallback (Last Resort)
    // ========================================================================

    // Only use Gemini if purely empty, to save cost/latency
    const geminiResult = await searchWithGemini(business.legal_name, business.org_number, business.country_code, city);

    if (geminiResult && await isDomainReachable(geminiResult)) {
        console.log(`  🤖 AI Found: ${geminiResult}`);
        await supabase.from('businesses').update({ domain: geminiResult }).eq('id', business.id);
        return geminiResult;
    }

    // MARK AS NOT FOUND to prevent retry loops
    await supabase.from('businesses').update({ website_status: 'not_found' }).eq('id', business.id);
    console.log(`  ❌ Not found.`);
    return null;
}
