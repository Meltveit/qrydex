/**
 * Coordinated Bot Scheduler
 * Runs bots in 10-min cycles with 1-min pauses
 * Uses crawl_queue for work distribution
 */

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

// Bot configurations
const BOTS = [
    {
        name: 'web-discovery',
        script: 'scripts/bots/web-discovery.js',
        args: ['5'], // 5 iterations = ~10 min
        cycleDuration: 10 * 60 * 1000, // 10 minutes
    },
    {
        name: 'registry-crawler',
        script: 'scripts/simple-crawler.js',
        args: [],
        cycleDuration: 10 * 60 * 1000,
    },
    {
        name: 'website-indexer',
        script: 'scripts/index-websites.js',
        args: [],
        cycleDuration: 10 * 60 * 1000,
    },
];

const PAUSE_DURATION = 60 * 1000; // 1 minute pause

/**
 * Run a single bot
 */
function runBot(bot) {
    return new Promise((resolve) => {
        console.log(`\n🤖 Starting ${bot.name}...`);

        const child = spawn('node', [bot.script, ...bot.args], {
            cwd: process.cwd(),
            stdio: 'inherit',
        });

        // Timeout after cycle duration
        const timeout = setTimeout(() => {
            child.kill('SIGTERM');
            console.log(`⏱️  ${bot.name} timed out after ${bot.cycleDuration / 1000}s`);
            resolve();
        }, bot.cycleDuration);

        child.on('close', (code) => {
            clearTimeout(timeout);
            console.log(`✅ ${bot.name} completed (exit code: ${code})`);
            resolve();
        });

        child.on('error', (err) => {
            clearTimeout(timeout);
            console.error(`❌ ${bot.name} error:`, err.message);
            resolve();
        });
    });
}

/**
 * Queue jobs for indexer bot
 */
async function queueIndexingJobs() {
    console.log('\n📋 Queueing indexing jobs for businesses without indexed pages...');

    const { data: businesses } = await supabase
        .from('businesses')
        .select('id, domain')
        .not('domain', 'is', null)
        .is('quality_analysis->indexed_pages', null)
        .limit(50);

    if (!businesses || businesses.length === 0) {
        console.log('  No businesses to queue');
        return;
    }

    const jobs = businesses.map(b => ({
        job_type: 'index',
        url: b.domain.startsWith('http') ? b.domain : `https://${b.domain}`,
        business_id: b.id,
        priority: 50,
        status: 'pending',
    }));

    const { error } = await supabase.from('crawl_queue').insert(jobs);

    if (!error) {
        console.log(`  ✅ Queued ${jobs.length} indexing jobs`);
    }
}

/**
 * Main scheduler loop
 */
async function runScheduler() {
    console.log('🚀 Coordinated Bot Scheduler Starting...\n');
    console.log('Schedule: 10 min work → 1 min pause → repeat\n');

    let cycle = 1;

    while (true) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`CYCLE ${cycle} - ${new Date().toLocaleTimeString()}`);
        console.log('='.repeat(60));

        // Queue jobs for next cycle
        await queueIndexingJobs();

        // Run all bots in parallel
        await Promise.all(BOTS.map(bot => runBot(bot)));

        console.log(`\n⏸️  Pausing for ${PAUSE_DURATION / 1000} seconds...\n`);
        await new Promise(resolve => setTimeout(resolve, PAUSE_DURATION));

        cycle++;
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Scheduler stopped by user');
    process.exit(0);
});

// Start scheduler
runScheduler().catch(console.error);
