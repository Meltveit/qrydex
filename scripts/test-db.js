/**
 * Debug crawler - check what's failing
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Has service key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Has anon key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
);

async function testInsert() {
    console.log('\nTesting insert...');

    const testData = {
        org_number: 'TEST123456',
        legal_name: 'Test Company AS',
        country_code: 'NO',
        registry_data: { test: true },
        trust_score: 50,
        verification_status: 'verified',
        last_verified_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('businesses')
        .insert(testData)
        .select();

    if (error) {
        console.error('❌ Insert error:', error);
    } else {
        console.log('✅ Success! Inserted:', data);

        // Clean up
        await supabase.from('businesses').delete().eq('org_number', 'TEST123456');
    }
}

testInsert().catch(console.error);
