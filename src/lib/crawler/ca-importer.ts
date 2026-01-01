
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WIKI_URL = 'https://en.wikipedia.org/wiki/S%26P/TSX_Composite_Index';

async function fetchWikipediaCompanies(): Promise<any[]> {
    console.log(`🇨🇦 Fetching S&P/TSX 60 from Wikipedia...`);

    const response = await fetch(WIKI_URL, {
        headers: {
            'User-Agent': 'QrydexBot/1.0 (Education Project)'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch Wikipedia: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const companies: any[] = [];

    // Find the main table
    // Usually the first table with "Symbol" or "Company"
    const tables = $('table.wikitable');
    console.log(`🔎 Found ${tables.length} tables.`);

    tables.each((i, table) => {
        const headers = $(table).find('tr').first().text().toLowerCase().trim();
        console.log(`   Table ${i} Headers: ${headers.substring(0, 100)}...`);

        if ((headers.includes('symbol') || headers.includes('ticker')) && (headers.includes('company') || headers.includes('name'))) {
            // Found the constituents table
            const rows = $(table).find('tr').slice(1); // Skip header

            rows.each((j, row) => {
                const cols = $(row).find('td');
                if (cols.length >= 2) {
                    const symbol = $(cols[0]).text().trim();
                    const name = $(cols[1]).text().trim();
                    const sector = $(cols[2]).text().trim(); // Assume sector is 3rd col

                    if (name && symbol) {
                        companies.push({
                            name,
                            symbol,
                            sector,
                            source_url: WIKI_URL
                        });
                    }
                }
            });
        }
    });

    return companies;
}

// B2B Filtering Logic
function isB2BCandidate(sector: string, name: string): boolean {
    const s = sector.toLowerCase();
    const n = name.toLowerCase();

    // Explicit B2C checks
    const badKeywords = ['restaurant', 'retail', 'grocery', 'fashion', 'apparel'];
    // Allowed sectors: Financials, Energy, Materials, Industrials, Technology, Communication, Real Estate
    // S&P 60 is mostly huge corps, so we accept most, but skip pure Retail if user insisted (e.g. Dollarama?)
    // Actually, big retail like Canadian Tire is B2B2C, significant infrastructure.
    // We'll keep most of TSX 60 as they are "Major" companies.

    return true;
}

async function runImporter() {
    console.log('🍁 Canadian TSX Importer Bot Started');

    try {
        const companies = await fetchWikipediaCompanies();
        console.log(`🎯 Found ${companies.length} companies.`);

        let imported = 0;

        for (const company of companies) {
            // console.log(`   Processing: ${company.name} (${company.symbol})`);

            if (!isB2BCandidate(company.sector, company.name)) continue;

            // Generate a unique ID from Symbol (e.g. CA-T-SHOP)
            // TSX symbols often have .TO suffix implicitly.
            const orgNr = `CA-TSX-${company.symbol.replace('.', '')}`;

            const { error } = await supabase.from('businesses').upsert({
                org_number: orgNr,
                legal_name: company.name,
                country_code: 'CA',
                registry_data: {
                    source: 'wikipedia_tsx60',
                    ticker: company.symbol,
                    sector: company.sector,
                    status: 'Active'
                },
                // industry_category: company.sector, // Column does not exist
                website_status: null // Trigger Discovery
            }, { onConflict: 'org_number' });

            if (!error) {
                imported++;
                process.stdout.write('.');
            } else {
                console.error(`Error saving ${company.name}:`, error.message);
            }
        }

        console.log(`\n✅ Imported ${imported} Canadian companies.`);

    } catch (err: any) {
        console.error('❌ Error:', err.message);
    }
}

console.log('🚀 Loading ca-importer...');
runImporter().catch(console.error);
