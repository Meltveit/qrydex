import Parser from 'rss-parser';
import { createServerClient } from '@/lib/supabase';

const parser = new Parser();

interface NewsArticleInsert {
    source_id: string;
    url: string;
    title: string;
    summary?: string;
    content?: string;
    author?: string;
    published_at?: string;
    sentiment?: 'neutral'; // Default
}

export async function crawlAllNewsSources() {
    const supabase = createServerClient();
    console.log('📰 Starting news crawl...');

    // 1. Get enabled sources
    const { data: sources, error } = await supabase
        .from('news_sources')
        .select('*')
        .eq('crawl_enabled', true);

    if (error || !sources) {
        console.error('Failed to fetch news sources:', error);
        return;
    }

    console.log(`Found ${sources.length} enabled news sources.`);

    for (const source of sources) {
        console.log(`\nProcessing source: ${source.source_name} (${source.source_url})`);

        try {
            const feed = await parser.parseURL(source.source_url);
            console.log(`Fetched ${feed.items.length} items from feed.`);

            const newArticles: NewsArticleInsert[] = [];

            for (const item of feed.items) {
                if (!item.link || !item.title) continue;

                newArticles.push({
                    source_id: source.id,
                    url: item.link,
                    title: item.title,
                    summary: item.contentSnippet || item.content || '',
                    author: item.creator,
                    published_at: item.isoDate ? new Date(item.isoDate).toISOString() : new Date().toISOString(),
                    sentiment: 'neutral',
                });
            }

            // Batch insert with onConflict ignore
            if (newArticles.length > 0) {
                const { error: insertError } = await supabase
                    .from('news_articles')
                    .upsert(newArticles, {
                        onConflict: 'url',
                        ignoreDuplicates: true
                    });

                if (insertError) {
                    console.error(`Error inserting articles for ${source.source_name}:`, insertError);
                } else {
                    console.log(`✅ Processed ${newArticles.length} articles.`);
                }
            }

            // Update last_crawled_at
            await supabase
                .from('news_sources')
                .update({ last_crawled_at: new Date().toISOString() })
                .eq('id', source.id);

        } catch (err) {
            console.error(`❌ Failed to process items for ${source.source_name}:`, err);
        }
    }

    console.log('\n📰 News crawl completed.');
}
