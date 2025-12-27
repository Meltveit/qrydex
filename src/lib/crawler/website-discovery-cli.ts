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
                // Get businesses without domains
                const { data: businesses, count } = await supabase
                    .from('businesses')
                    .select('id, legal_name, org_number, country_code', { count: 'exact' })
                    .is('domain', null)
                    .limit(20); // Process 20 per cycle

                if (!businesses || businesses.length === 0) {
                    console.log('✅ All businesses have websites! Waiting for new businesses...');
                } else {
                    console.log(`Found ${count} businesses without websites`);
                    console.log(`Processing ${businesses.length} in this cycle...\n`);

                    for (const business of businesses) {
                        try {
                            await discoverWebsite(business.id);

                            // Rate limiting
                            console.log('  ⏳ Cooling down (60s)...');
                            await new Promise(resolve => setTimeout(resolve, 60000));

                        } catch (error: any) {
                            console.error(`  ❌ Error processing ${business.legal_name}:`, error.message);
                        }
                    }
                }

                console.log('\n⏱️  Sleeping 10 minutes before next cycle...');
                await new Promise(resolve => setTimeout(resolve, 10 * 60 * 1000)); // 10 min

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
