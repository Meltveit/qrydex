
import { crawlAllNewsSources } from '../src/lib/crawler/news-crawler';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function runNewsBot() {
    console.log('📰 Starting Global News Bot...');
    console.log('Sources: US (Reuters, Bloomberg, TechCrunch), EU (FT, Politico), Nordics (E24, DI,...)');

    await crawlAllNewsSources();

    console.log('✅ News Bot cycle complete.');
}

runNewsBot();
