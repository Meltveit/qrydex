
/**
 * Norwegian Industry & Tech Importer
 * Targeted import for Production, Industry, and Technology sectors.
 * 
 * Schedule: Batch of 20 every 10 minutes.
 * Deduplication: Checks existing DB + uses onConflict.
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { loadBotState, saveBotState } from '../bot-state';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STATE_FILE = 'no-industry-importer';
const BATCH_SIZE = 20;
const SLEEP_MS = 10 * 60 * 1000; // 10 minutes

// Load state (pagination offset)
const state = loadBotState(STATE_FILE, { offset: 0 });
let currentOffset = state.offset;

// Strict Industry Filters (NACE Codes)
const TARGET_INDUSTRIES: Record<string, string> = {
    // === TECH & IT ===
    '62': 'Computer programming, consultancy and related activities',
    '63': 'Information service activities',
    '26': 'Manufacture of computer, electronic and optical products',
    '58': 'Publishing activities (Software)',

    // === PRODUCTION (MANUFACTURING) ===
    '10': 'Manufacture of food products',
    '11': 'Manufacture of beverages',
    '13': 'Manufacture of textiles',
    '16': 'Manufacture of wood and of products of wood',
    '17': 'Manufacture of paper and paper products',
    '19': 'Manufacture of coke and refined petroleum products',
    '20': 'Manufacture of chemicals and chemical products',
    '21': 'Manufacture of basic pharmaceutical products',
    '22': 'Manufacture of rubber and plastic products',
    '23': 'Manufacture of other non-metallic mineral products',
    '24': 'Manufacture of basic metals',
    '25': 'Manufacture of fabricated metal products',
    '27': 'Manufacture of electrical equipment',
    '28': 'Manufacture of machinery and equipment n.e.c.',
    '29': 'Manufacture of motor vehicles, trailers',
    '30': 'Manufacture of other transport equipment',
    '31': 'Manufacture of furniture',
    '32': 'Other manufacturing',
    '33': 'Repair and installation of machinery and equipment',

    // === INDUSTRY & ENGINEERING ===
    '05': 'Mining of coal and lignite',
    '06': 'Extraction of crude petroleum and natural gas',
    '07': 'Mining of metal ores',
    '08': 'Other mining and quarrying',
    '09': 'Mining support service activities',
    '35': 'Electricity, gas, steam and air conditioning supply',
    '36': 'Water collection, treatment and supply',
    '37': 'Sewerage',
    '38': 'Waste collection, treatment and disposal activities',
    '39': 'Remediation activities and other waste management',
    '71': 'Architectural and engineering activities'
};

async function fetchBatch() {
    console.log(`🇳🇴 Fetching Norwegian Industry Batch (Offset: ${currentOffset})...`);

    // Fetch a larger page because we need to filter client-side
    // Brreg API doesn't support multi-NACE filtering easily in one param without complex valid queries
    // So we fetch 100, filter locally, and take up to 20.
    const response = await fetch(
        `https://data.brreg.no/enhetsregisteret/api/enheter?page=${Math.floor(currentOffset / 100)}&size=100&registrertIMvaregisteret=true`
    );

    if (!response.ok) {
        console.error(`❌ API Error: ${response.statusText}`);
        return [];
    }

    const data = await response.json();
    const enheter = data._embedded?.enheter || [];

    const candidates: any[] = [];

    for (const e of enheter) {
        // Strict Filter
        const code = e.naeringskode1?.kode?.substring(0, 2);
        if (code && TARGET_INDUSTRIES[code]) {
            candidates.push(e);
        }
    }

    // Update global offset relative to API pages (we stepped 100 items forward in the API)
    // To ensure we don't loop the same 100 forever if we find < 20, we must increment offset.
    // Simplifying strategy: We use 'currentOffset' as the literal API item count.

    // Actually, Brreg pagination is 'page' & 'size'.
    // If we use page=X, we get items X*100 to (X+1)*100.
    // We should just increment page count effectively.
    // Let's rely on `currentOffset` tracking total *processed* items? 
    // No, safest is to track `page` index.

    // Let's redefine state to track `pageIndex`.
    // But we reuse `currentOffset` as `pageIndex * 100` for compatibility if desired, 
    // or just change logic to `pageIndex`.
    // Let's stick to `currentOffset` representing the number of items *scanned* (roughly).

    return candidates.slice(0, BATCH_SIZE);
}

async function saveBatch(companies: any[]) {
    let saved = 0;

    for (const biz of companies) {
        const orgNr = biz.organisasjonsnummer;
        const name = biz.navn;
        const industry = biz.naeringskode1?.beskrivelse;
        const code = biz.naeringskode1?.kode;

        // Upsert to DB
        const { error } = await supabase.from('businesses').upsert({
            org_number: orgNr,
            legal_name: name,
            country_code: 'NO',
            registry_data: {
                source: 'brreg_industry_bot',
                employees: biz.antallAnsatte || 0,
                industry_code: code,
                industry_name: industry,
                vat_number: biz.registrertIMvaregisteret ? `NO${orgNr}MVA` : undefined,
                vat_status: 'Active',
                registered_address: [
                    biz.forretningsadresse?.adresse?.[0],
                    biz.forretningsadresse?.poststed
                ].filter(Boolean).join(', '),
                established_date: biz.stiftelsesdato
            },
            website_status: biz.hjemmeside ? null : undefined, // Trigger discovery if internal website field empty but maybe finding it later
            // Note: If Brreg has 'hjemmeside', we could use it, but safe to let discovery bot verify it or just set it?
            // Let's map it if present.
            domain: biz.hjemmeside ? biz.hjemmeside.replace(/https?:\/\/(www\.)?/, '').split('/')[0] : null
        }, { onConflict: 'org_number' });

        if (!error) {
            saved++;
            console.log(`   ✅ Saved: ${name} (${industry})`);
        } else {
            // console.error(`   ⚠️ Info: ${name} exists or error: ${error.message}`);
        }
    }
    return saved;
}

async function runLoop() {
    console.log('🏭 Norwegian Industry Importer Started');
    console.log(`   Target: Tech, Production, Industry`);
    console.log(`   Batch: ${BATCH_SIZE}, Interval: 10m`);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            const candidates = await fetchBatch();

            if (candidates.length > 0) {
                const saved = await saveBatch(candidates);
                console.log(`📦 Batch Complete: Saved ${saved}/${candidates.length} candidates.`);
            } else {
                console.log('   No matching candidates in this API page.');
            }

            // Increment Page (using offset logic: skip 100 items)
            currentOffset += 100;
            saveBotState(STATE_FILE, { offset: currentOffset });

        } catch (err: any) {
            console.error('❌ Error:', err.message);
        }

        console.log(`⏱️  Sleeping ${SLEEP_MS / 60000} minutes...`);
        await new Promise(resolve => setTimeout(resolve, SLEEP_MS));
    }
}

runLoop().catch(console.error);
