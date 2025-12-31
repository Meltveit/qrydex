
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Maintenance Worker
 * Runs periodic cleanup tasks to ensure data hygiene.
 * 1. Deduplication (Same Domain + Similar Name)
 * 2. Dead Link Cleanup (Future)
 * 3. Stats Aggregation (Future)
 */

async function runDeduplication() {
    console.log('🧹 [Maintenance] Start: Deduplication Scan...');

    // Fetch businesses with potential for overlap (limit widely to catch recent imports)
    // In production, might want a specialized SQL function, but this works for <50k rows
    const { data: businesses, error } = await supabase
        .from('businesses')
        .select('id, legal_name, domain, country_code, registry_data, trust_score, created_at')
        .order('created_at', { ascending: false })
        .limit(5000);

    if (error) {
        console.error('❌ Error fetching for dedupe:', error);
        return;
    }

    const normalizeDomain = (d: string | null) => {
        if (!d) return null;
        return d.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    };

    const normalizeName = (n: string) => {
        return n.toLowerCase()
            .replace(/\s+(asa|as|ab|ag|inc|ltd|gmbh|plc|corp|group)\.?$/g, '')
            .replace(/[^a-z0-9]/g, '');
    };

    // Helper: Jaccard Similarity for token overlap
    const getSimilarity = (str1: string, str2: string) => {
        const tokens1 = new Set(str1.split(/\s+/));
        const tokens2 = new Set(str2.split(/\s+/));
        const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
        const union = new Set([...tokens1, ...tokens2]);
        return intersection.size / union.size;
    };

    const duplicates = new Map<string, any[]>();
    const processed = new Set<string>();

    for (const biz of businesses) {
        if (processed.has(biz.id)) continue;

        const normName = normalizeName(biz.legal_name);
        const normDomain = normalizeDomain(biz.domain);

        const matches = businesses.filter(b => {
            if (b.id === biz.id) return false;

            const bNormName = normalizeName(b.legal_name);
            const bNormDomain = normalizeDomain(b.domain);

            // 1. Strict Domain Match
            const sameDomain = normDomain && bNormDomain && normDomain === bNormDomain;

            if (sameDomain) {
                // Case A: Name is identical (after normalization) -> DUPLICATE
                if (normName === bNormName) return true;

                // Case B: One contains the other completely -> "Equinor" vs "Equinor ASA" -> DUPLICATE
                // BUT: Watch out for "BlackRock Fund" vs "BlackRock" (Fund should be kept?)
                // Actually, usually the "Short" name is the parent, and "Long" are children.
                // We only want to merge if they are truly the same entity.

                // Check Similarity Score
                // "Equinor" (1 token) vs "Equinor Refining Norway" (3 tokens) -> 1/3 = 0.33 -> KEEP BOTH
                // "BMW" vs "BMW DE" -> 1/2 = 0.5 (with stop words rm) -> Borderline.

                // Better Heuristic:
                // If one contains the other AND the extra words are weak suffixes (ASA, Inc, Ltd, AG) - already removed by normalizeName

                const similarity = getSimilarity(normName, bNormName);

                // High similarity requirement for same-domain merge
                if (similarity > 0.66) return true;

                // Special Case: "BMW.DE" vs "BMW"
                // If one name includes a TLD pattern, it's likely a bad scrape
                if (biz.legal_name.includes('.') || b.legal_name.includes('.')) {
                    // Check if removing the dot-part makes them identical
                    const cleanA = biz.legal_name.split('.')[0].toLowerCase();
                    const cleanB = b.legal_name.split('.')[0].toLowerCase();
                    if (cleanA === cleanB) return true;
                }
            }

            return false;
        });

        if (matches.length > 0) {
            const group = [biz, ...matches];
            group.sort((a, b) => a.id.localeCompare(b.id));
            const groupId = group[0].id;

            if (!duplicates.has(groupId)) {
                duplicates.set(groupId, group);
                group.forEach(m => processed.add(m.id));
            }
        }
    }

    if (duplicates.size === 0) {
        console.log('✅ No duplicates found.');
        return;
    }

    console.log(`🔎 Found ${duplicates.size} duplicate groups. Resolving...`);

    let deletedCount = 0;
    for (const [groupId, group] of duplicates) {
        // Scoring Strategy
        const sorted = group.sort((a, b) => {
            // 1. Prefer Nordic/German (Target Markets)
            const markets = ['NO', 'DE', 'US', 'GB'];
            const aMkt = markets.indexOf(a.country_code);
            const bMkt = markets.indexOf(b.country_code);

            // Prefer existing prioritized markets
            if (aMkt !== -1 && bMkt === -1) return -1;
            if (bMkt !== -1 && aMkt === -1) return 1;

            // 2. Prefer Higher Trust Score / More Data
            const aScore = a.trust_score || 0;
            const bScore = b.trust_score || 0;
            if (aScore !== bScore) return bScore - aScore;

            // 3. Keep older record (Stability)
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        const winner = sorted[0];
        const losers = sorted.slice(1);

        console.log(`   👑 Keeping: ${winner.legal_name} (${winner.country_code})`);

        for (const loser of losers) {
            console.log(`      ❌ Removing Duplicate: ${loser.legal_name} (${loser.country_code})`);
            await supabase.from('businesses').delete().eq('id', loser.id);
            deletedCount++;
        }
    }
    console.log(`✅ Cleaned up ${deletedCount} duplicate records.`);
}

// Loop
async function startMaintenanceLoop() {
    console.log('🔧 Maintenance Bot Started (Cycle: 1h)');

    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            await runDeduplication();
        } catch (e: any) {
            console.error('Maintenance Error:', e.message);
        }

        // Wait 1 hour
        await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000));
    }
}

if (require.main === module) {
    startMaintenanceLoop();
}
