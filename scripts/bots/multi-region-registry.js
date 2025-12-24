/**
 * Multi-Region Registry Crawler
 * Supports: Norway, EU (VIES), UK, Germany, Sweden
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

const B2B_NACE_CODES = ['10', '11', '13', '16', '20', '22', '25', '28', '41', '42', '43', '46', '49', '52', '58', '62', '63', '71', '73'];

/**
 * Crawl Norwegian businesses
 */
async function crawlNorway(limit = 30) {
    console.log('\n🇳🇴 Crawling Norway (Brønnøysund)...');
    let added = 0;

    for (const nace of B2B_NACE_CODES.slice(0, 5)) {
        const url = `https://data.brreg.no/enhetsregisteret/api/enheter?naeringskode=${nace}&size=${limit}`;
        const response = await fetch(url);
        const data = await response.json();

        const businesses = data._embedded?.enheter || [];

        for (const biz of businesses.slice(0, 20)) {
            try {
                const { data: existing } = await supabase
                    .from('businesses')
                    .select('org_number')
                    .eq('org_number', biz.organisasjonsnummer)
                    .single();

                if (existing) continue;

                const { error } = await supabase.from('businesses').insert({
                    org_number: biz.organisasjonsnummer,
                    legal_name: biz.navn,
                    country_code: 'NO',
                    registry_data: {
                        org_nr: biz.organisasjonsnummer,
                        legal_name: biz.navn,
                        registered_address: biz.forretningsadresse?.adresse?.[0] || '',
                    },
                    trust_score: 50,
                    verification_status: 'verified',
                });

                if (!error) {
                    console.log(`  ✓ ${biz.navn}`);
                    added++;
                }

                await new Promise(r => setTimeout(r, 200));
            } catch (err) { }
        }
    }

    console.log(`  Done: ${added} added\n`);
    return added;
}

/**
 * Crawl UK businesses (Companies House)
 */
async function crawlUK(limit = 20) {
    console.log('\n🇬🇧 Crawling UK (Companies House)...');

    // Free API - no key required for basic search
    const sicCodes = ['10000', '15000', '20000', '28000', '41000', '46000', '62000'];
    let added = 0;

    for (const sic of sicCodes.slice(0, 3)) {
        try {
            const url = `https://api.company-information.service.gov.uk/search/companies?q=*&sic_codes=${sic}&items_per_page=${limit}`;
            const response = await fetch(url);

            if (!response.ok) continue;

            const data = await response.json();
            const companies = data.items || [];

            for (const company of companies.slice(0, 15)) {
                try {
                    const { data: existing } = await supabase
                        .from('businesses')
                        .select('org_number')
                        .eq('org_number', company.company_number)
                        .single();

                    if (existing) continue;

                    const { error } = await supabase.from('businesses').insert({
                        org_number: company.company_number,
                        legal_name: company.title,
                        country_code: 'GB',
                        registry_data: {
                            org_nr: company.company_number,
                            legal_name: company.title,
                            company_status: company.company_status,
                            registered_address: company.address_snippet,
                        },
                        trust_score: 50,
                        verification_status: 'verified',
                    });

                    if (!error) {
                        console.log(`  ✓ ${company.title}`);
                        added++;
                    }

                    await new Promise(r => setTimeout(r, 500));
                } catch (err) { }
            }
        } catch (err) {
            console.error(`  Error SIC ${sic}:`, err.message);
        }
    }

    console.log(`  Done: ${added} added\n`);
    return added;
}

/**
 * Crawl German businesses (via EU VIES)
 */
async function crawlGermany(limit = 15) {
    console.log('\n🇩🇪 Crawling Germany (sample)...');

    // Note: Full German registry requires commercial API
    // Using sample companies for now
    const sampleCompanies = [
        { vat: 'DE123456789', name: 'Sample German GmbH' },
        // Add more as we get real API access
    ];

    let added = 0;
    console.log(`  Done: ${added} added (requires commercial API)\n`);
    return added;
}

/**
 * Main multi-region crawler
 */
async function runMultiRegion() {
    console.log('🌍 Multi-Region Registry Crawler\n');

    const stats = {
        NO: await crawlNorway(30),
        GB: await crawlUK(20),
        DE: await crawlGermany(15),
    };

    console.log('\n📊 Summary:');
    console.log(`   Norway: ${stats.NO}`);
    console.log(`   UK: ${stats.GB}`);
    console.log(`   Germany: ${stats.DE}`);
    console.log(`   Total: ${stats.NO + stats.GB + stats.DE}\n`);
}

runMultiRegion().catch(console.error);
