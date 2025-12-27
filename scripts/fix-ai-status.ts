
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixAiStatus() {
    console.log('🔍 Searching for businesses with "AI Analysis Unavailable"...');

    // Fetch all businesses with quality_analysis
    // Since JSONB filtering is tricky without exact keys, we'll fetch and filter in JS
    // This is fine for < 10k records.
    const { data, error } = await supabase
        .from('businesses')
        .select('id, quality_analysis')
        .not('quality_analysis', 'is', null);

    if (error) {
        console.error('Error fetching businesses:', error);
        return;
    }

    if (!data) {
        console.log('No businesses found.');
        return;
    }

    const toReset = data.filter(b => {
        const qa = b.quality_analysis as any;
        return qa?.redFlags?.includes('AI Analysis Unavailable') ||
            (qa?.red_flags && qa.red_flags.includes('AI Analysis Unavailable'));
    });

    console.log(`Found ${toReset.length} businesses with failed analysis.`);

    let count = 0;
    for (const b of toReset) {
        const { error: updateError } = await supabase
            .from('businesses')
            .update({ quality_analysis: null }) // Reset to NULL to trigger re-scrape
            .eq('id', b.id);

        if (updateError) {
            console.error(`Failed to reset business ${b.id}:`, updateError);
        } else {
            count++;
            if (count % 10 === 0) console.log(`Reset ${count}/${toReset.length}...`);
        }
    }

    console.log(`✅ Successfully reset ${count} businesses. They will be re-analyzed by the scraper.`);
}

fixAiStatus().catch(console.error);
