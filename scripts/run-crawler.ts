/**
 * Crawler Runner Script
 * Run this to populate the database with B2B businesses
 * 
 * Usage:
 *   npm run crawler:registry   - Fetch from registries
 *   npm run crawler:websites   - Scrape existing businesses
 *   npm run crawler:full       - Do both
 */

import { runFullCrawl } from './src/lib/crawler/registry-crawler.js';
import { batchScrapeBusinesses } from './src/lib/crawler/website-scraper.js';

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'full';

    console.log('🤖 Qrydex Crawler Bot Starting...\n');

    try {
        if (command === 'registry' || command === 'full') {
            console.log('📋 Phase 1: Fetching from registries...\n');
            const results = await runFullCrawl(100); // 100 businesses per country

            console.log('\n📊 Registry Results:');
            console.log(JSON.stringify(results, null, 2));
        }

        if (command === 'websites' || command === 'full') {
            console.log('\n🕷️ Phase 2: Scraping websites...\n');
            await batchScrapeBusinesses(50); // 50 websites
        }

        console.log('\n✅ Crawler completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Crawler error:', error);
        process.exit(1);
    }
}

main();
