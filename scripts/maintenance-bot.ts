
import { createServerClient } from '@/lib/supabase';
import { verifyBusiness } from '@/lib/registry-apis';
import { calculateTrustScore } from '@/lib/trust-engine';

async function runMaintenanceJob() {
    console.log('🧹 Starting Maintenance Bot (Vaktmester)...');

    const supabase = createServerClient();

    // 1. Find businesses checked > 30 days ago OR never checked
    // Postgres interval syntax: '30 days'
    const { data: staleBusinesses, error } = await supabase
        .from('businesses')
        .select('*')
        .or('last_verified_at.lt.Now() - interval \'30 days\',last_verified_at.is.null')
        .limit(50); // Process in batches

    if (error) {
        console.error('Error fetching stale businesses:', error);
        return;
    }

    if (!staleBusinesses || staleBusinesses.length === 0) {
        console.log('✨ No businesses need maintenance right now.');
        return;
    }

    console.log(`Found ${staleBusinesses.length} businesses to re-verify.`);

    let updated = 0;

    for (const business of staleBusinesses) {
        try {
            console.log(`Checking: ${business.legal_name}...`);

            // Re-run registry verification
            const verifyResult = await verifyBusiness(business.country_code, business.org_number);

            if (verifyResult.success && verifyResult.data) {
                const data = verifyResult.data;
                const status = data.company_status === 'Active' ? 'verified' : 'failed';

                // Recalculate trust score with fresh data
                // (We would ideally re-fetch news/website data here too, but let's start with registry)
                const newTrustScore = await calculateTrustScore(
                    data,
                    business.quality_analysis,
                    business.news_signals as any || []
                );

                await supabase
                    .from('businesses')
                    .update({
                        verification_status: status,
                        last_verified_at: new Date().toISOString(),
                        registry_data: data,
                        trust_score: newTrustScore.score,
                        trust_score_breakdown: newTrustScore.breakdown
                    })
                    .eq('id', business.id);

                updated++;
                console.log(`✅ Updated: ${business.legal_name}`);
            } else {
                console.warn(`⚠️ Could not verify ${business.legal_name} in registry.`);
            }

            // Nice delay
            await new Promise(r => setTimeout(r, 1000));

        } catch (e) {
            console.error(`Error processing ${business.legal_name}:`, e);
        }
    }

    console.log(`\n🧹 Maintenance complete. Updated ${updated} businesses.`);
}

runMaintenanceJob();
