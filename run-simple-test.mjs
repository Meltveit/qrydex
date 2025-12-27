/**
 * Simple Runner for Nordic Registry Populator
 * Run with: node --loader tsx/esm run-nordic.mjs
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n🚀 Nordic & EU Registry Populator\n');
console.log('Environment check:');
console.log(`  Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}`);
console.log(`  Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌'}\n`);

// Sample companies for Sweden
const swedenCompanies = [
    'Volvo AB', 'Ericsson AB', 'IKEA AB', 'H&M AB', 'Spotify AB'
];

async function runSimplePopulator() {
    let added = 0;

    console.log('📋 Starting with 5 sample Swedish companies...\n');

    for (const company of swedenCompanies) {
        console.log(`  🔍 Searching for: ${company}`);

        // Simulate registry lookup (in real version, would call OpenCorporates)
        const mockData = {
            org_number: `SE${Math.floor(Math.random() * 1000000)}`,
            legal_name: company,
            country_code: 'SE'
        };

        const { error } = await supabase
            .from('businesses')
            .insert(mockData);

        if (error) {
            console.log(`    ❌ Error: ${error.message}`);
        } else {
            console.log(`    ✅ Added: ${company}`);
            added++;
        }
    }

    console.log(`\n✨ Complete! Added ${added} businesses`);
}

runSimplePopulator().catch(console.error);
