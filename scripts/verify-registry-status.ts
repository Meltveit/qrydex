
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { verifyBusiness } from '../src/lib/registry-apis/index'; // Import the unified verifier

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runVerificationJob(limit = 10) {
    console.log(`🛡️ Bot C (The Guardian) starting verification run...`);

    // Fetch businesses that haven't been verified in 7 days or are pending
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Select candidates
    const { data: candidates, error } = await supabase
        .from('businesses')
        .select('*')
        .or(`last_verified_at.is.null,last_verified_at.lt.${sevenDaysAgo}`)
        .order('last_verified_at', { ascending: true, nullsFirst: true })
        .limit(limit);

    if (error) {
        console.error('Failed to fetch candidates:', error);
        return;
    }

    console.log(`Found ${candidates.length} businesses to verify.`);

    let verifiedCount = 0;
    let failedCount = 0;

    for (const business of candidates) {
        console.log(`Checking ${business.legal_name} (${business.country_code}: ${business.org_number})...`);

        try {
            // Call the unified registry verifier (supports NO, DK, FI, SE)
            const result = await verifyBusiness(business.country_code, business.org_number);

            if (result.success && result.data) {
                const data = result.data;
                // Update business with fresh data
                const status = data.company_status === 'Active' ? 'verified' : 'failed';

                // Merge registry data cautiously
                const updatedRegistryData = {
                    ...business.registry_data,
                    company_status: data.company_status,
                    vat_status: data.vat_status,
                    last_verified_registry: new Date().toISOString()
                };

                const { error: updateError } = await supabase
                    .from('businesses')
                    .update({
                        verification_status: status,
                        last_verified_at: new Date().toISOString(),
                        registry_data: updatedRegistryData,
                        // Update address if provided better one? Maybe. kept simple for now.
                    })
                    .eq('id', business.id);

                if (updateError) {
                    console.error(`Error updating business ${business.org_number}:`, updateError);
                    failedCount++;
                } else {
                    verifiedCount++;
                    console.log(`✅ Verified: ${business.legal_name} -> ${status}`);

                    // Log verification event
                    await supabase.from('verification_logs').insert({
                        business_id: business.id,
                        verification_type: 'registry_check',
                        status: status,
                        details: {
                            registries: ['Brreg/CVR/YTJ'],
                            automated: true,
                            result: result
                        }
                    });
                }
            } else {
                console.warn(`⚠️ Registry lookup failed/not found for ${business.org_number}`);
                failedCount++;
            }
        } catch (e) {
            console.error(`❌ Exception verification for ${business.org_number}:`, e);
            failedCount++;
        }
    }

    console.log(`🛡️ Verification Run Complete. Verified: ${verifiedCount}, Failed: ${failedCount}`);
}

runVerificationJob(20);
