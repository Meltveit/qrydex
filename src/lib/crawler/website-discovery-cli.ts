/**
 * Website Discovery Bot - CLI
 * Automatically finds missing websites for businesses in the database
 */

import { createServerClient } from '../supabase';
import { discoverWebsite } from './website-discovery';

// CLI execution - RUNS CONTINUOUSLY
if (require.main === module) {
    console.log('🌐 Website Discovery Bot - CONTINUOUS MODE');
    console.log('   Continuously discovering business websites');
    console.log('   Press Ctrl+C to stop\n');

    let cycleCount = 0;

    async function runContinuously() {
        const supabase = createServerClient();

        // eslint-disable-next-line no-constant-condition
        while (true) {
            cycleCount++;
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔄 CYCLE ${cycleCount} - ${new Date().toLocaleString()}`);
            console.log(`${'='.repeat(60)}\n`);

            try {
                // 1. Get businesses without domains and NOT marked as discovering/not_found
                // We fetch a slightly larger batch and try to lock them one by one or in bulk
                const { data: candidates, count } = await supabase
                    .from('businesses')
                    .select('id, legal_name, org_number, country_code', { count: 'exact' })
                    .is('domain', null)
                    .neq('website_status', 'not_found')
                    .neq('website_status', 'discovering') // SKIP locked items
                    .order('created_at', { ascending: false })
                    .limit(20); // Smaller batch to reduce race condition window

                if (!candidates || candidates.length === 0) {
                    console.log('✅ queue empty or all locked! Waiting...');
                } else {
                    console.log(`Found ~${count} pending. Locking batch of ${candidates.length}...`);

                    // 2. LOCK items (optimistic locking)
                    // We only process those we successfully updated to 'discovering'
                    const lockedBusinesses: typeof candidates = [];

                    for (const candidate of candidates) {
                        const { error } = await supabase
                            .from('businesses')
                            .update({ website_status: 'discovering' })
                            .eq('id', candidate.id)
                            // Safety check: ensure it wasn't snatched by another bot ms ago
                            .is('domain', null)
                            .neq('website_status', 'discovering');

                        if (!error) {
                            lockedBusinesses.push(candidate);
                        }
                    }

                    console.log(`🔐 Successfully locked ${lockedBusinesses.length} items for this bot.`);

                    // 3. Process LOCKED items
                    for (const business of lockedBusinesses) {
                        try {
                            console.log(`🔍 Processing: ${business.legal_name}`);
                            await discoverWebsite(business.id);
                            // Cleanup is handled inside discoverWebsite (it sets domain or not_found)
                            // If discoverWebsite FAILS exception, we should probably reset status or let it hang for manual fix?
                            // Currently discoverWebsite handles errors internally mostly.

                            // Minimal cooldown
                            await new Promise(resolve => setTimeout(resolve, 500));
                        } catch (error: any) {
                            console.error(`  ❌ Critical Error processing ${business.legal_name}:`, error.message);
                            // Unlock if crashed
                            await supabase.from('businesses').update({ website_status: null }).eq('id', business.id);
                        }
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
