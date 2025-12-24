/**
 * Registry Crawler - Queue Consumer Version
 * Fetches registry data for jobs from crawl_queue
 */

require('dotenv').config({ path: '.env.local' });
const { consumeQueue } = require('../lib/queue-consumer');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

async function crawlRegistryProcessor(job) {
    // job.details usually contains { country, query/filter }
    // or job can be empty 'registry' job that triggers a batch fetch

    // For now, let's keep it simple: generic 'registry' job triggers a batch fetch
    // In future, jobs will be specific: "Fetch NACE 62"

    console.log('Running registry batch crawl...');

    // Reuse existing logic from multi-region-registry.js implicitly here
    // or calling it. For true queue conformance, we should move the logic here.

    // Let's implement a single unit of work: Crawl one NACE code for specific country
    const { country = 'NO', naceCode = '62' } = job.details || {};

    if (country === 'NO') {
        const added = await crawlNorwayNace(naceCode);
        return { added, country, naceCode };
    }

    return { status: 'skipped', reason: 'Unsupported country in job' };
}

async function crawlNorwayNace(nace, limit = 20) {
    const url = `https://data.brreg.no/enhetsregisteret/api/enheter?naeringskode=${nace}&size=${limit}`;
    const response = await fetch(url);
    const data = await response.json();
    const businesses = data._embedded?.enheter || [];

    let added = 0;
    for (const biz of businesses) {
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

            if (!error) added++;
            await new Promise(r => setTimeout(r, 100));
        } catch (err) { }
    }
    return added;
}

// Start consumer
consumeQueue('registry', crawlRegistryProcessor, { batchSize: 1, pollInterval: 10000 });
