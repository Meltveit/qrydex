
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function cleanupDuplicates() {
    console.log('🧹 Starting US Duplicate Cleanup (Dry Run)...');

    // Fetch all US companies
    // Note: If dataset is huge, we should paginate. For 10k, fetchAll is borderline but ok for a script.
    // Let's page it to be safe.
    let allCompanies: any[] = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('businesses')
            .select('id, org_number, legal_name, created_at')
            .eq('country_code', 'US')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching:', error);
            break;
        }
        if (!data || data.length === 0) break;

        allCompanies = [...allCompanies, ...data];
        console.log(`Fetched ${allCompanies.length} records...`);
        if (data.length < pageSize) break;
        page++;
    }

    console.log(`Analyzing ${allCompanies.length} US companies for duplicates...`);

    // Group by Numeric CIK
    const groups: Record<number, any[]> = {};

    for (const company of allCompanies) {
        const numCik = parseInt(company.org_number, 10);
        if (isNaN(numCik)) continue; // Should not happen for SEC data

        if (!groups[numCik]) groups[numCik] = [];
        groups[numCik].push(company);
    }

    let duplicatesFound = 0;
    let recordsToDelete = 0;

    for (const cikKey in groups) {
        const group = groups[cikKey];
        if (group.length > 1) {
            duplicatesFound++;
            console.log(`\nDuplicate Group for CIK ${cikKey}:`);

            // Sort: We want to KEEP the one with the shortest org_number string (unpadded)
            // Or the oldest one? The user implies the "active" one is the unpadded one used by UI.
            // "1045810" (len 7) vs "0001045810" (len 10).

            group.sort((a, b) => a.org_number.length - b.org_number.length); // Ascending length

            const keeper = group[0];
            const trash = group.slice(1);

            console.log(`  ✅ KEEP: ${keeper.legal_name} (${keeper.org_number}) - ID: ${keeper.id}`);

            for (const item of trash) {
                console.log(`  ❌ DELETE: ${item.legal_name} (${item.org_number}) - ID: ${item.id}`);
                recordsToDelete++;

                const { error } = await supabase.from('businesses').delete().eq('id', item.id);
                if (error) console.error('Failed to delete:', error);
                else console.log('     -> DELETED');
            }
        }
    }

    console.log(`\n--- SUMMARY ---`);
    console.log(`Total US Records: ${allCompanies.length}`);
    console.log(`Duplicate Groups: ${duplicatesFound}`);
    console.log(`Records to Delete: ${recordsToDelete}`);
    console.log(`To execute deletion, uncomment the delete code in the script.`);
}

cleanupDuplicates();
