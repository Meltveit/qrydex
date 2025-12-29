import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServerClient } from './src/lib/supabase';

async function checkTrustScores() {
    const supabase = createServerClient();

    console.log('🔍 Checking businesses with NEW trust score calculation...\n');

    // Get businesses scraped in last 10 minutes with trust_score_breakdown
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('businesses')
        .select('legal_name, trust_score, trust_score_breakdown, last_scraped_at, indexed_pages_count, company_description, logo_url')
        .gte('last_scraped_at', tenMinutesAgo)
        .not('trust_score_breakdown', 'is', null)
        .order('last_scraped_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('❌ No businesses scraped with new trust score in last 10 minutes');
        console.log('   (Need to wait for website-scraper to process new businesses)');
        return;
    }

    console.log(`✅ Found ${data.length} businesses with NEW trust score:\n`);

    for (const biz of data) {
        console.log(`📊 ${biz.legal_name}`);
        console.log(`   Trust Score: ${biz.trust_score}/100`);
        console.log(`   Last Scraped: ${new Date(biz.last_scraped_at).toLocaleTimeString()}`);
        console.log(`   Has Description: ${biz.company_description ? '✅' : '❌'}`);
        console.log(`   Has Logo: ${biz.logo_url ? '✅' : '❌'}`);
        console.log(`   Pages Indexed: ${biz.indexed_pages_count || 0}`);

        if (biz.trust_score_breakdown) {
            const breakdown = biz.trust_score_breakdown as Record<string, number>;
            console.log(`   Breakdown:`);
            Object.entries(breakdown).forEach(([key, value]) => {
                console.log(`     - ${key}: ${value} points`);
            });
        }
        console.log('');
    }
}

checkTrustScores().catch(console.error);
