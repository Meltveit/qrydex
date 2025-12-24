/**
 * Simple Registry Crawler - JavaScript version that works
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
);

// B2B NACE codes - produksjon, bygg, engros, transport
const B2B_NACE_CODES = [
    '10', '11', '13', '16', '20', '22', '25', '28', // Produksjon
    '41', '42', '43', // Bygg/anlegg  
    '46', '47', // Engros/retail
    '49', '52', // Transport/logistikk
    '71', '73', // Tekniske tjenester
];

async function crawlNorway(limit = 50) {
    console.log('\n📍 Crawling Norwegian businesses...\n');

    let verified = 0;
    let failed = 0;

    for (const nace of B2B_NACE_CODES.slice(0, 5)) { // First 5 codes
        try {
            const url = `https://data.brreg.no/enhetsregisteret/api/enheter?naeringskode=${nace}&size=${limit}`;
            const response = await fetch(url);
            const data = await response.json();

            const businesses = data._embedded?.enheter || [];
            console.log(`Found ${businesses.length} businesses for NACE ${nace}`);

            for (const biz of businesses.slice(0, 30)) { // Max 30 per code
                const orgNumber = biz.organisasjonsnummer;
                const legalName = biz.navn;
                const address = biz.forretningsadresse?.adresse?.[0] || '';

                try {
                    // Check if exists
                    const { data: existing } = await supabase
                        .from('businesses')
                        .select('org_number')
                        .eq('org_number', orgNumber)
                        .single();

                    if (existing) {
                        continue; // Skip existing
                    }

                    // Insert new
                    const { error } = await supabase
                        .from('businesses')
                        .insert({
                            org_number: orgNumber,
                            legal_name: legalName,
                            country_code: 'NO',
                            registry_data: {
                                org_nr: orgNumber,
                                legal_name: legalName,
                                registered_address: address,
                                company_status: 'Active',
                            },
                            trust_score: 50,
                            verification_status: 'verified',
                            last_verified_at: new Date().toISOString(),
                        });

                    if (error) {
                        failed++;
                    } else {
                        console.log(`  ✓ ${legalName}`);
                        verified++;
                    }

                    await new Promise(r => setTimeout(r, 200)); // Rate limit
                } catch (err) {
                    failed++;
                }
            }
        } catch (err) {
            console.error(`Error NACE ${nace}:`, err.message);
        }
    }

    console.log(`\n✅ Done: ${verified} added, ${failed} failed\n`);
    return { verified, failed };
}

async function main() {
    console.log('🤖 Crawler Starting...\n');
    await crawlNorway(50);
    console.log('\n✅ Crawler completed!');
}

main().catch(console.error);
