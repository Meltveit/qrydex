/**
 * Registry Crawler
 * Fetches businesses from official registries (Brønnøysund, Companies House etc.)
 */

import { createServerClient } from '@/lib/supabase';
import { verifyAndStoreBusiness } from '@/lib/verification';

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
];

interface CrawlOptions {
    country: 'NO' | 'GB' | 'DE' | 'NL' | 'SE';
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
 * Crawl Norwegian businesses from Brønnøysund
 */
export async function crawlNorwegianBusinesses(options: CrawlOptions): Promise<CrawlResult> {
    const result: CrawlResult = {
        total: 0,
        verified: 0,
        failed: 0,
        businesses: [],
    };

    try {
        // Brønnøysund API endpoint for searching
        const industries = options.industryFilter || B2B_NACE_CODES;

        for (const naceCode of industries.slice(0, 5)) { // Limit to avoid overload
            console.log(`Crawling Norwegian businesses with NACE code: ${naceCode}...`);

            const response = await fetch(
                `https://data.brreg.no/enhetsregisteret/api/enheter?naeringskode=${naceCode}&size=${options.limit || 100}`,
                {
                    headers: {
                        'Accept': 'application/json',
                    },
                }
            );

            if (!response.ok) continue;

            const data = await response.json();
            const businesses = data._embedded?.enheter || [];

            for (const business of businesses) {
                result.total++;

                try {
                    // Extract org number
                    const orgNumber = business.organisasjonsnummer;

                    // Find website from hjemmeside field
                    const websiteUrl = business.hjemmeside;

                    // Verify and store
                    const verifyResult = await verifyAndStoreBusiness({
                        orgNumber,
                        countryCode: 'NO',
                        websiteUrl,
                    });

                    if (verifyResult.success && verifyResult.business) {
                        result.verified++;
                        result.businesses.push(verifyResult.business.legal_name);
                        console.log(`✓ Verified: ${verifyResult.business.legal_name}`);
                    } else {
                        result.failed++;
                    }

                    // Rate limiting - wait 500ms between requests
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    result.failed++;
                    console.error('Error verifying business:', error);
                }
            }
        }
    } catch (error) {
        console.error('Error crawling Norwegian businesses:', error);
    }

    return result;
}

/**
 * Crawl UK businesses from Companies House
 */
export async function crawlUKBusinesses(options: CrawlOptions): Promise<CrawlResult> {
    const result: CrawlResult = {
        total: 0,
        verified: 0,
        failed: 0,
        businesses: [],
    };

    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey) {
        console.error('Companies House API key not configured');
        return result;
    }

    // SIC codes for B2B industries (UK equivalent of NACE)
    const sicCodes = ['10000', '15000', '20000', '25000', '28000', '41000', '43000', '46000'];

    try {
        for (const sicCode of sicCodes.slice(0, 3)) {
            console.log(`Crawling UK businesses with SIC code: ${sicCode}...`);

            const response = await fetch(
                `https://api.company-information.service.gov.uk/search/companies?q=*&sic_codes=${sicCode}&items_per_page=${options.limit || 50}`,
                {
                    headers: {
                        'Authorization': apiKey,
                    },
                }
            );

            if (!response.ok) continue;

            const data = await response.json();
            const businesses = data.items || [];

            for (const business of businesses) {
                result.total++;

                try {
                    const companyNumber = business.company_number;

                    const verifyResult = await verifyAndStoreBusiness({
                        orgNumber: companyNumber,
                        countryCode: 'GB',
                    });

                    if (verifyResult.success && verifyResult.business) {
                        result.verified++;
                        result.businesses.push(verifyResult.business.legal_name);
                        console.log(`✓ Verified UK: ${verifyResult.business.legal_name}`);
                    } else {
                        result.failed++;
                    }

                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    result.failed++;
                    console.error('Error verifying UK business:', error);
                }
            }
        }
    } catch (error) {
        console.error('Error crawling UK businesses:', error);
    }

    return result;
}

/**
 * Run crawler for all supported countries
 */
export async function runFullCrawl(limitPerCountry: number = 100): Promise<Record<string, CrawlResult>> {
    console.log('🚀 Starting full business crawl...\n');

    const results: Record<string, CrawlResult> = {};

    // Norway
    console.log('📍 Crawling Norway...');
    results.NO = await crawlNorwegianBusinesses({ country: 'NO', limit: limitPerCountry });

    // UK
    console.log('\n📍 Crawling UK...');
    results.GB = await crawlUKBusinesses({ country: 'GB', limit: limitPerCountry });

    // Summary
    console.log('\n✅ Crawl Summary:');
    Object.entries(results).forEach(([country, result]) => {
        console.log(`${country}: ${result.verified}/${result.total} verified (${result.failed} failed)`);
    });

    return results;
}
