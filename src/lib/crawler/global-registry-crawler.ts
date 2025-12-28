/**
 * Global Registry Crawler (Tech Focus)
 * Specifically targets Sweden, Germany, France, Denmark, and Spain
 * to populate the database with Tech/IT companies.
 */

import { verifyAndStoreBusiness } from '../verification';
import { crawlFranceByIndustry, crawlDenmarkByIndustry } from '../registries/global-registry';
// import { crawlSwedenByIndustry } from '../registries/official-apis'; // Official API failed (needs auth)
import { crawlSwedenByIndustry, crawlGermanyByIndustry, crawlSpainByIndustry } from '../registries/public-scrapers';

// Tech & Innovation Focused NACE Codes
// We use specific codes because official APIs (France, Sweden) often require them
const TECH_CODES = [
    '62.01', '62.02', '62.03', '62.09', // IT Services
    '63.11', '63.12',                   // Data & Web
    '58.29',                            // Software Publishing (removed 58.21 game publishing for now)
    '72.11', '72.19',                   // R&D
    '71.12',                            // Engineering
    '74.10'                             // Design
];

interface CrawlStartOptions {
    limitPerCycle: number;
}

export async function runGlobalTechCrawl(options: CrawlStartOptions) {
    console.log('🌍 Starting Global Tech Registry Crawl...');
    console.log('   Target Countries: SE, DE, FR, DK, ES');
    console.log('   Focus: Technology, IT, R&D');

    const countries = [
        { code: 'SE', name: 'Sweden', crawler: crawlSwedenByIndustry },
        { code: 'FR', name: 'France', crawler: crawlFranceByIndustry },
        // Germany and Spain are strictly scrapers and might fail, but we keep them
        { code: 'DE', name: 'Germany', crawler: crawlGermanyByIndustry },
        { code: 'ES', name: 'Spain', crawler: crawlSpainByIndustry },
        { code: 'DK', name: 'Denmark', crawler: crawlDenmarkByIndustry }
    ];

    // Randomize industries to get variety
    const industries = [...TECH_CODES].sort(() => Math.random() - 0.5);

    for (const country of countries) {
        console.log(`\n================================`);
        console.log(`📍 Processing ${country.name} (${country.code})`);

        for (const industry of industries) {
            console.log(`  🔍 Searching Industry: ${industry}`);

            try {
                // Prepare code format
                // France requires clean code for some lookups, dots for others? 
                // Actually France API v2 usually takes 62.01Z. We will pass 62.01 and let crawler handle or it might fail if exact match needed.
                // Sweden official API usually takes SNI 2007 which is 62.01.
                // Scrapers usually prefer no dots (6201).

                let codeToUse = industry;
                // Normalize codes for different national registries
                if (country.code === 'DE' || country.code === 'ES' || country.code === 'SE') {
                    // SE, DE, ES scrapers typically prefer pure numbers (e.g. 6201 instead of 62.01)
                    codeToUse = industry.replace('.', '');
                } else if (country.code === 'FR') {
                    // France (Sirene) often uses 'Z' suffix for NAF codes at 4-digit level (e.g. 62.01Z)
                    codeToUse = industry + 'Z';
                }

                let companies: any[] = [];
                try {
                    companies = await country.crawler(codeToUse, options.limitPerCycle);
                } catch (innerErr) {
                    console.warn(`     ⚠️ Crawler failed for ${country.name}: ${(innerErr as any).message}`);
                    companies = [];
                }

                if (companies.length === 0) {
                    console.log(`     No results found using code ${codeToUse}.`);
                    continue;
                }

                console.log(`     Found ${companies.length} candidates. Verifying & Storing...`);

                let storedCount = 0;
                for (const company of companies) {
                    const result = await verifyAndStoreBusiness({
                        orgNumber: company.id,
                        countryCode: country.code,
                        websiteUrl: company.website, // Some registries provide this
                        knownRegistryData: {
                            legal_name: company.name,
                            industry_codes: [industry], // Enriched with our known search term
                            registered_address: company.address
                        }
                    });

                    if (result.success) {
                        storedCount++;
                        process.stdout.write('+'); // Progress tick
                    } else {
                        process.stdout.write('.'); // Skip tick
                    }

                    // Rate limit DB/AI
                    await new Promise(r => setTimeout(r, 1000));
                }
                console.log(`\n     ✅ Stored ${storedCount} new businesses from ${country.name}`);

                // Country cool-down
                await new Promise(r => setTimeout(r, 5000));

            } catch (err) {
                console.error(`     ❌ Error crawling ${country.name} / ${industry}:`, err);
            }
        }
    }

    console.log('\n✅ Global Tech Crawl Cycle Complete.');
}

// CLI Execution
if (require.main === module) {
    (async () => {
        while (true) {
            try {
                await runGlobalTechCrawl({ limitPerCycle: 20 });
                console.log('\n⏳ Sleeping 15 minutes before next run...');
                await new Promise(r => setTimeout(r, 15 * 60 * 1000));
            } catch (error) {
                console.error('Fatal Bot Error:', error);
                await new Promise(r => setTimeout(r, 60 * 1000));
            }
        }
    })();
}
