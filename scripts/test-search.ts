import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testSearch(query: string) {
    console.log(`🔍 Testing search for: "${query}"`);

    // Exact logic from route.ts
    const { data: businesses, error } = await supabase
        .from('businesses')
        .select('legal_name, org_number, logo_url')
        .or(`legal_name.ilike.%${query}%,org_number.ilike.%${query}%,company_description.ilike.%${query}%`)
        .limit(5);

    if (error) {
        console.error('❌ Error:', error);
    } else {
        console.log(`✅ Found ${businesses?.length || 0} results:`);
        businesses?.forEach(b => console.log(`   - ${b.legal_name} (${b.org_number})`));
    }
}

// Test with common terms
(async () => {
    await testSearch('Vi');
    await testSearch('As');
    await testSearch('123');
    await testSearch('Visma Software'); // Test with space
})();
