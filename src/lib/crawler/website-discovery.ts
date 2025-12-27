/**
 * Website Discovery
 * Automatically finds missing websites for businesses in the database
 */

import { createServerClient } from '../supabase';
import { generateText } from '../ai/gemini-client';

/**
 * Clean company name for domain search
 */
function cleanCompanyName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+(as|asa|sa|ab|oy|oyj|aps|gmbh|ltd|inc|corp|llc)$/i, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

/**
 * Try common domain patterns
 */
function generateDomainCandidates(companyName: string, country: string): string[] {
    const patterns: string[] = [];

    // Country-specific TLDs (Priority Order)
    const countryTLDs: Record<string, string[]> = {
        'NO': ['.no', '.com', '.net', '.org'],
        'SE': ['.se', '.com', '.nu'],
        'DK': ['.dk', '.com'],
        'FI': ['.fi', '.com'],
        'DE': ['.de', '.com'],
        'FR': ['.fr', '.com'],
        'ES': ['.es', '.com'],
        'GB': ['.co.uk', '.com', '.uk'],
        'US': ['.com', '.net'],
        'IT': ['.it', '.com'],
        'NL': ['.nl', '.com'],
        'PL': ['.pl', '.com'],
        'BE': ['.be', '.com']
    };

    const tlds = countryTLDs[country] || ['.com', '.net'];

    // 1. Full cleaned name (e.g. "visma software international" -> "vismasoftwareinternational.no")
    const cleanFull = cleanCompanyName(companyName);

    // 2. First word only (Risk of collision, but verified by Org Nr later!)
    // e.g. "Visma Software AS" -> "visma.no"
    const words = companyName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().split(/\s+/);
    const firstWord = words[0];

    // 3. First two words combined
    const firstTwo = words.slice(0, 2).join('');
    const firstTwoHyphen = words.slice(0, 2).join('-');

    // Generate Candidates
    for (const tld of tlds) {
        // Priority 1: Shortest reasonable name (First word, if > 3 chars)
        if (firstWord.length > 2 && !['the', 'det', 'den'].includes(firstWord)) {
            patterns.push(`${firstWord}${tld}`);
        }

        // Priority 2: First two words (if applicable)
        if (words.length > 1) {
            patterns.push(`${firstTwo}${tld}`);
            patterns.push(`${firstTwoHyphen}${tld}`);
        }

        // Priority 3: Full name
        if (cleanFull !== firstWord && cleanFull !== firstTwo) {
            patterns.push(`${cleanFull}${tld}`);
        }

        // Also try www version for the most likely one (First Word)
        if (firstWord.length > 3) {
            patterns.push(`www.${firstWord}${tld}`);
        }
    }

    // Deduplicate
    return [...new Set(patterns)];
}

/**
 * Check if domain exists and is reachable
 */
async function isDomainReachable(domain: string): Promise<boolean> {
    try {
        const url = domain.startsWith('http') ? domain : `https://${domain}`;
        const response = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
        });

        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Verify website belongs to the company by checking for org number
 */
async function verifyWebsite(domain: string, orgNumber: string, companyName: string): Promise<boolean> {
    try {
        const url = domain.startsWith('http') ? domain : `https://${domain}`;
        const response = await fetch(url, {
            signal: AbortSignal.timeout(10000),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) return false;

        const html = (await response.text()).toLowerCase();

        // 1. Strict Check: Org Number
        const cleanOrgNumber = orgNumber.replace(/\s/g, '');
        const variations = [
            cleanOrgNumber,
            orgNumber,
            `org.nr: ${orgNumber}`,
            `organisasjonsnummer: ${orgNumber}`
        ];

        for (const variant of variations) {
            if (html.includes(variant.toLowerCase())) {
                return true;
            }
        }

        // 2. Soft Check: Company Name Match (if Org Nr missing)
        // Clean company name to core part (e.g. "Visma Software AS" -> "visma")
        const cleanName = companyName.toLowerCase()
            .replace(/\s(as|asa|ab|gmbh|ltd|inc|oy|aps)$/i, '')
            .replace(/[^a-z0-9\s]/g, '')
            .trim();

        // Split into significant words (ignore "norway", "group" etc if needed, but keep it simple)
        const nameParts = cleanName.split(' ').filter(p => p.length > 3);

        // If domain contains the full clean name, it's a strong signal
        if (domain.includes(cleanName.replace(/\s/g, ''))) {
            // And page mentions at least one significant part of the name
            if (nameParts.some(part => html.includes(part))) {
                // console.log(`   ⚠️ Soft verified via domain Match: ${domain}`);
                return true;
            }
        }

        // If page title or copyright contains company name
        if (html.includes(cleanName) || html.includes(`copyright ${new Date().getFullYear()} ${cleanName}`)) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

/**
 * Use Gemini AI to search for company website
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
        const cleanDomain = domain
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/.*$/, '')
            .trim();

        return cleanDomain;
    } catch (error) {
        console.error('Gemini search error:', error);
        return null;
    }
}

/**
 * Discover website for a single business
 */
export async function discoverWebsite(businessId: string): Promise<string | null> {
    const supabase = createServerClient();

    // Check if client is initialized (handles server/client context)
    // If running in script, we might need direct access

    const { data: business } = await supabase
        .from('businesses')
        .select('id, legal_name, org_number, country_code')
        .eq('id', businessId)
        .single();

    if (!business) return null;

    console.log(`🔍 Discovering website for: ${business.legal_name}`);

    // Strategy 1: Try common domain patterns
    const candidates = generateDomainCandidates(business.legal_name, business.country_code);

    for (const domain of candidates) {
        console.log(`  📡 Trying: ${domain}`);

        if (await isDomainReachable(domain)) {
            console.log(`  ✅ Reachable!`);

            if (await verifyWebsite(domain, business.org_number)) {
                console.log(`  ✨ Verified! Updating database...`);

                await supabase
                    .from('businesses')
                    .update({ domain: domain.replace('www.', '') })
                    .eq('id', business.id);

                return domain;
            }
        }
    }

    // Strategy 2: Gemini AI Search
    console.log('  🧠 Using Gemini AI to search...');
    const geminiResult = await searchWithGemini(
        business.legal_name,
        business.org_number,
        business.country_code
    );

    if (geminiResult) {
        console.log(`  🤖 Gemini AI found: ${geminiResult}`);
        if (await isDomainReachable(geminiResult)) {
            await supabase
                .from('businesses')
                .update({ domain: geminiResult })
                .eq('id', business.id);
            return geminiResult;
        }
    }

    console.log('  ❌ Could not find website.');
    return null;
}
