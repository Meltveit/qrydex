// Test script for enhanced data extraction
// Usage: node scripts/test-enhanced-scraper.js <url>
require('dotenv').config({ path: '.env.local' });
const { scrapeWebsite } = require('../src/lib/crawler/website-scraper');

// Mock fetch for Node environment if needed, but Next.js usually polyfills it.
// If running raw node script, we might need a fetch polyfill or just rely on Node 18+ native fetch.

async function testScraper() {
    const url = process.argv[2] || 'https://www.dnb.no'; // Default to DNB as they have rich metadata
    console.log(`🧪 Testing enhanced scraper targeting: ${url}\n`);

    try {
        // Find the scraper file and import it - but wait, the file is TS. 
        // We can't run TS directly with node easily without ts-node.
        // Instead of running the TS file directly, let's create a JS version of this test 
        // that duplicates the logic or uses a build step. 

        // Simpler approach: I will rely on my manual verification of the code logic 
        // and run a live test by calling the actual function if I can compile it.

        // BETTER: Create a temporary test file in the project that routes to an API endpoint 
        // or just use ts-node if available.

        console.log("To fully test this, we should run the crawler in the dev environment.");
        console.log("Alternatively, I can try to extract the logic to a standalone JS file for testing.");

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Since we updated a TS file in src/lib, we can't run it directly with `node`.
// I will create a `scripts/test-scraper-standalone.js` that mimics the logic for quick verification without compilation.
