
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use Service Role for bulk inserts bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey);

async function ingestBrregCompanies(limit = 20) {
    console.log(`📥 Fetching ${limit} companies from Brreg...`);

    try {
        const response = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter?organisasjonsform=AS&konkurs=false&size=${limit}`);
        if (!response.ok) throw new Error(`Brreg API error: ${response.statusText}`);

        const data = await response.json();
        const companies = data._embedded?.enheter || [];

        console.log(`🔹 Found ${companies.length} companies. Inserting into DB...`);

        let inserted = 0;
        let skipped = 0;

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
                trust_score: 50, // Initial seed score
                verification_status: 'pending'
            };

            // Upsert business
            const { error } = await supabase
                .from('businesses')
                .upsert(businessData, { onConflict: 'org_number', ignoreDuplicates: true });

            if (error) {
                console.error(`Status insert failed for ${company.navn}:`, error.message);
                skipped++;
            } else {
                inserted++;
            }
        }

        console.log(`✅ Ingestion complete. Inserted: ${inserted}, Skipped/Error: ${skipped}`);

    } catch (error) {
        console.error('❌ Ingestion failed:', error);
    }
}

ingestBrregCompanies(50);
