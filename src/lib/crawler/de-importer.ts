
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Scrapes German Stock Indices from Wikipedia
 * DAX (Blue Chip), MDAX (Mid Cap), SDAX (Small Cap), TecDAX (Tech)
 */
async function fetchWikipediaCompanies(url: string, indexName: string) {
    console.log(`🇩🇪 Scraping ${indexName} from Wikipedia...`);
    try {
        const response = await fetch(url);
        const data = await response.text();
        const $ = cheerio.load(data);
        const companies: any[] = [];

        // Wikipedia tables for indices usually have "Company", "Ticker", "Sector" columns
        // Iterate through all tables to find the one with "Company"
        const tables = $('table.wikitable');
        console.log(`🔎 Found ${tables.length} tables on ${indexName} page.`);

        tables.each((i, table) => {
            // Headers can be in <thead><th> or <tbody><tr><th> or just first row <td>
            let headers: string[] = [];

            const ths = $(table).find('tr').first().find('th');
            if (ths.length > 0) {
                headers = ths.map((_i, el) => $(el).text().trim().toLowerCase()).get();
            } else {
                // Try first row tds
                const tds = $(table).find('tr').first().find('td');
                headers = tds.map((_i, el) => $(el).text().trim().toLowerCase()).get();
            }

            const headerText = headers.join(' ');
            console.log(`   Table ${i} Headers: ${headerText.substring(0, 50)}...`);

            // Heuristic to find the main constituent table
            if (headerText.includes('company') || headerText.includes('name') || headerText.includes('unternehmen')) {
                console.log(`✅ Found candidate table for ${indexName} at index ${i}`);

                $(table).find('tr').each((j, row) => {
                    // Skip header row
                    if (j === 0) return;

                    const cols = $(row).find('td');
                    if (cols.length < 2) return;

                    // Column mapping varies by article, so we use heuristics
                    // Common layouts: [Logo, Name, Sector, ...] or [Name, Sector, ...]

                    let name = '';
                    let sector = '';

                    // Extract text from columns, cleaning footnotes
                    const colTexts = cols.map((_k, col) => $(col).text().replace(/\[.*?\]/g, '').trim()).get();

                    // Detect column indices based on headers if possible, otherwise guess
                    let nameIdx = headers.findIndex(h => h.includes('company') || h.includes('name') || h.includes('unternehmen'));
                    let sectorIdx = headers.findIndex(h => h.includes('sector') || h.includes('industry') || h.includes('branche'));

                    if (nameIdx === -1) nameIdx = 0; // Default to first col
                    if (sectorIdx === -1) sectorIdx = 1; // Default to second col

                    // Special case for some tables having a Logo in col 0
                    if (colTexts[0] === '' && colTexts.length > 2) {
                        name = colTexts[1];
                    } else {
                        name = colTexts[nameIdx] || colTexts[0];
                    }

                    sector = colTexts[sectorIdx] || '';

                    if (name && name.length > 1) {
                        companies.push({
                            name,
                            ticker: 'DE-' + name.replace(/\s+/g, '-').toUpperCase().replace(/[^A-Z0-9-]/g, ''),
                            sector,
                            source: indexName
                        });
                    }
                });
                return false; // Break after first valid-looking table
            }
        });

        console.log(`✅ Found ${companies.length} companies in ${indexName}`);
        return companies;
    } catch (e: any) {
        console.error(`❌ Error scraping ${indexName}:`, e.message);
        return [];
    }
}

async function runGermanImport() {
    // const supabase = createServerClient(); // Removed, using global instance

    console.log('🇩🇪 Starting Germany (DAX/MDAX) Import...');

    const indices = [
        { name: 'DAX', url: 'https://en.wikipedia.org/wiki/DAX' },
        { name: 'MDAX', url: 'https://en.wikipedia.org/wiki/MDAX' },
        { name: 'TecDAX', url: 'https://en.wikipedia.org/wiki/TecDAX' }
    ];

    let allCompanies: any[] = [];

    for (const index of indices) {
        const companies = await fetchWikipediaCompanies(index.url, index.name);
        allCompanies = [...allCompanies, ...companies];
    }

    console.log(`\n📦 Total German companies found: ${allCompanies.length}`);

    let imported = 0;

    for (const biz of allCompanies) {
        // ID Generation: DE-[CleanName]
        // This is not an official register number, but serves as a unique handle for our system
        const cleanName = biz.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 20);
        const orgNumber = `DE-${cleanName}`; // e.g. DE-SIEMENSAG

        // Check if exists
        const { data: existing } = await supabase
            .from('businesses')
            .select('id')
            .eq('org_number', orgNumber)
            .single();

        if (existing) {
            continue;
        }

        const { error } = await supabase.from('businesses').insert({
            legal_name: biz.name,
            org_number: orgNumber,
            country_code: 'DE',
            domain: null, // Let Discovery Bot find it
            website_status: null, // Ready for discovery
            company_description: `Publicly traded company listed in ${biz.source}. (Germany)`,
            registry_data: {
                source: 'wikipedia_dax',
                index: biz.source,
                industry: biz.sector,
                imported_at: new Date().toISOString()
            },
            verification_status: 'verified', // It's on DAX, it's real
            discovery_source: 'manual_import_de',
            trust_score: 50 // Start moderate
        });

        if (error) {
            console.error(`❌ Error importing ${biz.name}:`, error.message);
        } else {
            console.log(`✅ Imported: ${biz.name} (${orgNumber})`);
            imported++;
        }
    }

    console.log(`\n📊 Summary: Imported ${imported} new German companies.`);
}

// Run if called directly
if (require.main === module) {
    runGermanImport().catch(console.error);
}
