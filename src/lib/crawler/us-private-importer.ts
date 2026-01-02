
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServerClient } from '../supabase';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

// CONFIG
const JURISDICTIONS = ['us_de', 'us_ca', 'us_ny', 'us_tx'];
const KEYWORDS = [
    'Technology', 'Software', 'AI', 'Consulting',
    'Solutions', 'Ventures', 'Data', 'Cloud'
];
const MAX_PAGES = 3;

async function runUSPrivateImport() {
    console.log('🕵️ US PRIVATE BOT (Puppeteer Edition) - Starting...');
    const supabase = createServerClient();

    // Launch Browser
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    try {
        for (const jurisdiction of JURISDICTIONS) {
            console.log(`\n📍 Entering Jurisdiction: ${jurisdiction.toUpperCase()}`);

            for (const keyword of KEYWORDS) {
                console.log(`  🔑 Searching for: "${keyword}"`);

                for (let p = 1; p <= MAX_PAGES; p++) {
                    // Navigate to Search Page
                    const searchUrl = `https://opencorporates.com/companies/${jurisdiction}?q=${encodeURIComponent(keyword)}&page=${p}`;

                    try {
                        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

                        // Check if blocked
                        const title = await page.title();
                        if (title.includes('Just a moment') || title.includes('Cloudflare')) {
                            console.log('     ⚠️ Blocked by Cloudflare. Waiting 10s...');
                            await new Promise(r => setTimeout(r, 10000));
                            continue;
                        }

                        // Parse HTML
                        const content = await page.content();
                        const $ = cheerio.load(content);
                        const listItems = $('#companies_list li.company');

                        if (listItems.length === 0) {
                            console.log('     No more results.');
                            break;
                        }

                        let newCount = 0;

                        for (const el of listItems) {
                            const nameLink = $(el).find('a.company_search_name');
                            const name = nameLink.text().trim();
                            const url = 'https://opencorporates.com' + nameLink.attr('href');

                            // Extract Status & Date from text nodes or badges
                            const status = $(el).find('.status').text().trim().toLowerCase();
                            if (status && !['active', 'exist', 'good standing'].some(s => status.includes(s))) {
                                continue; // Skip inactive
                            }

                            const detailsText = $(el).text();
                            // Try to extract ID (usually not plainly visible in list, but in URL)
                            // URL format: /companies/us_de/1234567
                            const urlParts = nameLink.attr('href')?.split('/');
                            const companyNumber = urlParts ? urlParts[urlParts.length - 1] : null;

                            if (!companyNumber) continue;

                            // Deduplication Logic
                            const { data: existing } = await supabase
                                .from('businesses')
                                .select('id, discovery_source')
                                .eq('legal_name', name)
                                .eq('country_code', 'US')
                                .maybeSingle();

                            if (existing) {
                                if (existing.discovery_source === 'sec_api') continue;
                            }

                            // Upsert
                            const { error } = await supabase
                                .from('businesses')
                                .upsert({
                                    id: existing?.id,
                                    org_number: companyNumber,
                                    legal_name: name,
                                    country_code: 'US',
                                    registry_data: {
                                        source: 'OpenCorporates',
                                        jurisdiction_code: jurisdiction,
                                        registry_url: url,
                                        import_method: 'puppeteer_scrape'
                                    },
                                    discovery_source: 'us_private_bot',
                                    website_status: 'not_found'
                                }, { onConflict: 'org_number, country_code' });

                            if (!error) newCount++;
                        }

                        console.log(`     ✅ Scraped ${newCount} companies (Page ${p})`);

                        // Polite Delay between pages
                        await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));

                    } catch (err: any) {
                        console.error('     ❌ Page Error:', err.message);
                    }
                }
                // Delay between keywords
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    } catch (err: any) {
        console.error('❌ Browser Error:', err.message);
    } finally {
        await browser.close();
    }
}

// Run
if (require.main === module) {
    runUSPrivateImport().catch(console.error);
}
