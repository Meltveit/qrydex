/**
 * Parallel Website Scraper
 * Scrapes multiple business websites concurrently
 */

import pLimit from 'p-limit';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ScrapeTarget {
    url: string;
    businessId: string;
}

interface ScrapeResult {
    businessId: string;
    success: boolean;
    data?: any;
    error?: string;
}

/**
 * Scrape a single website and update database
 */
async function scrapeSingleWebsite(target: ScrapeTarget): Promise<ScrapeResult> {
    console.log(`  🌐 Scraping: ${target.url}`);

    try {
        // Import scraper dynamically
        const { scrapeWebsite } = await import('../src/lib/crawler/website-scraper.js');

        const data = await scrapeWebsite(target.url);

        if (!data) {
            return {
                businessId: target.businessId,
                success: false,
                error: 'No data returned'
            };
        }

        // Update database
        const updateData: any = {
            last_scraped_at: new Date().toISOString(),
            scrape_count: 1 // Should increment, but simplified for now
        };

        if (data.description) {
            updateData.company_description = data.description;
        }

        if ((data as any).logo) {
            updateData.logo_url = (data as any).logo;
        }

        if (data.products && data.products.length > 0) {
            updateData.products = data.products;
        }

        if (data.services && data.services.length > 0) {
            updateData.services = data.services;
        }

        if ((data as any).contact) {
            updateData.contact_info = (data as any).contact;
        }

        if ((data as any).socialMedia) {
            updateData.social_media = (data as any).socialMedia;
        }

        await supabase
            .from('businesses')
            .update(updateData)
            .eq('id', target.businessId);

        console.log(`  ✅ Success: ${target.url}`);

        return {
            businessId: target.businessId,
            success: true,
            data
        };
    } catch (error: any) {
        console.error(`  ❌ Error scraping ${target.url}:`, error.message);

        return {
            businessId: target.businessId,
            success: false,
            error: error.message
        };
    }
}

/**
 * Scrape multiple websites in parallel
 */
export async function scrapeMultipleBusinesses(
    targets: ScrapeTarget[],
    concurrency = 5
): Promise<ScrapeResult[]> {
    console.log(`\n🚀 Starting parallel scraper...`);
    console.log(`   Targets: ${targets.length}`);
    console.log(`   Concurrency: ${concurrency}\n`);

    const limit = pLimit(concurrency);
    const results: ScrapeResult[] = [];

    const promises = targets.map(target =>
        limit(async () => {
            const result = await scrapeSingleWebsite(target);
            results.push(result);
            return result;
        })
    );

    await Promise.all(promises);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`\n📊 Scraping Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📈 Success rate: ${((successCount / targets.length) * 100).toFixed(1)}%`);

    return results;
}

/**
 * Scrape businesses that need updating
 */
export async function scrapeBusinessesNeedingUpdate(limit = 100) {
    console.log('🔍 Finding businesses needing scraping...\n');

    const { data: businesses } = await supabase
        .from('businesses')
        .select('id, domain, legal_name')
        .not('domain', 'is', null)
        .or('last_scraped_at.is.null,company_description.is.null')
        .limit(limit);

    if (!businesses || businesses.length === 0) {
        console.log('✅ All businesses are up to date!');
        return [];
    }

    console.log(`Found ${businesses.length} businesses needing scraping\n`);

    const targets: ScrapeTarget[] = businesses.map(b => ({
        url: `https://${b.domain}`,
        businessId: b.id
    }));

    return await scrapeMultipleBusinesses(targets, 5);
}
