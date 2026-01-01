
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

const URLS = [
    { url: 'https://en.wikipedia.org/wiki/CAC_40', source: 'wikipedia_cac40' },
    { url: 'https://en.wikipedia.org/wiki/CAC_Next_20', source: 'wikipedia_cac_next20' }
];

async function fetchWikipediaCompanies(): Promise<any[]> {
    const allCompanies: any[] = [];

    for (const site of URLS) {
        console.log(`🇫🇷 Fetching from ${site.url}...`);

        try {
            const response = await fetch(site.url, {
                headers: { 'User-Agent': 'QrydexBot/1.0 (Education Project)' }
            });

            if (!response.ok) {
                console.error(`Failed to fetch ${site.url}: ${response.status}`);
                continue;
            }

            const html = await response.text();
            const $ = cheerio.load(html);
            let foundInPage = 0;

            // Find tables
            const tables = $('table');
            console.log(`   🔎 Found ${tables.length} tables.`);

            tables.each((i, table) => {
                const headers = $(table).find('tr').first().text().toLowerCase().trim().replace(/\n/g, ' ');
                // console.log(`   Table ${i} Headers: ${headers.substring(0, 100)}...`);

                if ((headers.includes('company') || headers.includes('name')) &&
                    (headers.includes('ticker') || headers.includes('symbol') || headers.includes('code') || headers.includes('sector'))) {

                    const rows = $(table).find('tr').slice(1);

                    rows.each((j, row) => {
                        const cols = $(row).find('td');
                        if (cols.length >= 2) {
                            let name = '';
                            let ticker = '';
                            let sector = '';

                            // Use specific indices based on typical Wiki format
                            // CAC 40: Company | Sector | Ticker
                            // CAC Next 20: Company | Sector | Ticker

                            // Try to grab text from first 3 columns
                            const col0 = $(cols[0]).text().trim();
                            const col1 = $(cols[1]).text().trim();
                            const col2 = $(cols[2]).text().trim();

                            if (col0 && col0.length > 2) name = col0;
                            if (col1) sector = col1;
                            if (col2 && col2.length < 10) ticker = col2;

                            // Fallback if Ticker is in Col 1 (rare but possible)
                            if (!ticker && col1.length < 8 && /^[A-Z0-9\.]+$/.test(col1)) ticker = col1;

                            if (name && name !== 'Company') {
                                allCompanies.push({ name, ticker, sector, source_url: site.url, source_id: site.source });
                                foundInPage++;
                            }
                        }
                    });
                }
            });
            console.log(`   ✅ Extracted ${foundInPage} companies.`);

        } catch (err: any) {
            console.error(`   ❌ Error fetching ${site.url}:`, err.message);
        }
    }

    return allCompanies;
}

async function runImporter() {
    console.log('🥖 French Importer Bot Started (CAC 40 + Next 20)');

    try {
        const companies = await fetchWikipediaCompanies();
        console.log(`🎯 Found TOTAL ${companies.length} companies.`);

        let imported = 0;

        for (const company of companies) {

            if (!company.name) continue;

            // Generate a unique ID (e.g. FR-EPA-AIR)
            const ticker = company.ticker || company.name.substring(0, 3).toUpperCase();
            const orgNr = `FR-EPA-${ticker.replace(/[^A-Z0-9]/g, '')}`;

            const { error } = await supabase.from('businesses').upsert({
                org_number: orgNr,
                legal_name: company.name,
                country_code: 'FR',
                registry_data: {
                    source: company.source_id,
                    ticker: company.ticker,
                    sector: company.sector,
                    status: 'Active'
                },
                // industry_category: company.sector, 
                website_status: null // Trigger Discovery
            }, { onConflict: 'org_number' });

            if (!error) {
                imported++;
                process.stdout.write('.');
            } else {
                // console.error(`Error saving ${company.name}:`, error.message);
            }
        }

        console.log(`\n✅ Imported ${imported} French companies.`);

    } catch (err: any) {
        console.error('❌ Error:', err.message);
    }
}

console.log('🚀 Loading fr-importer...');
runImporter().catch(console.error);
