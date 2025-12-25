// Standalone test script with the NEW enhanced scraping logic
// Usage: node scripts/simple-test-scraper.js <url>

const https = require('https');
const http = require('http');

const url = process.argv[2] || 'https://www.dnb.no';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, {
            headers: { 'User-Agent': 'Qrydex B2B Indexer/1.0 (Bot for business verification)' }
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Follow redirect
                const nextUrl = new URL(res.headers.location, url).toString();
                console.log(`Following redirect to ${nextUrl}`);
                return fetchUrl(nextUrl).then(resolve).catch(reject);
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
    });
}

// --- Logic copied from website-scraper.ts ---

function extractDescription(html) {
    const metaDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    return metaDesc?.[1] || ogDesc?.[1];
}

function resolveUrl(relative, base) {
    try {
        return new URL(relative, base).toString();
    } catch {
        return relative;
    }
}

function extractLogo(html, baseUrl) {
    const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImage?.[1]) return resolveUrl(ogImage[1], baseUrl);

    const logoImg = html.match(/<img[^>]+src=["']([^"']+)["'][^>]+(class|id)=["'][^"']*(logo|brand|header-img)[^"']*["']/i);
    if (logoImg?.[1]) return resolveUrl(logoImg[1], baseUrl);

    // Favicon as fallback
    const favicon = html.match(/<link\s+rel=["'](?:shortcut )?icon["']\s+href=["']([^"']+)["']/i);
    if (favicon?.[1]) return resolveUrl(favicon[1], baseUrl);

    return undefined;
}

function extractSocialMedia(html) {
    const social = {};
    const extract = (platform) => {
        const regex = new RegExp(`href=["'](https?:\/\/(?:www\.)?${platform}\.com\/[^"']+)["']`, 'i');
        const match = html.match(regex);
        if (match) social[platform] = match[1];
    };
    extract('linkedin');
    extract('facebook');
    extract('instagram');
    extract('twitter');
    extract('youtube');
    return social;
}

// --- Main ---

(async () => {
    console.log(`🕷️ Testing enhanced extraction for: ${url}\n`);
    try {
        const html = await fetchUrl(url);

        console.log("--- Extraction Results ---");

        const description = extractDescription(html);
        console.log(`📝 Description: ${description ? description.substring(0, 100) + '...' : 'Not found'}`);

        const logo = extractLogo(html, url);
        console.log(`🖼️ Logo URL: ${logo || 'Not found'}`);

        const social = extractSocialMedia(html);
        console.log(`🔗 Social Media:`, social);

        console.log("\n--- Full Meta Description ---");
        console.log(description || "None");

        console.log("\n--- HTML Title ---");
        const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
        console.log(title ? title.trim() : "None");

    } catch (e) {
        console.error("Error:", e.message);
    }
})();
