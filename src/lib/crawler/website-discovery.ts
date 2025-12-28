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
        'NO': ['.no', '.com', '.net'],
        'SE': ['.se', '.com', '.nu'],
        'DK': ['.dk', '.com'],
        'FI': ['.fi', '.com'],
        'DE': ['.de', '.com'],
        'FR': ['.fr', '.com'],
        'ES': ['.es', '.com'],
        'GB': ['.co.uk', '.com', '.uk'],
        'US': ['.com', '.net', '.io'],
        'IT': ['.it', '.com'],
        'NL': ['.nl', '.com'],
        'PL': ['.pl', '.com'],
        'BE': ['.be', '.com']
    };

    const tlds = countryTLDs[country] || ['.com', '.net'];

    // Base variations
    const words = companyName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().split(/\s+/);
    const cleanFull = cleanCompanyName(companyName);
    const firstWord = words[0];
    const firstTwo = words.slice(0, 2).join('');
    const firstTwoHyphen = words.slice(0, 2).join('-');
    const firstThree = words.slice(0, 3).join('');
    const acronym = generateAcronym(companyName);

    // Generate candidates for each TLD
    for (const tld of tlds) {
        // 1. First word (highest priority if > 3 chars)
        if (firstWord && firstWord.length > 2 && !['the', 'det', 'den', 'das', 'der', 'les', 'los'].includes(firstWord)) {
            patterns.push(`${firstWord}${tld}`);
            patterns.push(`www.${firstWord}${tld}`);
        }

        // 2. Acronym (e.g. "Digital Marketing Solutions" -> "dms.com")
        if (acronym && acronym.length >= 2) {
            patterns.push(`${acronym}${tld}`);
        }

        // 3. First two words
        if (words.length > 1) {
            patterns.push(`${firstTwo}${tld}`);
            patterns.push(`${firstTwoHyphen}${tld}`);
        }

        // 4. First three words (for longer names)
        if (words.length > 2 && firstThree.length < 25) {
            patterns.push(`${firstThree}${tld}`);
        }

        // 5. Full cleaned name (if different and reasonable length)
        if (cleanFull && cleanFull !== firstWord && cleanFull.length < 30) {
            patterns.push(`${cleanFull}${tld}`);
        }

        // 6. Common abbreviations (e.g. "Norway" -> "nor")
        const abbreviated = cleanFull
            .replace(/norway/g, 'nor')
            .replace(/sweden/g, 'swe')
            .replace(/denmark/g, 'dk')
            .replace(/international/g, 'intl')
            .replace(/services/g, 'srv')
            .replace(/solutions/g, 'sol')
            .replace(/consulting/g, 'con');

        if (abbreviated !== cleanFull && abbreviated.length > 3) {
            patterns.push(`${abbreviated}${tld}`);
        }
    }

    // Add .io for tech companies (if name contains tech keywords)
    const techKeywords = ['tech', 'digital', 'software', 'data', 'cloud', 'ai', 'cyber', 'app'];
    if (techKeywords.some(kw => companyName.toLowerCase().includes(kw))) {
        patterns.push(`${firstWord}.io`);
        if (acronym) patterns.push(`${acronym}.io`);
    }

    // Deduplicate and return
    return [...new Set(patterns)];
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
            const response = await fetch(url, {
                method: 'HEAD',
                signal: AbortSignal.timeout(TIMEOUT_MS),
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
            signal: AbortSignal.timeout(10000),
            headers: {
                'User-Agent': USER_AGENTS[0]
            }
        });

        if (!response.ok) return false;

        const html = (await response.text()).toLowerCase();
        const cleanOrgNumber = orgNumber.replace(/\s/g, '');

        // 1. Strict verification: Organization number present
        const variations = [
            cleanOrgNumber,
            orgNumber,
            `org.nr: ${orgNumber}`,
            `org.nr.:${cleanOrgNumber}`,
            `organisasjonsnummer: ${orgNumber}`,
            `organization number: ${orgNumber}`,
            `cvr: ${orgNumber}`, // Denmark
            `org.nummer: ${orgNumber}` // Sweden
        ];

        for (const variant of variations) {
            if (html.includes(variant.toLowerCase())) {
                return true;
            }
        }

        // 2. Soft verification: Company name + domain match
        const cleanName = companyName.toLowerCase()
            .replace(/\s(as|asa|ab|gmbh|ltd|inc|oy|aps)$/i, '')
            .replace(/[^a-z0-9\s]/g, '')
            .trim();

        const nameParts = cleanName.split(' ').filter(p => p.length > 3);

        // Domain contains company name AND page mentions significant parts
        if (domain.includes(cleanName.replace(/\s/g, ''))) {
            if (nameParts.some(part => html.includes(part))) {
                return true;
            }
        }

        // 3. Copyright or title match
        const currentYear = new Date().getFullYear();
        if (html.includes(`©${currentYear} ${cleanName}`) ||
            html.includes(`copyright ${currentYear} ${cleanName}`) ||
            html.includes(`<title>${cleanName}`)) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

// ============================================================================
// WEB SEARCH INTEGRATION
// ============================================================================

/**
 * Search DuckDuckGo HTML for company website
 */
async function searchDuckDuckGo(companyName: string, country: string): Promise<string | null> {
    try {
        const query = encodeURIComponent(`${companyName} ${country} official website`);
        const url = `https://html.duckduckgo.com/html/?q=${query}`;

        const response = await fetch(url, {
            signal: AbortSignal.timeout(8000),
            headers: {
                'User-Agent': USER_AGENTS[0]
            }
        });

        if (!response.ok) return null;

        const html = await response.text();

        // Extract first result URL
        const urlMatch = html.match(/href="\/\/duckduckgo\.com\/l\/\?uddg=([^"]+)"/);
        if (!urlMatch) return null;

        const encodedUrl = urlMatch[1];
        const decodedUrl = decodeURIComponent(encodedUrl);

        // Extract domain
        const domainMatch = decodedUrl.match(/^https?:\/\/([^\/]+)/);
        if (!domainMatch) return null;

        return domainMatch[1].replace('www.', '');
    } catch (error) {
        console.error('DuckDuckGo search error:', error);
        return null;
    }
}

/**
 * Use Gemini AI to search for company website (fallback)
 */
async function searchWithGemini(companyName: string, orgNumber: string, country: string): Promise<string | null> {
    try {
        const prompt = `Find the official website for this company:
        
Company Name: ${companyName}
Organization Number: ${orgNumber}
Country: ${country}

Search the web and return ONLY the domain name (e.g., "example.com") of the company's official website.
If you cannot find it with high confidence, return "NOT_FOUND".

Return only the domain, nothing else.`;

        const response = await generateText(prompt);
        if (!response) return null;

        const domain = response.trim().toLowerCase();
        if (domain === 'not_found' || domain.includes('not found') || domain.length > 100) {
            return null;
        }

        // Clean up response
        return domain
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/.*$/, '')
            .trim();
    } catch (error) {
        console.error('Gemini search error:', error);
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
        .select('id, legal_name, org_number, country_code')
        .eq('id', businessId)
        .single();

    if (!business) return null;

    console.log(`\n🔍 Discovering website for: ${business.legal_name}`);

    // ========================================================================
    // PHASE 1: Parallel Domain Testing (Lightning Fast!)
    // ========================================================================

    const candidates = generateDomainCandidates(business.legal_name, business.country_code);
    console.log(`  📊 Generated ${candidates.length} domain candidates`);

    const limit = pLimit(CONCURRENCY_LIMIT);

    // Test ALL candidates in parallel
    const results = await Promise.all(
        candidates.map(domain =>
            limit(async () => {
                if (await isDomainReachable(domain)) {
                    console.log(`  ✅ ${domain} - Reachable`);
                    if (await verifyWebsite(domain, business.org_number, business.legal_name)) {
                        console.log(`  ✨ ${domain} - VERIFIED!`);
                        return domain;
                    }
                }
                return null;
            })
        )
    );

    // Find first verified domain
    const verifiedDomain = results.find(d => d !== null);

    if (verifiedDomain) {
        const elapsed = Date.now() - startTime;
        console.log(`  🎯 Found in ${elapsed}ms: ${verifiedDomain}`);

        await supabase
            .from('businesses')
            .update({ domain: verifiedDomain.replace('www.', '') })
            .eq('id', business.id);

        return verifiedDomain;
    }

    // ========================================================================
    // PHASE 2: Web Search Integration
    // ========================================================================

    console.log('  🌐 Trying DuckDuckGo search...');
    const ddgResult = await searchDuckDuckGo(business.legal_name, business.country_code);

    if (ddgResult && await isDomainReachable(ddgResult)) {
        if (await verifyWebsite(ddgResult, business.org_number, business.legal_name)) {
            console.log(`  🦆 DuckDuckGo found: ${ddgResult}`);
            await supabase
                .from('businesses')
                .update({ domain: ddgResult })
                .eq('id', business.id);
            return ddgResult;
        }
    }

    // ========================================================================
    // PHASE 3: Gemini AI Fallback
    // ========================================================================

    console.log('  🧠 Using Gemini AI...');
    const geminiResult = await searchWithGemini(
        business.legal_name,
        business.org_number,
        business.country_code
    );

    if (geminiResult && await isDomainReachable(geminiResult)) {
        if (await verifyWebsite(geminiResult, business.org_number, business.legal_name)) {
            console.log(`  🤖 Gemini found: ${geminiResult}`);
            await supabase
                .from('businesses')
                .update({ domain: geminiResult })
                .eq('id', business.id);
            return geminiResult;
        }
    }

    const elapsed = Date.now() - startTime;
    console.log(`  ❌ Not found (${elapsed}ms)`);
    return null;
}
