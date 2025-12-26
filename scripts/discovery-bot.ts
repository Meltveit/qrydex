import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Helper to validate if a URL is reachable
async function validateUrl(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Qrydex/1.0 (Business Discovery Bot)'
            }
        });
        clearTimeout(timeoutId);

        return response.ok || (response.status >= 300 && response.status < 400);
    } catch (e) {
        return false;
    }
}

// AI-based search function
async function searchForDomain(companyName: string, orgNumber: string, country: string): Promise<string | null> {
    console.log(`🔍 AI Searching for domain: ${companyName} (${country})...`);

    // Dynamic import for Gemini client
    const { generateText } = await import('@/lib/ai/gemini-client');

    const prompt = `What is the official website URL for the company "${companyName}" (Org Nr: ${orgNumber}) located in ${country}? 
    Return ONLY the URL starting with https:// or http://. 
    If you are not at least 80% sure, or if the company likely does not have a website, return "null".
    Do not return social media links (Facebook, LinkedIn) unless it is their primary homepage.
    Return strictly just the URL or "null", no text.`;

    try {
        const result = await generateText(prompt);
        if (!result) throw new Error('Empty response from AI');

        let url = result?.trim();

        if (!url || url.toLowerCase() === 'null' || url.includes(' ')) {
            return null;
        }

        // Cleanup markdown if AI wraps it
        url = url.replace(/`/g, '').replace(/\n/g, '');

        // Basic validation
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }

        console.log(`🤖 AI Suggested: ${url}. Verifying...`);
        const isValid = await validateUrl(url);

        if (isValid) {
            console.log(`✅ URL Verified: ${url}`);
            return url;
        } else {
            console.log(`❌ URL Unreachable: ${url}`);
            return null;
        }

    } catch (e: any) {
        if (e.message?.includes('404') || e.message?.includes('403')) {
            console.error('⚠️ AI Model Error (Check API Key/Model):', e.message);
        } else {
            console.error('AI Discovery Error:', e);
        }
        return null;
    }
}

async function runDiscoveryJob() {
    console.log('🕵️‍♂️ Starting Discovery Bot (Oppdageren)...');

    // Dynamic import for Supabase client
    const { createServerClient } = await import('@/lib/supabase');
    const supabase = createServerClient();

    // Find businesses without domain
    const { data: homelessBusinesses, error } = await supabase
        .from('businesses')
        .select('*')
        .is('domain', null)
        .limit(1); // Process only 1 item per run (every 2 mins)

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!homelessBusinesses || homelessBusinesses.length === 0) {
        console.log('No businesses missing domains.');
        return;
    }

    console.log(`Found ${homelessBusinesses.length} businesses without domain.`);

    let found = 0;

    for (const business of homelessBusinesses) {
        const domain = await searchForDomain(business.legal_name, business.org_number, business.country_code);

        if (domain) {
            console.log(`🎉 Found domain for ${business.legal_name}: ${domain}`);

            // Remove protocol for display domain, but keep full url in metadata if needed?
            // Existing schema uses 'domain' text field, usually just 'example.com' or full url?
            // Looking at existing data, usually 'example.com'.

            let displayDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

            await supabase
                .from('businesses')
                .update({
                    domain: displayDomain,
                    // Optional: could save full url in a new field if schema permitted
                })
                .eq('id', business.id);

            console.log(`🧠 Starting Deep Scan for ${business.legal_name}...`);

            // Dynamic import for scraper to keep startup fast
            const { scrapeWebsite } = await import('@/lib/crawler/website-scraper');

            try {
                // Scrape the newly found domain immediately
                const websiteData = await scrapeWebsite(domain, 10); // Standard depth

                if (websiteData) {
                    await supabase
                        .from('businesses')
                        .update({
                            logo_url: websiteData.logoUrl,
                            company_description: websiteData.description || 'Ingen beskrivelse funnet',
                            social_media: websiteData.socialMedia,
                            sitelinks: websiteData.sitelinks,
                            quality_analysis: {
                                website_scraped: true,
                                scraped_at: new Date().toISOString(),
                                contact_info: websiteData.contactInfo,
                                subpage_count: websiteData.subpages.length,
                                potential_ids: websiteData.potentialBusinessIds,
                            },
                        })
                        .eq('id', business.id);
                    console.log(`✅ Deep Scan complete for ${business.legal_name}`);
                }
            } catch (scrapeError) {
                console.error(`⚠️ Deep Scan failed for ${business.id}:`, scrapeError);
            }

            found++;
        } else {
            console.log(`Searching failed/not found for ${business.legal_name}`);
        }

        // Respect rate limits & politeness - Gemini Free Tier has limits (RMS/RPM)
        // Rate limit 15 RPM / 1M TPM
        console.log('⏳ Waiting 4s to respect rate limits...');
        await new Promise(r => setTimeout(r, 4000));
    }

    console.log(`\n🕵️‍♂️ Discovery complete. Found ${found} new domains.`);
}

runDiscoveryJob();
