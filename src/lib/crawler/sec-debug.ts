
import fs from 'fs';
import path from 'path';

async function fetchSecData() {
    const cik = '0000320193'; // Apple
    const url = `https://data.sec.gov/submissions/CIK${cik}.json`;

    console.log(`Fetching ${url}...`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Qrydex Research (contact@qrydex.com)',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Success! Writing to apple_sec.json');

        fs.writeFileSync('apple_sec.json', JSON.stringify(data, null, 2));

        // Log key fields
        console.log('--- EXTRACTED FIELDS ---');
        console.log('Name:', data.name);
        console.log('CIK:', data.cik);
        console.log('EIN:', data.ein);
        console.log('SIC:', data.sic, data.sicDescription);
        console.log('Tickers:', data.tickers);
        console.log('Address:', JSON.stringify(data.addresses?.business));
        console.log('Employees:', 'Not in submissions?');

    } catch (error) {
        console.error('Fetch failed:', error);
    }
}

fetchSecData();
