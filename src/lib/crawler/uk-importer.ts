
// import axios from 'axios'; // Removed
import * as cheerio from 'cheerio';
import { createServerClient } from '../supabase';
// import { submitBusinessProfiles } from '../seo/indexnow';

async function fetchWikipediaCompanies(url: string, indexName: string) {
    console.log(`🌐 Scraping ${indexName} from Wikipedia...`);
    const response = await fetch(url);
    const data = await response.text();
    const $ = cheerio.load(data);
    const companies: any[] = [];

    // Iterate through all tables to find the one with "Company" and "Ticker"
    $('table.wikitable.sortable').each((i, table) => {
        const headers = $(table).find('th').map((_i, el) => $(el).text().trim()).get();
        const headerText = headers.join(' ').toLowerCase();

        if (headerText.includes('company') && (headerText.includes('ticker') || headerText.includes('epic'))) {
            console.log(`✅ Found target table at index ${i}`);

            $(table).find('tbody tr').each((j, row) => {
                const cols = $(row).find('td');
                if (cols.length === 0) return;

                const name = $(cols[0]).text().trim();
                const ticker = $(cols[1]).text().trim();
                const sector = $(cols[2]).text().trim();

                if (name && ticker) {
                    companies.push({
                        name,
                        ticker,
                        sector,
                        source: indexName
                    });
                }
            });
            return false; // Break loop
        }
    });

    console.log(`✅ Found ${companies.length} companies in ${indexName}`);
    return companies;
}

async function runUKImport() {
    const supabase = createServerClient();

    console.log('🇬🇧 Starting UK Company Import (FTSE 100 & 250)...');

    const ftse100 = await fetchWikipediaCompanies('https://en.wikipedia.org/wiki/FTSE_100_Index', 'FTSE 100');
    const ftse250 = await fetchWikipediaCompanies('https://en.wikipedia.org/wiki/FTSE_250_Index', 'FTSE 250');

    const allCompanies = [...ftse100, ...ftse250];
    console.log(`\n📦 Total companies to import: ${allCompanies.length}`);

    let imported = 0;
    let skipped = 0;
    const newOrgNumbers: string[] = [];

    for (const biz of allCompanies) {
        // Generate pseudo-org number using Ticker
        const orgNumber = `GB-${biz.ticker}`;

        // Check if exists
        const { data: existing } = await supabase
            .from('businesses')
            .select('id')
            .eq('org_number', orgNumber)
            .single();

        if (existing) {
            skipped++;
            continue;
        }

        const { error } = await supabase.from('businesses').insert({
            legal_name: biz.name,
            org_number: orgNumber,
            country_code: 'GB',
            domain: null, // Let Discovery Bot find it
            website_status: null, // Ready for discovery
            registry_data: {
                source: 'wikipedia_ftse',
                ticker: biz.ticker,
                industry: biz.sector,
                verified_at: new Date().toISOString()
            },
            verification_status: 'verified',
            discovery_source: 'manual_import_uk'
        });

        if (error) {
            console.error(`❌ Error importing ${biz.name}:`, error.message);
        } else {
            console.log(`✅ Imported: ${biz.name} (${biz.ticker})`);
            imported++;
            newOrgNumbers.push(orgNumber);
        }
    }

    console.log(`\n📊 Summary: Imported: ${imported}, Skipped: ${skipped}`);

    // Submit to IndexNow if needed
    if (newOrgNumbers.length > 0) {
        // console.log(`📡 Submitting ${newOrgNumbers.length} new profiles to IndexNow...`);
        // await submitBusinessProfiles(newOrgNumbers);
    }
}

// Run if called directly
if (require.main === module) {
    runUKImport().catch(console.error);
}
