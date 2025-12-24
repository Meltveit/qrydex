/**
 * Seed Queue Script
 * Populates crawl_queue with initial jobs to kickstart the system
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

async function seedQueue() {
    console.log('🌱 Seeding crawl queue...');

    const jobs = [];

    // 1. Discovery Jobs (Seed URLs)
    const seedUrls = [
        'https://www.finansavisen.no/boers-og-marked',
        'https://e24.no/naeringsliv',
        'https://www.dn.no/teknologi',
        'https://www.lastmile.no/',
        'https://shifter.no/',
        'https://www.proff.no/bransjer'
    ];

    for (const url of seedUrls) {
        jobs.push({
            job_type: 'discover',
            url: url,
            priority: 80,
            status: 'pending'
        });
    }

    // 2. Registry Jobs (NACE Codes)
    const naceCodes = ['62', '26', '71', '73', '46'];
    for (const nace of naceCodes) {
        jobs.push({
            job_type: 'registry',
            url: `nace-${nace}`,
            details: { country: 'NO', naceCode: nace },
            priority: 60,
            status: 'pending'
        });
    }

    // Insert jobs
    const { error } = await supabase.from('crawl_queue').insert(jobs);

    if (error) {
        console.error('❌ Error seeding queue:', error.message);
    } else {
        console.log(`✅ Added ${jobs.length} jobs to queue`);
    }
}

seedQueue();
