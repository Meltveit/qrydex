/**
 * Improved Global Registry Crawler
 * Robust, multi-strategy crawler for finding Tech companies in Europe
 */

import { verifyAndStoreBusiness } from '../verification';
import { crawlFranceByIndustry, crawlDenmarkByIndustry } from '../registries/global-registry';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TECH_KEYWORDS_EN = ['software', 'technology', 'it-consulting', 'digital', 'data'];
const TECH_KEYWORDS_LOCALE: Record<string, string[]> = {
    'SE': ['data-it-telekom', 'programmering', 'systemutveckling'],
    'DE': ['softwareanbieter', 'it-dienstleistungen', 'app-entwicklung'],
    'ES': ['informatica', 'software', 'tecnologia'],
    'DK': ['it-service', 'softwareudvikling', 'konsulenter']
};

interface CrawlStartOptions {
    limitPerCycle: number;
}

// ============================================================================
// SCRAPERS
// ============================================================================

/**
 * Sweden - Allabolag Scraper (Robust Version)
 */
async function crawlSweden(limit: number): Promise<any[]> {
    const companies: any[] = [];
    const keywords = ['programmering', 'it-konsult', 'datakonsult', 'systemutveckling'];

    for (const kw of keywords) {
        if (companies.length >= limit) break;

        try {
            console.log(`  🇸🇪 Sweden (Allabolag): Searching for '${kw}'...`);
            // Use the JSON API endpoint Allabolag uses internally if possible, or robust parsing
            // Fallback to simple HTML scraping with looser regex
            const url = `https://www.allabolag.se/what/${kw}`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7'
                }
            });

            if (!response.ok) {
                console.warn(`    Failed to fetch Allabolag: ${response.status}`);
                continue;
            }

            const html = await response.text();

            // Regex to find company links. Variations:
            // href="/foretag/company-name/orgnr"
            const matches = html.matchAll(/href="\/foretag\/[^\/]+\/(\d{6}-\d{4})"/g);

            let count = 0;
            for (const match of matches) {
                if (companies.length >= limit) break;

                const orgNr = match[1];
                const fullTag = match[0];
                const slug = fullTag.split('/')[2];
                const name = decodeURIComponent(slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '));

                if (!companies.find(c => c.id === orgNr)) {
                    companies.push({
                        id: orgNr,
                        name: name,
                        country: 'SE',
                        source: 'Allabolag'
                    });
                    count++;
                }
            }
            console.log(`    Found ${count} companies for '${kw}'`);

        } catch (err) {
            console.error('Sweden crawl error:', err);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    return companies;
}

/**
 * Germany - Das Telefonbuch / Gelbe Seiten (Yellow Pages) simulation
 * Since NorthData blocks easily, we search directories.
 */
async function crawlGermany(limit: number): Promise<any[]> {
    const companies: any[] = [];
    // Fallback: Use NACE codes via OpenCorporates (Free Tier) or just return manual list for now
    // A robust scraper requires browser simulation (Puppeteer) which we don't have.
    // We will try a directory listing that is static HTML friendly.

    // For now, let's use a "known list" generator or skip
    // Or try retrieving from 'https://www.firmenwissen.de/az/branche/...' (might be protected)

    console.log(`  🇩🇪 Germany: Scraper limited without Puppeteer. Skipping for now.`);
    return [];
}

/**
 * Denmark - CVR API (Keyword Search)
 */
async function crawlDenmark(limit: number): Promise<any[]> {
    const companies: any[] = [];
    const keywords = ['software', 'it-konsulent', 'programmering', 'webbureau'];

    for (const kw of keywords) {
        if (companies.length >= limit) break;
        console.log(`  🇩🇰 Denmark (CVR): Searching for '${kw}'...`);

        try {
            // CVR API (cvrapi.dk) - Searching by name/keyword
            const url = `https://cvrapi.dk/api?search=${encodeURIComponent(kw)}&country=dk`;
            const response = await fetch(url, {
                headers: { 'User-Agent': 'QrydexBot/1.0' }
            });

            if (response.ok) {
                const data = await response.json();
                // API usually returns single object or list? 
                // Documentation says it returns a single match if exact, or list logic is complex.
                // Actually free API is limited. Let's try to handle whatever we get.

                const items = Array.isArray(data) ? data : (data.vat ? [data] : []);

                for (const item of items) {
                    if (companies.length >= limit) break;
                    if (item.vat && item.name) {
                        companies.push({
                            id: String(item.vat),
                            name: item.name,
                            country: 'DK',
                            address: item.address,
                            website: item.website, // CVR often has this!
                            source: 'CVR'
                        });
                    }
                }
            }
        } catch (err) {
            console.error('Denmark crawl error:', err);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    return companies;
}

/**
 * Spain - Empresia
 */
async function crawlSpain(limit: number): Promise<any[]> {
    const companies: any[] = [];
    const keywords = ['software', 'informatica', 'tecnologia'];

    // Empresia is tricky to scrape. Let's try a different strategy or valid headers.
    // Or try Axesor / Infoempresa structure if known.
    // For now, retry Empresia with better headers.

    for (const kw of keywords) {
        if (companies.length >= limit) break;
        console.log(`  🇪🇸 Spain (Empresia): Searching for '${kw}'...`);

        const url = `https://www.empresia.es/buscar/${kw}/`;
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html'
                }
            });

            if (response.ok) {
                const html = await response.text();
                // Try to find list items
                const matches = html.matchAll(/<a href="\/empresa\/([^"]+)\/" title="([^"]+)"/g);
                let count = 0;
                for (const match of matches) {
                    if (companies.length >= limit) break;
                    // Empresia URL slug often contains the name
                    const name = match[2];
                    // We don't have CIF easily here. We might need to fetch the company page or just store name and let verification find it?
                    // Actually, if we pass Name + Country to 'verifyAndStoreBusiness', it might find the Registry Data via OpenCorporates!

                    companies.push({
                        id: 'PENDING_' + Math.random().toString(36).substr(2, 9), // Temp ID
                        name: name,
                        country: 'ES',
                        source: 'Empresia'
                    });
                    count++;
                }
                console.log(`    Found ${count} candidates`);
            }
        } catch (e) {
            console.error('Spain error', e);
        }
        await new Promise(r => setTimeout(r, 2000));
    }

    return companies;
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

export async function runImprovedGlobalCrawl(options: CrawlStartOptions) {
    console.log('🌍 PORTAL: Inter-European Tech Business Crawler');
    console.log('   Targeting: SE, FR, DK, ES (DE paused)');

    // 1. France (Sirene API - Reliable)
    // 2. Sweden (Allabolag - Scraper)
    // 3. Denmark (CVR - API)
    // 4. Spain (Empresia - Scraper)

    const strategies = [
        { code: 'FR', name: 'France', fn: () => crawlFranceByIndustry('62.01Z', options.limitPerCycle) },
        { code: 'DK', name: 'Denmark', fn: () => crawlDenmark(options.limitPerCycle) }, // CVR often uses 6 digits
        { code: 'SE', name: 'Sweden', fn: () => crawlSweden(options.limitPerCycle) },
        { code: 'ES', name: 'Spain', fn: () => crawlSpain(options.limitPerCycle) }
    ];

    for (const strat of strategies) {
        console.log(`\n📍 Scanning ${strat.name} (${strat.code})...`);
        try {
            const results = await strat.fn();
            console.log(`   Found ${results.length} candidates.`);

            let stored = 0;
            for (const c of results) {
                // Determine ID (some scrapers return slug as ID)
                const id = c.id || c.siren || c.company_number;
                const name = c.name || c.nom_complet;

                if (!id || !name) continue;

                process.stdout.write(`   Processing ${name.substring(0, 20)}... `);

                const result = await verifyAndStoreBusiness({
                    orgNumber: id,
                    countryCode: strat.code,
                    websiteUrl: c.website,
                    knownRegistryData: {
                        legal_name: name,
                        registered_address: c.address,
                        industry_codes: ['Technolgy/Software']
                    }
                });

                if (result.success) {
                    process.stdout.write('✅ STORED\n');
                    stored++;
                } else {
                    process.stdout.write('❌ (' + result.error + ')\n');
                }

                await new Promise(r => setTimeout(r, 800)); // Rate limit
            }
            console.log(`   Start summary: ${stored} new businesses from ${strat.name}`);

        } catch (err) {
            console.error(`   Error in ${strat.name}:`, err);
        }

        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n✅ Cycle Complete.');
}


if (require.main === module) {
    (async () => {
        while (true) {
            await runImprovedGlobalCrawl({ limitPerCycle: 15 });
            console.log('Sleeping 10m...');
            await new Promise(r => setTimeout(r, 600000));
        }
    })();
}
