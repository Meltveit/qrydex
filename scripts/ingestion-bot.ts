
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use Service Role
const supabase = createClient(supabaseUrl, supabaseKey);

// --- 1. NORWAY (Brønnøysund) ---
async function ingestNorway(limit = 20) {
    // Brreg has approx 400k+ AS. With size=20, that's ~20,000 pages.
    // We pick a random page to sample the entire history, not just the newest.
    const randomPage = Math.floor(Math.random() * 15000);

    console.log(`🇳🇴 [Recruiter] Digging into the archives (Page ${randomPage})...`);
    try {
        // Removed 'sort=...' to get default (usually org number) but offset by page
        const response = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter?organisasjonsform=AS&konkurs=false&page=${randomPage}&size=${limit}`);
        if (!response.ok) throw new Error(`Brreg API error: ${response.statusText}`);

        const data = await response.json();
        const companies = data._embedded?.enheter || [];

        let inserted = 0;
        for (const company of companies) {
            const businessData = {
                org_number: company.organisasjonsnummer,
                legal_name: company.navn,
                country_code: 'NO',
                domain: company.hjemmeside || null,
                registry_data: {
                    org_nr: company.organisasjonsnummer,
                    legal_name: company.navn,
                    registered_address: company.forretningsadresse ? `${company.forretningsadresse.adresse[0]}, ${company.forretningsadresse.postnummer} ${company.forretningsadresse.poststed}` : undefined,
                    registration_date: company.registreringsdatoEnhetsregisteret,
                    industry_codes: company.naeringskode1 ? [company.naeringskode1.beskrivelse] : [],
                    employee_count: company.antallAnsatte || 0,
                    company_status: 'Active'
                },
                trust_score: 50,
                verification_status: 'pending'
            };

            const { error } = await supabase.from('businesses').upsert(businessData, { onConflict: 'org_number', ignoreDuplicates: true });
            if (!error) inserted++;
        }
        console.log(`✅ [Norway] Ingested/Checked ${companies.length} companies.`);
    } catch (error) {
        console.error('❌ [Norway] Failed:', error);
    }
}

// --- 2. USA (SEC EDGAR) ---
async function ingestUSA_SEC() {
    console.log(`🇺🇸 [Recruiter] Fetching public companies from SEC EDGAR...`);
    try {
        // SEC requires a defined User-Agent
        const response = await fetch('https://www.sec.gov/files/company_tickers.json', {
            headers: { 'User-Agent': 'QrydexBot/1.0 (bot@qrydex.com)' }
        });

        if (!response.ok) throw new Error(`SEC API error: ${response.statusText}`);

        const data = await response.json();
        // format: { "0": { "cik_str": 320193, "ticker": "AAPL", "title": "Apple Inc." }, ... }
        const companies = Object.values(data);

        // Take a random batch of 20 to ingest each run (to process the huge list over time)
        // Or generic shuffle
        const batch = companies.sort(() => 0.5 - Math.random()).slice(0, 20);

        console.log(`🔹 Found ${companies.length} total US public companies. Processing random batch of ${batch.length}...`);

        let inserted = 0;
        for (const company of (batch as any[])) {
            const businessData = {
                org_number: company.cik_str.toString(), // CIK acts as org number
                legal_name: company.title,
                country_code: 'US',
                domain: null, // We don't get domain from ticker list, Discovery bot must find it
                registry_data: {
                    org_nr: company.cik_str,
                    legal_name: company.title,
                    ticker: company.ticker,
                    source: 'SEC EDGAR',
                    company_status: 'Active' // Listed = Active usually
                },
                trust_score: 60, // Listed companies start slightly higher
                verification_status: 'pending'
            };

            const { error } = await supabase.from('businesses').upsert(businessData, { onConflict: 'org_number', ignoreDuplicates: true });
            if (!error) inserted++;
        }
        console.log(`✅ [USA] Ingested/Checked ${inserted} SEC companies.`);

    } catch (error) {
        console.error('❌ [USA] Failed:', error);
    }
}

// --- 3. UK (Companies House) - Stub/Check ---
async function ingestUK() {
    const key = process.env.COMPANIES_HOUSE_API_KEY;
    if (!key) {
        console.log('🇬🇧 [Recruiter] Skipping UK (No API Key configured). Add COMPANIES_HOUSE_API_KEY to .env.local to enable.');
        return;
    }
    console.log('🇬🇧 [Recruiter] UK Ingestion requires custom search logic. (Not fully implemented in auto-mode yet)');
    // Logic would go here if we had a "Recent Filings" stream.
}

// --- 4. FINLAND (PRH / YTJ) ---
async function ingestFinland() {
    // Randomly sample the Finnish registry
    // YTJ has ~600k active. Max offset might be limited, let's try random up to 10000 for now.
    const randomOffset = Math.floor(Math.random() * 5000);

    console.log(`🇫🇮 [Recruiter] Sampling Finnish archive (Offset ${randomOffset})...`);
    try {
        // resultsFrom = skip count
        const response = await fetch(`http://avoindata.prh.fi/bis/v1?totalResults=false&maxResults=50&resultsFrom=${randomOffset}`);

        if (!response.ok) {
            // console.log(`🇫🇮 [Recruiter] YTJ API status: ${response.status} (No new data or error)`);
            return;
        }

        const data = await response.json();
        const companies = data.results || [];

        if (companies.length === 0) {
            console.log(`🇫🇮 [Recruiter] No new companies registered in Finland today (yet).`);
            return;
        }

        let inserted = 0;
        for (const company of companies) {
            const businessData = {
                org_number: company.businessId,
                legal_name: company.name,
                country_code: 'FI',
                domain: null, // YTJ doesn't usually provide URL in list view
                registry_data: {
                    org_nr: company.businessId,
                    legal_name: company.name,
                    registration_date: company.registrationDate,
                    company_status: 'Active', // Assumed for new registration
                    source: 'PRH / YTJ'
                },
                trust_score: 50,
                verification_status: 'pending'
            };

            const { error } = await supabase.from('businesses').upsert(businessData, { onConflict: 'org_number', ignoreDuplicates: true });
            if (!error) inserted++;
        }
        console.log(`✅ [Finland] Ingested ${inserted} new companies.`);

    } catch (error) {
        console.error('❌ [Finland] Failed:', error);
    }
}

// --- MAIN RUNNER ---
async function runIngestionBot() {
    console.log('🌍 [The Recruiter] Starting Global Ingestion Cycle...');

    // Run sequentially
    await ingestNorway(20);
    await ingestUSA_SEC();
    await ingestFinland();
    await ingestUK();

    console.log('🏁 [The Recruiter] Cycle Complete.');
}

export { runIngestionBot };

// Self-execute
import { fileURLToPath as urlToPath } from 'url';
if (process.argv[1] === urlToPath(import.meta.url)) {
    runIngestionBot();
}
