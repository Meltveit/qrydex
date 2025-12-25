import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    try {
        // Dynamic import inside async function
        const { crawlAllNewsSources } = await import('../src/lib/crawler/news-crawler');
        await crawlAllNewsSources();
    } catch (error) {
        console.error('Fatal error in news crawler script:', error);
        process.exit(1);
    }
}

main();
