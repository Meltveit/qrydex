
import * as cheerio from 'cheerio';

async function debugWiki(url: string) {
    console.log(`🌐 Fetching ${url}...`);
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('\n📊 Tables Found: ' + $('table').length);

    $('table').each((i, table) => {
        const headers = $(table).find('th').map((_i, el) => $(el).text().trim()).get().join(' | ');
        console.log(`Table ${i}: ${headers}`);
    });
}

debugWiki('https://en.wikipedia.org/wiki/FTSE_100_Index');
