
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Dynamic import to ensure env vars are loaded first
async function main() {
    try {
        const { batchScrapeBusinesses } = await import('@/lib/crawler/website-scraper');

        console.log('🚀 Starting Bot A: The Deep Scan Crawler...');

        // Run batch scrape (default limit 10, can be increased)
        // This will find businesses with domains but missing 'company_description'
        // and enrich them with Sitelinks, AI Summary, etc.
        await batchScrapeBusinesses(10);

        console.log('✅ Bot A batch complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Bot A failed:', error);
        process.exit(1);
    }
}

main();
