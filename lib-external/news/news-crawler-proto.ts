
import { createServerClient } from '../../src/lib/supabase';
import { generateText } from '../../src/lib/ai/gemini-client';

// Simple types for news article
interface NewsArticle {
    title: string;
    url: string;
    description: string;
    publishedTime: string;
    imageUrl?: string;
    source: string;
}

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

/**
 * Validates URLs found in sitemaps to filter out non-article pages
 */
function isValidNewsUrl(url: string): boolean {
    const skipTerms = ['/tag/', '/kategori/', '/konferanser/', '/stillinger/', '/aksjeskole/', '/tema/', '/forfatter/', '/sok?'];
    if (skipTerms.some(term => url.includes(term))) return false;
    // Finansavisen specific structure often has year/month in URL for articles
    if (url.includes('finansavisen.no/nyheter') || url.match(/\/202[4-5]\//)) return true;
    return false;
}

/**
 * Extracts metadata from a given URL using OGP tags
 */
async function scrapeMetadata(url: string): Promise<NewsArticle | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
                'Accept': 'text/html'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) return null;
        const html = await response.text();

        // Simple Regex Extraction for Meta Tags
        const getMeta = (prop: string) => {
            const match = html.match(new RegExp(`<meta property="${prop}" content="([^"]+)"`)) ||
                html.match(new RegExp(`<meta name="${prop}" content="([^"]+)"`));
            return match ? match[1] : '';
        };

        const title = getMeta('og:title') || getMeta('twitter:title');
        const description = getMeta('og:description') || getMeta('description');
        const image = getMeta('og:image');
        const publishedTime = getMeta('article:published_time') || new Date().toISOString();

        if (!title || !description) return null;

        return {
            title: title.replace(/ \| Finansavisen$/, ''), // Clean title
            description,
            url,
            imageUrl: image,
            publishedTime,
            source: 'Finansavisen'
        };

    } catch (error) {
        console.error(`Failed to scrape ${url}:`, error);
        return null;
    }
}

/**
 * Analyze text to find mentioned companies using simple heuristics + AI verification
 */
async function findMentionedCompanies(article: NewsArticle) {
    console.log(`\n📰 Analyzing: ${article.title}`);

    // 1. Ask Gemini to extract company names purely from Title + Description
    // This is cheap and fast.
    const prompt = `
    Analyze this news snippet and identifying any COMPANIES mentioned.
    
    Title: ${article.title}
    Summary: ${article.description}

    Return a JSON array of company names. If none, return [].
    Example: ["Equinor", "Aker BP"]
    `;

    try {
        const result = await generateText(prompt);
        let companies: string[] = [];
        try {
            // Clean up code blocks if present
            const cleanJson = result?.replace(/```json/g, '').replace(/```/g, '').trim() || '[]';
            companies = JSON.parse(cleanJson);
        } catch { }

        if (companies.length === 0) {
            console.log('   No companies found in snippet.');
            return;
        }

        console.log(`   🏢 Found potential companies: ${companies.join(', ')}`);

        // 2. For each company, try to find it in our DB or Registry
        const supabase = createServerClient();

        for (const company of companies) {
            // Search in our DB
            const { data: existing } = await supabase
                .from('businesses')
                .select('id, legal_name')
                .textSearch('legal_name', company.split(' ').join(' & ')) // Simple full text search
                .limit(1);

            if (existing && existing.length > 0) {
                console.log(`   ✅ Matched existing DB business: ${existing[0].legal_name}`);
                await linkArticleToBusiness(article, existing[0].id);
            } else {
                console.log(`   ⚠️ Company "${company}" not in DB. (TODO: Search Registry / Create Placeholder)`);
                // Here we would call the Registry Crawler logic to find and insert the company!
            }
        }

    } catch (e) {
        console.log('Error analyzing article:', e);
    }
}

async function linkArticleToBusiness(article: NewsArticle, businessId: string) {
    const supabase = createServerClient();

    // Create News Signal
    const { error } = await supabase.from('news_signals').insert({
        business_id: businessId,
        headline: article.title,
        summary: article.description,
        url: article.url,
        source: 'Finansavisen',
        published_at: article.publishedTime,
        sentiment: 'neutral', // Default, could analyze later
        relevance_score: 0.8  // High relevance since explicitly mentioned
    });

    if (!error) console.log(`   🔗 Linked article to business ID: ${businessId}`);
    else console.error('   Failed to link:', error.message);
}


/**
 * Main Crawler Function
 */
export async function crawlFinansavisen() {
    console.log('🚀 Starting Finansavisen Sitemap Crawler...');

    try {
        // Fetch Sitemap
        // https://www.finansavisen.no/sitemap_index.xml usually lists sub-sitemaps
        // Let's try the specific article sitemap if known, otherwise parse index
        const sitemapUrl = 'https://www.finansavisen.no/sitemap/articles';

        const response = await fetch(sitemapUrl, {
            headers: { 'User-Agent': USER_AGENTS[0] }
        });
        const xml = await response.text();

        // Simple regex to find URLs
        const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

        // Filter for today's articles (optimistic approach, real code needs date parsing from sitemap)
        const articleUrls = urls.filter(isValidNewsUrl).slice(0, 5); // Test with 5 first

        console.log(`📊 Found ${articleUrls.length} potential articles to scan.`);

        for (const url of articleUrls) {
            const article = await scrapeMetadata(url);
            if (article) {
                await findMentionedCompanies(article);
            }
            await new Promise(r => setTimeout(r, 1000)); // Be polite
        }

    } catch (e) {
        console.error('Crawler failed:', e);
    }
}

// Run if called directly
if (require.main === module) {
    crawlFinansavisen();
}
