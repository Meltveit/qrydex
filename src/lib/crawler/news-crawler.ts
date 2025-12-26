import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NewsArticle {
    source_id: string;
    url: string;
    title: string;
    summary?: string;
    published_at?: string;
    sentiment?: 'neutral';
}

// Simple RSS parser using native fetch and XML parsing
async function parseRSSFeed(url: string): Promise<any[]> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Qrydex News Bot/1.0'
            }
        });

        if (!response.ok) {
            console.warn(`Failed to fetch ${url}: ${response.status}`);
            return [];
        }

        const xmlText = await response.text();

        // Extract items using regex (simple but effective)
        const itemMatches = xmlText.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
        const items: any[] = [];

        for (const match of itemMatches) {
            const itemXml = match[1];

            const title = itemXml.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim();
            const link = itemXml.match(/<link[^>]*>(.*?)<\/link>/i)?.[1]?.trim();
            const description = itemXml.match(/<description[^>]*>(.*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim();
            const pubDate = itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i)?.[1]?.trim();

            if (title && link) {
                items.push({
                    title,
                    link,
                    description,
                    pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
                });
            }
        }

        return items;
    } catch (error) {
        console.error(`Error parsing RSS feed ${url}:`, error);
        return [];
    }
}

async function crawlAllNewsSources() {
    console.log('📰 Starting news crawl (Native Parser)...');

    // Get enabled sources
    const { data: sources, error } = await supabase
        .from('news_sources')
        .select('*')
        .eq('crawl_enabled', true);

    if (error || !sources) {
        console.error('Failed to fetch news sources:', error);
        return;
    }

    console.log(`Found ${sources.length} enabled news sources.`);
    let totalArticles = 0;

    for (const source of sources) {
        console.log(`\n📡 Processing: ${source.source_name}`);

        try {
            const items = await parseRSSFeed(source.source_url);
            console.log(`   Fetched ${items.length} items`);

            const newArticles: NewsArticle[] = items.map(item => ({
                source_id: source.id,
                url: item.link,
                title: item.title,
                summary: item.description?.substring(0, 500) || '',
                published_at: item.pubDate,
                sentiment: 'neutral' as const
            }));

            if (newArticles.length > 0) {
                const { error: insertError } = await supabase
                    .from('news_articles')
                    .upsert(newArticles, {
                        onConflict: 'url',
                        ignoreDuplicates: true
                    });

                if (insertError) {
                    console.error(`   ❌ Insert error:`, insertError.message);
                } else {
                    console.log(`   ✅ Inserted ${newArticles.length} articles`);
                    totalArticles += newArticles.length;
                }
            }

            // Update last_crawled_at
            await supabase
                .from('news_sources')
                .update({ last_crawled_at: new Date().toISOString() })
                .eq('id', source.id);

        } catch (err: any) {
            console.error(`   ❌ Failed:`, err.message);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n✅ News crawl completed. Total new articles: ${totalArticles}`);
}

// Run if executed directly
if (require.main === module) {
    crawlAllNewsSources().then(() => {
        console.log('News bot finished.');
        process.exit(0);
    }).catch(err => {
        console.error('News bot failed:', err);
        process.exit(1);
    });
}

export { crawlAllNewsSources };
