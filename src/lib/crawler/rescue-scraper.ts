
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServerClient } from '../supabase';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { processDeepCrawl } from './data-extractor';
import type { DeepCrawlResult, PageResult } from './deep-crawler';
import { URL } from 'url';

// CONFIG
const HEADLESS = true;
const BATCH_SIZE = 5; // Process 5 at a time, then restart browser to prevent leaks

async function runRescueMission() {
    console.log('🚑 RESCUE BOT INITIALIZED');
    const supabase = createServerClient();

    while (true) {
        // 1. Fetch Candidates
        const { data: businesses, error } = await supabase
            .from('businesses')
            .select('id, domain, legal_name')
            .eq('website_status', 'needs_rescue')
            .order('last_scraped_at', { ascending: true }) // Oldest first
            .limit(BATCH_SIZE);

        if (error) {
            console.error('❌ DB Error:', error.message);
            await sleep(10000);
            continue;
        }

        if (!businesses || businesses.length === 0) {
            console.log('✅ No businesses need rescuing. Waiting 2 minutes...');
            await sleep(2 * 60 * 1000); // 2 min sleep
            continue;
        }

        console.log(`🚑 Attempting to rescue ${businesses.length} businesses...`);

        // 2. Launch Browser (One instance per batch)
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: HEADLESS,
                args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for some envs
            });

            const page = await browser.newPage();

            // Set a "Human" User-Agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1366, height: 768 });

            for (const business of businesses) {
                console.log(`\n🏥 Rescuing: ${business.legal_name} (${business.domain})`);
                const url = business.domain.startsWith('http') ? business.domain : `https://${business.domain}`;

                try {
                    // Navigate
                    console.log('   Navigating...');
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

                    // Wait a bit for JS to settle (Cloudflare check often takes 5s)
                    await sleep(5000);

                    // Check if we are still blocked (Title check)
                    const title = await page.title();
                    if (title.includes('Just a moment') || title.includes('Attention Required') || title.includes('Cloudflare')) {
                        console.log('   ⚠️ Still blocked by Cloudflare challenge.');
                        throw new Error('Cloudflare Block');
                    }

                    // Extract Content
                    const content = await page.content();
                    const $ = cheerio.load(content);

                    // Clean content
                    $('script, style, noscript, svg, iframe').remove();
                    const cleanText = $('body').text().replace(/\s+/g, ' ').trim();

                    // Construct basic DeepCrawlResult (Single Page simulation)
                    const pageResult: PageResult = {
                        url: url,
                        title: title,
                        content: cleanText,
                        html: content,
                        links: [], // Could extract, but keeping it simple for now
                        headings: {
                            h1: $('h1').map((i, el) => $(el).text().trim()).get(),
                            h2: $('h2').map((i, el) => $(el).text().trim()).get(),
                            h3: $('h3').map((i, el) => $(el).text().trim()).get()
                        },
                        meta: {
                            description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'),
                            language: $('html').attr('lang')
                        },
                        structuredData: []
                    };

                    const crawlResult: DeepCrawlResult = {
                        baseUrl: url,
                        totalPages: 1,
                        pages: [pageResult],
                        allImages: [],
                        sitemapUrls: [],
                        crawlStats: { startTime: Date.now(), endTime: Date.now(), duration: 0, failedUrls: [] },
                        sitelinks: [],
                        businessHours: null,
                        extractedContact: { emails: [], phones: [], socials: {} } // Will be extracted by processDeepCrawl
                    };

                    // Process Data
                    const enrichedData = await processDeepCrawl(crawlResult);

                    // Update DB
                    const { error: updateError } = await supabase
                        .from('businesses')
                        .update({
                            company_description: enrichedData.company_description,
                            logo_url: enrichedData.logo_url,
                            social_media: enrichedData.contact_info.social_media,

                            website_status: 'active', // SUCCESS!
                            website_last_crawled: new Date().toISOString(),

                            quality_analysis: {
                                website_scraped: true,
                                rescue_method: 'puppeteer', // Mark source
                                scraped_at: new Date().toISOString(),
                                contact_info: enrichedData.contact_info,
                                services: enrichedData.services,
                                products: enrichedData.products,
                                industry_category: enrichedData.industry_category
                            }
                        })
                        .eq('id', business.id);

                    if (updateError) throw updateError;
                    console.log('   ✅ Rescue Successful! Data saved.');

                } catch (err: any) {
                    console.error(`   ❌ Rescue Failed: ${err.message}`);

                    // Mark as rescue_failed so we don't loop forever
                    // Optionally: Set to 'registry_fallback' here if this was the last resort
                    await supabase
                        .from('businesses')
                        .update({
                            website_status: 'rescue_failed',
                            last_scraped_at: new Date().toISOString()
                        })
                        .eq('id', business.id);
                }
            }

        } catch (err: any) {
            console.error('🚨 Browser Crash:', err.message);
        } finally {
            if (browser) await browser.close();
            console.log(`♻️  Batch complete. Restarting browser...`);
        }
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run if called directly
if (require.main === module) {
    runRescueMission().catch(console.error);
}
