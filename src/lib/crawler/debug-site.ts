
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { URL } from 'url';

async function debugSite(url: string) {
    console.log(`\n🔍 Debugging connection to: ${url}`);

    // 1. DNS / HTTP Check
    try {
        console.log('Attempting Standard Access...');
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            console.log('⏰ Timeout hit (10s)!');
            controller.abort();
        }, 10000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'no,en-US;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        clearTimeout(timeout);
        console.log(`✅ Status: ${res.status} ${res.statusText}`);
        console.log(`   Content-Type: ${res.headers.get('content-type')}`);

        const html = await res.text();
        console.log(`   HTML Length: ${html.length} chars`);

    } catch (e: any) {
        console.log(`❌ Standard Access Failed: ${e.message}`);

        if (url.startsWith('https')) {
            console.log('\n🔄 Retrying with HTTP...');
            await debugSite(url.replace('https://', 'http://'));
        }
    }
}

const target = process.argv[2] || 'https://aivas.no';
debugSite(target);
