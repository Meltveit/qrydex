
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 25; // Process 25 companies per cycle
const SEC_MASTER_URL = 'https://www.sec.gov/files/company_tickers.json';

type SecTicker = {
    cik_str: number;
    ticker: string;
    title: string;
};

// Simple delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Qrydex Research (contact@qrydex.com)',
                    'Accept-Encoding': 'gzip, deflate',
                    'Host': 'data.sec.gov'
                }
            });
            if (res.ok) return res;
            if (res.status === 429) {
                console.log(`⚠️ Rate limited. Waiting ${(i + 1) * 2}s...`);
                await delay((i + 1) * 2000);
                continue;
            }
            throw new Error(`HTTP ${res.status}`);
        } catch (e) {
            if (i === retries - 1) throw e;
            await delay(1000);
        }
    }
    throw new Error('Max retries reached');
}

async function run() {
    console.log('🇺🇸 STARTING US SEC IMPORTER BOT...');

    // 1. Fetch Master List
    let tickers: SecTicker[] = [];
    try {
        console.log('Fetching SEC Master List...');
        const res = await fetch(SEC_MASTER_URL, {
            headers: { 'User-Agent': 'Qrydex Research (contact@qrydex.com)' }
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const raw = await res.json();
        // SEC returns an object with numeric keys "0", "1", etc. Convert to array.
        tickers = Object.values(raw).map((t: any) => ({
            cik_str: t.cik_str,
            ticker: t.ticker,
            title: t.title
        }));
        console.log(`✅ Loaded ${tickers.length} companies from SEC Master List.`);
    } catch (e: any) {
        console.error('❌ Failed to fetch master list:', e.message);
        process.exit(1);
    }

    // Infinite Loop
    while (true) {
        console.log(`🔄 Starting sync cycle. Total companies in SEC list: ${tickers.length}`);

        let batchProcessed = 0;

        for (const company of tickers) {

            // Rate limit / Batch pause
            if (batchProcessed > 0 && batchProcessed % BATCH_SIZE === 0) {
                console.log(`☕ Batch of ${BATCH_SIZE} done. Sleeping 5s...`);
                await delay(5000);
            }

            const cikStr = company.cik_str.toString(); // Unpadded (e.g. "1045810")
            const cikPadded = cikStr.padStart(10, '0'); // Padded (e.g. "0001045810")
            const legalName = company.title;

            // Check DB efficiently
            const { data: existingRecords, error } = await supabase
                .from('businesses')
                .select('id, registry_data, org_number, domain, website_status')
                .in('org_number', [cikStr, cikPadded])
                .eq('country_code', 'US');

            if (error) {
                console.error(`DB Error checking ${cikStr}:`, error.message);
                continue;
            }

            let existing = null;
            if (existingRecords && existingRecords.length > 0) {
                existing = existingRecords.find(r => r.org_number === cikStr) || existingRecords[0];
            }

            const targetOrgNumber = existing ? existing.org_number : cikPadded;

            let needsUpdate = false;
            let isNew = false;

            if (existing) {
                // Check if ANY key data is missing (Smart Enrichment)
                const regData = existing.registry_data || {};
                const isMissingAddress = !regData.registered_address || regData.registered_address === 'Unknown';
                const isMissingEIN = !regData.vat_number;
                const isMissingIndustry = !regData.industry_codes || regData.industry_codes.length === 0;
                const isMissingWebsite = !existing.domain && (!existing.website_status || existing.website_status === 'not_found');

                if (isMissingAddress || isMissingEIN || isMissingIndustry || isMissingWebsite) {
                    needsUpdate = true;
                } else {
                    continue;
                }
            } else {
                isNew = true;
                console.log(`🆕 Found NEW company: ${legalName} (${targetOrgNumber})`);
            }

            // Fetch details (Only if new or update needed)
            try {
                // Random jitter
                await delay(200 + Math.random() * 300);

                const detailUrl = `https://data.sec.gov/submissions/CIK${cikPadded}.json`;
                const res = await fetchWithRetry(detailUrl);
                const data = await res.json();

                // Extract Data
                const address = data.addresses?.business;
                const fullAddress = address ?
                    `${address.street1 || ''}, ${address.city || ''}, ${address.stateOrCountry || ''} ${address.zipCode || ''}`.trim() :
                    'Unknown';

                const ein = data.ein || null;
                const sic = data.sic || null;
                const industry = data.sicDescription || 'Unknown';
                const website = data.website || '';

                let domain = '';
                if (website) {
                    domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
                }

                const registryData = {
                    source: 'SEC_EDGAR',
                    vat_number: ein,
                    industry_code: sic,
                    industry_codes: [industry, sic].filter(Boolean),
                    registered_address: fullAddress,
                    tickers: data.tickers || [],
                    exchanges: data.exchanges || []
                };

                if (isNew) {
                    const insertPayload = {
                        legal_name: legalName,
                        org_number: targetOrgNumber,
                        country_code: 'US',
                        domain: domain || null,
                        website_status: domain ? 'active' : 'not_found',
                        registry_data: registryData,
                        discovery_source: 'sec_api',
                        created_at: new Date().toISOString()
                    };

                    const { error: insErr } = await supabase.from('businesses').insert(insertPayload);
                    if (insErr) console.error(`Failed to insert ${legalName}:`, insErr.message);
                    else {
                        console.log(`  ✅ Inserted ${legalName}`);
                        batchProcessed++;
                    }

                } else if (needsUpdate && existing) {
                    console.log(`  🛠️ Enriching ${legalName}...`);
                    const updatePayload = {
                        registry_data: { ...existing.registry_data, ...registryData },
                        domain: domain || undefined,
                        trust_score: 50
                    };

                    const { error: updErr } = await supabase
                        .from('businesses')
                        .update(updatePayload)
                        .eq('id', existing.id);

                    if (updErr) console.error(`Failed to update ${legalName}:`, updErr.message);
                    else {
                        batchProcessed++;
                    }
                }

            } catch (detailErr: any) {
                console.error(`  ❌ Failed to fetch details for ${cikPadded}:`, detailErr.message);
            }
        }

        console.log('✅ Cycle complete. All companies processed.');
        console.log('💤 Sleeping 1 hour before restart...');
        await delay(60 * 60 * 1000);
    }
}

run();
