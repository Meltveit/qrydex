/**
 * Website Discovery Bot - CLI
 * Automatically finds missing websites for businesses in the database
 */

import { createServerClient } from '../supabase';
import { discoverWebsite } from './website-discovery';

// CLI execution - RUNS CONTINUOUSLY
// CLI execution - RUNS CONTINUOUSLY
if (require.main === module) {
    const args = process.argv.slice(2);
    const WORKER_ID = args[0] ? parseInt(args[0]) : 0;
    const TOTAL_WORKERS = args[1] ? parseInt(args[1]) : 1;

    console.log(`🌐 Website Discovery Bot - Worker ${WORKER_ID + 1}/${TOTAL_WORKERS}`);
    console.log('   Continuously discovering business websites');
    console.log('   Press Ctrl+C to stop\n');

    let cycleCount = 0;

    async function runContinuously() {
        const supabase = createServerClient();

        // eslint-disable-next-line no-constant-condition
        while (true) {
            cycleCount++;
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔄 CYCLE ${cycleCount} - ${new Date().toLocaleTimeString()} [Worker ${WORKER_ID + 1}]`);
            console.log(`${'='.repeat(60)}\n`);

            try {
                // 1. Fetch available candidates
                // 1. Fetch available candidates (Priority: NULL > Oldest 'not_found')
                // We use 'or' to get both, and order by 'updated_at' ASC (Oldest checked first)
                const { data: candidates, count } = await supabase
                    .from('businesses')
                    .select('id, legal_name, org_number, country_code', { count: 'exact' })
                    .is('domain', null)
                    .or('website_status.is.null,website_status.eq.not_found')
                    .order('updated_at', { ascending: true }) // Process oldest last-touched first (Rotation)
                    .limit(100);

                if (!candidates || candidates.length === 0) {
                    console.log('✅ Global Queue completely empty! Sleeping 60s...');
                    await new Promise(resolve => setTimeout(resolve, 60 * 1000));
                    continue;
                }

                // 2. Filter for THIS worker (Deterministic Sharding)
                const myCandidates = candidates.filter(b => {
                    const hash = parseInt(b.id.replace(/-/g, '').substring(0, 8), 16);
                    return (hash % TOTAL_WORKERS) === WORKER_ID;
                }).slice(0, 10); // Process 10 at a time

                if (myCandidates.length === 0) {
                    console.log('✅ No tasks for this worker in current batch.');
                    await new Promise(resolve => setTimeout(resolve, 5 * 1000));
                    continue;
                }

                console.log(`🎯 Found ${myCandidates.length} tasks for Worker ${WORKER_ID + 1}`);

                // 3. Process items
                for (const business of myCandidates) {
                    try {
                        console.log(`🔍 Disovering: ${business.legal_name}`);
                        await discoverWebsite(business.id);
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (error: any) {
                        console.error(`  ❌ Error: ${error.message}`);
                    }
                }

                console.log('\n⏱️  Sleeping 5 seconds before next cycle...');
                await new Promise(resolve => setTimeout(resolve, 5 * 1000));

            } catch (err: any) {
                console.error('❌ Error in cycle:', err.message);
                console.log('   Retrying in 5 minutes...');
                await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
            }
        }
    }

    runContinuously().catch((err) => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
}
