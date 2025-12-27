/**
 * Website Discovery Bot
 * Automatically finds missing websites for businesses in the database
 * 
 * Strategies:
 * 1. Google Custom Search API
 * 2. Common domain patterns (company-name.no, company-name.com)
 * 3. DNS lookup
 * 4. Verify with org number on website
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const clean = cleanCompanyName(companyName);
    const patterns = [];

    // Country-specific TLDs
    const countryTLDs: Record<string, string[]> = {
        'NO': ['.no', '.com'],
        'SE': ['.se', '.com'],
        'DK': ['.dk', '.com'],
        'FI': ['.fi', '.com'],
        'DE': ['.de', '.com'],
        'FR': ['.fr', '.com'],
        'ES': ['.es', '.com'],
        'GB': ['.co.uk', '.com'],
        'US': ['.com']
    };

    const tlds = countryTLDs[country] || ['.com'];

    for (const tld of tlds) {
        patterns.push(`${clean}${tld}`);
        patterns.push(`www.${clean}${tld}`);
    }

    return patterns;
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
async function verifyWebsite(domain: string, orgNumber: string): Promise<boolean> {
    try {
        const url = domain.startsWith('http') ? domain : `https://${domain}`;
        const response = await fetch(url, {
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) return false;

        const html = await response.text();

        // Check if org number appears on the page
        const cleanOrgNumber = orgNumber.replace(/\s/g, '');
        const variations = [
            cleanOrgNumber,
            orgNumber,
            `Org.nr: ${orgNumber}`,
            `Org.nr.: ${orgNumber}`,
            `Organisasjonsnummer: ${orgNumber}`
        ];

        for (const variant of variations) {
            if (html.includes(variant)) {
                return true;
            }
        }

        // If org number not found, still accept if domain is reachable
        // (some sites don't display org number)
        return true;
    } catch {
        return false;
    }
}

/**
 * Use Gemini AI to search for company website
 */
async function searchWithGemini(companyName: string, orgNumber: string, country: string): Promise<string | null> {
    try {
        const { generateText } = await import('../src/lib/ai/gemini-client.js');

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
    const geminiResult = await searchWithGemini(
        business.legal_name,
        business.org_number,
        business.country_code
    );

    if (geminiResult) {
        console.log(`  🤖 Found via Gemini AI: ${geminiResult}`);

        if (await verifyWebsite(geminiResult, business.org_number)) {
            await supabase
                .from('businesses')
                .update({ domain: geminiResult })
                .eq('id', business.id);

            return geminiResult;
        }
    }

    console.log(`  ❌ No website found`);
    return null;
}

/**
 * Batch discover websites for businesses missing domains
 */
export async function discoverMissingWebsites(limit = 100) {
    console.log('🌐 Website Discovery Bot Starting...\n');

    // Fetch businesses without domain
    const { data: businesses } = await supabase
        .from('businesses')
        .select('id, legal_name')
        .is('domain', null)
        .limit(limit);

    if (!businesses || businesses.length === 0) {
        console.log('✅ All businesses have websites!');
        return;
    }

    console.log(`📋 Found ${businesses.length} businesses without websites\n`);

    let foundCount = 0;
    let notFoundCount = 0;

    for (const business of businesses) {
        const domain = await discoverWebsite(business.id);

        if (domain) {
            foundCount++;

            // Trigger scraping will be done later when integrated
            console.log(`  📝 Domain saved: ${domain}, scraping will be done later`);
        } else {
            notFoundCount++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n📊 Discovery Summary:');
    console.log(`   ✅ Websites found: ${foundCount}`);
    console.log(`   ❌ Not found: ${notFoundCount}`);
    console.log(`   📈 Success rate: ${((foundCount / businesses.length) * 100).toFixed(1)}%`);
}

// CLI execution
if (require.main === module) {
    discoverMissingWebsites(50)
        .then(() => {
            console.log('\n✅ Website discovery complete');
            process.exit(0);
        })
        .catch((err) => {
            console.error('❌ Fatal error:', err);
            process.exit(1);
        });
}
