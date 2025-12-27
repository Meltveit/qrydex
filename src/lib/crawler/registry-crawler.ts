/**
 * Registry Crawler
 * Fetches businesses from official registries (Brønnøysund, Companies House etc.)
 */

import { verifyAndStoreBusiness } from '../verification';
import {
    searchNorwayRegistry,
    searchSwedenRegistry,
    searchDenmarkRegistry,
    searchFinlandRegistry,
    searchGermanyRegistry,
    searchFranceRegistry,
    searchUKRegistry,
    crawlNorwayByIndustry,
    crawlDenmarkByIndustry,
    crawlUKByIndustry,
    crawlFranceByIndustry,
    crawlOpenCorporatesByIndustry,
    type RegistryCompany
} from '../registries/global-registry';

// B2B Industry codes - fokus på leverandører, produsenter, håndverkere
const B2B_NACE_CODES = [
    // Produksjon/Manufacturing
    '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', // Food, beverages, textiles, wood, paper
    '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', // Chemicals, pharma, plastics, metals, electronics

    // Bygg og anlegg / Construction
    '41', '42', '43', // Building, civil engineering, specialized construction

    // Transport og logistikk
    '49', '50', '51', '52', '53', // Land, water, air transport, warehousing

    // Engros / Wholesale
    '46', // Wholesale trade (except motor vehicles)

    // Tekniske tjenester
    '71', '72', '73', // Architecture, engineering, technical testing, R&D

    // Industritjenester
    '74', '75', '77', '78', '79', '80', '81', '82', // Professional services, cleaning, security

    // IT & Software (Added)
    '62', '63'
];

interface CrawlOptions {
    country: 'NO' | 'GB' | 'DE' | 'FR' | 'SE' | 'DK' | 'FI' | 'ES';
    limit?: number;
    industryFilter?: string[];
}

interface CrawlResult {
    total: number;
    verified: number;
    failed: number;
    businesses: string[];
}

/**
 * Generic crawler that delegates to specific country logic
 */
export async function crawlRegistry(options: CrawlOptions): Promise<CrawlResult> {
    const result: CrawlResult = {
        total: 0,
        verified: 0,
        failed: 0,
        businesses: [],
    };

    console.log(`🔍 Crawling registry for ${options.country}(Systematic NACE crawl)...`);

    // Use provided industry filter or fallback to all core B2B codes
    const industries = options.industryFilter || B2B_NACE_CODES;

    // Shuffle codes to avoid hammering the same industry every run
    const shuffledIndustries = [...industries].sort(() => Math.random() - 0.5);

    for (const naceCode of shuffledIndustries) {
        if (result.total >= (options.limit || 100)) break;

        console.log(`  🏭 Processing Industry Code: ${naceCode} (${options.country})`);

        let foundCompanies: RegistryCompany[] = [];

        try {
            switch (options.country) {
                // Official / Dedicated APIs
                case 'NO':
                    foundCompanies = await crawlNorwayByIndustry(naceCode, 20);
                    break;
                case 'DK':
                    foundCompanies = await crawlDenmarkByIndustry(naceCode, 5);
                    break;
                case 'GB':
                    foundCompanies = await crawlUKByIndustry(naceCode, 20);
                    break;
                case 'FR':
                    foundCompanies = await crawlFranceByIndustry(naceCode, 20);
                    break;

                // Fallback / OpenCorporates (Limited/Paid usually, using free tier carefully)
                case 'SE':
                case 'FI':
                case 'DE':
                case 'ES':
                    foundCompanies = await crawlOpenCorporatesByIndustry(naceCode, options.country, 10);
                    break;
            }

            console.log(`    > Found ${foundCompanies.length} potential businesses`);

            for (const company of foundCompanies) {
                result.total++;

                // Verify and store
                const verifyResult = await verifyAndStoreBusiness({
                    orgNumber: company.id,
                    countryCode: options.country,
                    websiteUrl: company.website,
                    // If we have industry text, we could enhance it here
                });

                if (verifyResult.success && verifyResult.business) {
                    result.verified++;
                    result.businesses.push(verifyResult.business.legal_name);
                    console.log(`    ✅ Added: ${verifyResult.business.legal_name} `);
                } else {
                    result.failed++;
                }

                if (result.total >= (options.limit || 100)) break;

                // Rate limiting: Wait 45 seconds between businesses to respect Gemini Free Tier
                // (We do checking/verification which calls AI)
                console.log('    ⏳ Cooling down (45s)...');
                await new Promise(resolve => setTimeout(resolve, 45000));
            }

            // Rate limiting between industry codes
            await new Promise(resolve => setTimeout(resolve, 5000));

        } catch (error) {
            console.error(`Error processing NACE ${naceCode}: `, error);
        }
    }

    return result;
}

/**
 * Run crawler for all supported countries
 */
export async function runFullCrawl(limitPerCountry: number = 100): Promise<Record<string, CrawlResult>> {
    console.log('🚀 Starting full business crawl...\n');

    const countries = ['NO', 'SE', 'DK', 'FI', 'DE', 'FR', 'GB', 'ES'] as const;
    const results: Record<string, CrawlResult> = {};

    for (const country of countries) {
        if (country === 'ES') continue; // Not implemented yet
        results[country] = await crawlRegistry({ country, limit: limitPerCountry });
    }

    // Summary
    console.log('\n✅ Crawl Summary:');
    Object.entries(results).forEach(([country, result]) => {
        console.log(`${country}: ${result.verified}/${result.total} verified (${result.failed} failed)`);
    });

    return results;
}

// CLI execution - RUNS CONTINUOUSLY
if (require.main === module) {
    console.log('🏢 Registry Crawler - CONTINUOUS MODE');
    console.log('   Continuously crawling business registries');
    console.log('   Countries: EU & Nordics');
    console.log('   Press Ctrl+C to stop\n');

    let cycleCount = 0;

    async function runContinuously() {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            cycleCount++;
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔄 CYCLE ${cycleCount} - ${new Date().toLocaleString()}`);
            console.log(`${'='.repeat(60)}\n`);

            try {
                await runFullCrawl(100);

                console.log('\n⏱️  Sleeping 1 hour before next cycle...');
                await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000)); // 1 hour

            } catch (err: any) {
                console.error('❌ Error:', err.message);
                console.log('   Retrying in 10 minutes...');
                await new Promise(resolve => setTimeout(resolve, 10 * 60 * 1000));
            }
        }
    }

    runContinuously().catch((err) => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
}
