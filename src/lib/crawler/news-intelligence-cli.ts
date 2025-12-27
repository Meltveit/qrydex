import { createClient } from '@supabase/supabase-js';
import { generateText } from '../ai/gemini-client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NewsArticle {
    id: string;
    title: string;
    summary: string;
    content?: string;
    url: string;
    published_at: string;
}

interface ExtractedCompany {
    name: string;
    confidence: number;
    mentions: number;
    context: string;
}

interface SentimentAnalysis {
    label: string;
    score: number;
    reasoning: string;
}

interface ArticleAnalysis {
    companies: ExtractedCompany[];
    sentiment: SentimentAnalysis;
    topics: string[];
}

/**
 * AI Analysis Functions
 */
async function analyzeArticleContent(title: string, summary: string): Promise<ArticleAnalysis | null> {
    const prompt = `Analyze this news article and extract business intelligence.
    
TITLE: ${title}
SUMMARY: ${summary}

1. Extract all Nordic/International BUSINESSES mentioned (e.g. "Equinor", "Norsk Hydro").
2. Analyze the SENTIMENT (positive/neutral/negative) of the news for the main entities.
3. Extract key TOPICS (e.g. "Energy", "M&A", "Bankruptcy").

Return a JSON object:
{
  "companies": [
    { "name": "Exact Company Name", "confidence": 0.9, "mentions": 1, "context": "Brief context" }
  ],
  "sentiment": { "label": "positive/neutral/negative", "score": 0.5, "reasoning": "Why" },
  "topics": ["topic1", "topic2"]
}

Rules:
- Ignore generic terms like "the government", "police".
- Focus on commercial entities.
- If no companies: companies = [].`;

    try {
        const response = await generateText(prompt);
        if (!response) return null;

        const cleaned = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
        return JSON.parse(cleaned) as ArticleAnalysis;
    } catch (e) {
        console.error("AI Analysis failed:", e);
        return null;
    }
}

/**
 * Main Processing Loop
 */
async function runNewsIntelligence() {
    console.log('🧠 Starting News Intelligence Bot...');

    while (true) {
        try {
            // 1. Fetch unanalyzed articles
            // We assume 'analyzed_at' exists. If not, we might need to add it or use another flag.
            // For now, let's try to fetch articles where we haven't linked any signals yet?
            // Safer: Add 'analyzed_at' column if it doesn't exist? 
            // Let's assume the user has the column or I'll handle the error.
            // Actually, let's check if 'analyzed_at' is null.
            const { data: articles, error } = await supabase
                .from('news_articles')
                .select('*')
                .is('topics', null)
                .limit(5);

            if (error) {
                console.error('Error fetching articles:', error);
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }

            if (!articles || articles.length === 0) {
                console.log('💤 No unanalyzed articles found. Sleeping 60s...');
                await new Promise(r => setTimeout(r, 60000));
                continue;
            }

            console.log(`🔍 Found ${articles.length} articles to analyze.`);

            for (const article of articles) {
                console.log(`\n📄 Analyzing: "${article.title}"`);

                // 2. Analyze with AI
                const analysis = await analyzeArticleContent(article.title, article.summary || '');

                if (analysis) {
                    console.log(`   ✅ Sentiment: ${analysis.sentiment.label}, Companies: ${analysis.companies.length}`);

                    // 3. Link to Businesses
                    for (const extracted of analysis.companies) {
                        // Search for the business in our DB
                        const { data: businesses } = await supabase
                            .from('businesses')
                            .select('id, legal_name, org_number')
                            .textSearch('legal_name', extracted.name) // Simple searching
                            .limit(1);

                        if (businesses && businesses.length > 0) {
                            const business = businesses[0];
                            console.log(`      🔗 Linking to: ${business.legal_name} (${business.org_number})`);

                            // Insert Link
                            await supabase.from('business_news').insert({
                                business_id: business.id,
                                article_id: article.id,
                                relevance_score: extracted.confidence,
                                mentioned_as: extracted.name
                            });
                        } else {
                            console.log(`      ❓ Unknown business: "${extracted.name}"`);
                            // TODO: Maybe auto-add to 'potential_businesses'?
                        }
                    }

                    // 4. Update Article with Analysis
                    await supabase
                        .from('news_articles')
                        .update({
                            sentiment: analysis.sentiment.label,
                            sentiment_score: analysis.sentiment.score,
                            topics: analysis.topics,
                            companies_mentioned: analysis.companies.map(c => c.name)
                        })
                        .eq('id', article.id);

                } else {
                    console.log('   ❌ AI Analysis failed. Marking as skipped.');
                    // Mark as analyzedto avoid infinite loop
                    await supabase
                        .from('news_articles')
                        .update({ topics: [] })
                        .eq('id', article.id);
                }

                // Rate limit (Gemini)
                await new Promise(r => setTimeout(r, 5000));
            }

        } catch (error) {
            console.error('Crash in main loop:', error);
            await new Promise(r => setTimeout(r, 10000));
        }
    }
}

// Run
if (require.main === module) {
    runNewsIntelligence().catch(console.error);
}
