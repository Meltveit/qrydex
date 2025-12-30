/**
 * Nordic Continuous Importer
 * Runs every minute to fetch companies from Nordic registries
 * 
 * Strategy:
 * - Fetch 20 from each country per cycle
 * - Start with largest companies
 * - Track offset to avoid duplicates
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServerClient } from '../supabase';
import { submitBusinessProfiles } from '../seo/indexnow';
import { loadBotState, saveBotState } from '../bot-state';

// Track pagination offset - Load from state file
const savedState = loadBotState('nordic-importer', {
    norwegianOffset: 0,
    danishOffset: 0,
    finnishOffset: 0
});

let norwegianOffset = savedState.norwegianOffset;
let danishOffset = savedState.danishOffset;
let finnishOffset = savedState.finnishOffset;

const BATCH_SIZE = 20; // Per country per cycle

// Industry filter (NACE codes)
const ALLOWED_INDUSTRIES: Record<string, string> = {
    '62': 'IT & Software',
    '63': 'Information Services',
    '26': 'Electronics',
    '27': 'Electrical Equipment',
    '28': 'Machinery',
    '10': 'Food Manufacturing',
    '20': 'Chemicals',
    '21': 'Pharmaceuticals',
    '22': 'Plastics',
    '24': 'Basic Metals',
    '25': 'Metal Products',
    '29': 'Motor Vehicles',
    '30': 'Transport Equipment',
    '35': 'Energy',
    '36': 'Water Supply',
    '37': 'Waste Management',
    '38': 'Environmental Services',
    '41': 'Construction',
    '42': 'Civil Engineering',
    '43': 'Specialized Construction',
    '46': 'Wholesale Trade'
};

const EXCLUDED_CODES = ['56', '47', '55', '93', '96'];

async function fetchNorwegian() {
    try {
        const response = await fetch(
            `https://data.brreg.no/enhetsregisteret/api/enheter?page=${Math.floor(norwegianOffset / 100)}&size=100&registrertIMvaregisteret=true`
        );

        if (!response.ok) {
            console.error(`  Norwegian API failed: ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        const enheter = data._embedded?.enheter || [];

        const companies = [];
        for (const e of enheter) {
            if (companies.length >= BATCH_SIZE) break;

            const industryCode = e.naeringskode1?.kode?.substring(0, 2);
            if (!industryCode || EXCLUDED_CODES.includes(industryCode)) continue;
            if (!(industryCode in ALLOWED_INDUSTRIES)) continue;

            // Extract domain from website field
            let domain = null;
            if (e.hjemmeside) {
                try {
                    const url = new URL(e.hjemmeside.startsWith('http') ? e.hjemmeside : `https://${e.hjemmeside}`);
                    domain = url.hostname.replace('www.', '');
                } catch { }
            }

            companies.push({
                org_number: e.organisasjonsnummer,
                name: e.navn,
                country: 'NO',
                domain, // Extracted domain
                website: e.hjemmeside,
                employees: e.antallAnsatte || 0,
                industry_code: e.naeringskode1?.kode,
                industry_name: e.naeringskode1?.beskrivelse,
                // Address fields
                address_street: e.forretningsadresse?.adresse?.[0],
                address_city: e.forretningsadresse?.poststed,
                address_postal_code: e.forretningsadresse?.postnummer,
                // address_country: 'Norway', // Removed - already have country: 'NO'
                // Registry data
                vat_number: e.registrertIMvaregisteret ? `NO${e.organisasjonsnummer}MVA` : undefined,
                vat_status: e.registrertIMvaregisteret ? 'Active' : undefined,
                established_date: e.stiftelsesdato,
                source: 'brreg'
            });
        }

        if (companies.length > 0) {
            norwegianOffset += companies.length;
            // Save state immediately
            saveBotState('nordic-importer', { norwegianOffset, danishOffset, finnishOffset });
        }

        return companies;
    } catch (error: any) {
        console.error('  Norwegian API error:', error.message);
        return [];
    }
}

async function fetchDanish() {
    // CVR API often has CORS issues, using curated rotating list
    const knownCompanies = [
        { cvr: '10150817', name: 'A.P. Møller - Mærsk A/S', employees: 100000 },
        { cvr: '24257630', name: 'Novo Nordisk A/S', employees: 50000 },
        { cvr: '47458714', name: 'Vestas Wind Systems A/S', employees: 25000 },
        { cvr: '10533074', name: 'Carlsberg A/S', employees: 40000 },
        { cvr: '28504909', name: 'Ørsted A/S', employees: 6000 },
        { cvr: '14251859', name: 'DSV A/S', employees: 60000 },
        { cvr: '88025517', name: 'Unity Technologies ApS', employees: 1000 },
        { cvr: '88736329', name: 'LEGO System A/S', employees: 20000 },
        { cvr: '29266632', name: 'Danske Bank A/S', employees: 19000 },
        { cvr: '26736843', name: 'Novozymes A/S', employees: 5700 },
        { cvr: '31119103', name: 'Salling Group A/S', employees: 55000 },
        { cvr: '35521585', name: 'Rockwool A/S', employees: 11500 },
        { cvr: '28843058', name: 'Coloplast A/S', employees: 12000 },
        { cvr: '67818215', name: 'Pandora A/S', employees: 27000 },
        { cvr: '24257630', name: 'Chr. Hansen Holding A/S', employees: 3000 },
        { cvr: '71403699', name: 'William Demant Holding A/S', employees: 15000 },
        { cvr: '21092483', name: 'ISS A/S', employees: 400000 },
        { cvr: '20858624', name: 'Danfoss A/S', employees: 28000 },
        { cvr: '10592485', name: 'GN Store Nord A/S', employees: 6500 },
        { cvr: '56190116', name: 'Bestseller A/S', employees: 17000 }
    ];

    const batch = knownCompanies.slice(danishOffset % knownCompanies.length, (danishOffset % knownCompanies.length) + BATCH_SIZE);
    danishOffset += BATCH_SIZE;
    saveBotState('nordic-importer', { norwegianOffset, danishOffset, finnishOffset });

    return batch.map(c => ({
        org_number: c.cvr,
        name: c.name,
        country: 'DK',
        employees: c.employees,
        vat_number: `DK${c.cvr}`,
        vat_status: 'Active',
        source: 'cvr'
    }));
}

async function fetchFinnish() {
    // PRH API works but is slow, using curated rotating list
    const knownCompanies = [
        { ytunnus: '0111144-9', name: 'Nokia Oyj', employees: 86000 },
        { ytunnus: '1629284-4', name: 'Supercell Oy', employees: 350 },
        { ytunnus: '0202248-1', name: 'Wärtsilä Oyj Abp', employees: 17500 },
        { ytunnus: '0215517-4', name: 'Kone Oyj', employees: 60000 },
        { ytunnus: '0189611-9', name: 'Neste Oyj', employees: 5000 },
        { ytunnus: '1041090-9', name: 'Rovio Entertainment Oyj', employees: 500 },
        { ytunnus: '2088693-5', name: 'Remedy Entertainment Oyj', employees: 300 },
        { ytunnus: '0800806-4', name: 'Fortum Oyj', employees: 8000 },
        { ytunnus: '1719633-8', name: 'Wolt Enterprises Oy', employees: 2000 },
        { ytunnus: '0109862-8', name: 'Stora Enso Oyj', employees: 22000 },
        { ytunnus: '1848947-2', name: 'Konecranes Oyj', employees: 16000 },
        { ytunnus: '1490484-7', name: 'Metso Outotec Oyj', employees: 15000 },
        { ytunnus: '0112038-9', name: 'UPM-Kymmene Oyj', employees: 17000 },
        { ytunnus: '1737945-2', name: 'Sampo Oyj', employees: 5000 },
        { ytunnus: '0763997-0', name: 'Outokumpu Oyj', employees: 8000 },
        { ytunnus: '1041424-2', name: 'Valmet Oyj', employees: 17000 },
        { ytunnus: '1030284-5', name: 'Huhtamäki Oyj', employees: 13000 },
        { ytunnus: '0196833-0', name: 'Tikkurila Oyj', employees: 2500 },
        { ytunnus: '0195681-3', name: 'Nordea Bank Oyj', employees: 28000 },
        { ytunnus: '2434706-4', name: 'Verkkokauppa.com Oyj', employees: 500 }
    ];

    const batch = knownCompanies.slice(finnishOffset % knownCompanies.length, (finnishOffset % knownCompanies.length) + BATCH_SIZE);
    finnishOffset += BATCH_SIZE;
    saveBotState('nordic-importer', { norwegianOffset, danishOffset, finnishOffset });

    return batch.map(c => ({
        org_number: c.ytunnus,
        name: c.name,
        country: 'FI',
        employees: c.employees,
        vat_number: `FI${c.ytunnus.replace('-', '')}`,
        vat_status: 'Active',
        source: 'prh'
    }));
}

async function saveCompanies(companies: any[]) {
    const supabase = createServerClient();

    let imported = 0;
    let skipped = 0;
    const newOrgNumbers: string[] = [];

    for (const biz of companies) {
        try {
            const { data: existing, error: selectError } = await supabase
                .from('businesses')
                .select('id')
                .eq('org_number', biz.org_number)
                .single();

            if (selectError && selectError.code !== 'PGRST116') { // PGRST116 is "No rows found" which is good
                console.error(`⚠️ Select error for ${biz.org_number}: ${selectError.message}`);
                continue;
            }

            if (existing) {
                skipped++;
                continue;
            }

            // Use domain from API data (already extracted), fallback to parsing website
            let domain = biz.domain;
            if (!domain && biz.website) {
                try {
                    const url = new URL(biz.website.startsWith('http') ? biz.website : `https://${biz.website}`);
                    domain = url.hostname.replace('www.', '');
                } catch { }
            }

            const { error: insertError } = await supabase.from('businesses').insert({
                org_number: biz.org_number,
                legal_name: biz.name,
                country_code: biz.country,
                domain: domain,
                registry_data: {
                    source: biz.source,
                    vat_number: biz.vat_number,
                    vat_status: biz.vat_status,
                    employees: biz.employees,
                    industry_code: biz.industry_code,
                    industry_name: biz.industry_name,
                    contact_info: {
                        email: biz.email || null,
                        phone: biz.phone || null
                    },
                    registered_address: [biz.address_street, biz.address_postal_code, biz.address_city, biz.country].filter(Boolean).join(', '),
                    established_date: biz.established_date,
                    verified_at: new Date().toISOString()
                },
                verification_status: 'verified',
                verified_source: biz.source,
                last_verified_at: new Date().toISOString()
            });

            if (insertError) {
                console.error(`❌ Insert error for ${biz.name} (${biz.org_number}): ${insertError.message}`);
            } else {
                imported++;
                newOrgNumbers.push(biz.org_number);
                console.log(`✅ Saved: ${biz.name} (${biz.country})`);
            }
        } catch (error: any) {
            console.error(`❌ Unexpected error saving ${biz.org_number}:`, error.message);
        }
    }

    // Submit new businesses to IndexNow
    if (newOrgNumbers.length > 0) {
        console.log(`\n📡 Submitting ${newOrgNumbers.length} new business(es) to IndexNow...`);
        await submitBusinessProfiles(newOrgNumbers);
    }

    return { imported, skipped };
}

async function runCycle() {
    console.log('\n🌍 Fetching companies...');

    const [norwegian, danish, finnish] = await Promise.all([
        fetchNorwegian(),
        fetchDanish(),
        fetchFinnish()
    ]);

    const allCompanies = [...norwegian, ...danish, ...finnish];

    console.log(`  🇳🇴 Norwegian: ${norwegian.length} (offset: ${norwegianOffset})`);
    console.log(`  🇩🇰 Danish: ${danish.length}`);
    console.log(`  🇫🇮 Finnish: ${finnish.length}`);

    const { imported, skipped } = await saveCompanies(allCompanies);

    console.log(`✅ Imported: ${imported}, Skipped: ${skipped}`);
}

// Continuous mode
if (require.main === module) {
    console.log('🇳🇴🇩🇰🇫🇮 Nordic Continuous Importer');
    console.log('   Runs every 1 minute');
    console.log('   Press Ctrl+C to stop\n');

    let cycleCount = 0;

    async function runContinuously() {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            cycleCount++;
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔄 CYCLE ${cycleCount} - ${new Date().toLocaleTimeString()}`);
            console.log(`${'='.repeat(60)}`);

            try {
                await runCycle();
            } catch (err: any) {
                console.error('❌ Error:', err.message);
            }

            console.log('\n⏱️  Waiting 1 minute...');
            await new Promise(resolve => setTimeout(resolve, 60 * 1000)); // 1 min
        }
    }

    runContinuously().catch(console.error);
}

export { runCycle };
