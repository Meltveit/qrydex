/**
 * Auto-Discovery: News → New Businesses
 * Automatically discovers and adds new businesses mentioned in news articles
 */

import { createClient } from '@supabase/supabase-js';
import { analyzeArticle } from './news-intelligence';
import { searchGlobalRegistry } from '../registries/global-registry';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Search Brønnøysund for company by name
 */
async function searchBrregByName(companyName: string) {
    try {
        // Remove common suffixes for better matching
        const searchTerm = companyName
            .replace(/\s+(AS|ASA|SA)$/i, '')
            .trim();

        const response = await fetch(
            `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(searchTerm)}`
        );

        if (!response.ok) return null;

        const data = await response.json();

        if (data._embedded?.enheter?.length > 0) {
            const company = data._embedded.enheter[0];
            return {
                organisasjonsnummer: company.organisasjonsnummer,
                navn: company.navn,
                hjemmeside: company.hjemmeside,
                forretningsadresse: company.forretningsadresse,
                naeringskode: company.naeringskode1
            };
        }

        return null;
    } catch (error) {
        console.error('Brreg search error:', error);
        return null;
    }
}

/**
 * Find existing business by name (fuzzy match)
 */
async function findBusinessByName(companyName: string) {
    // Try exact match first
    let { data } = await supabase
        .from('businesses')
        .select('id, legal_name, org_number')
        .ilike('legal_name', companyName)
        .limit(1)
        .single();

    if (data) return data;

    // Try partial match (remove AS/ASA)
    const cleanName = companyName.replace(/\s+(AS|ASA|SA)$/i, '').trim();

    ({ data } = await supabase
        .from('businesses')
        .select('id, legal_name, org_number')
        .ilike('legal_name', `%${cleanName}%`)
        .limit(1)
        .single());

    return data;
}

/**
 * Link article to business
 */
async function linkArticleToBusiness(
    articleId: string,
    businessId: string,
    mentionedAs: string,
    relevance: number
) {
    await supabase.from('business_news').upsert({
        article_id: articleId,
        business_id: businessId,
        relevance_score: relevance,
        mentioned_as: mentionedAs
    });
}

/**
 * Process news article for auto-discovery
 */
export async function processNewsArticle(articleId: string) {
    console.log(`\n🔍 Processing article ${articleId} for auto-discovery...`);

    // Fetch article
    const { data: article, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('id', articleId)
        .single();

    if (error || !article) {
        console.error('Article not found:', error);
        return;
    }

    // Analyze article with AI
    const analysis = await analyzeArticle(article.title, article.content || article.summary);

    // Update article with analysis
    await supabase
        .from('news_articles')
        .update({
            sentiment: analysis.sentiment.label,
            sentiment_score: analysis.sentiment.score,
            topics: analysis.topics,
            companies_mentioned: analysis.companies.map((c: any) => c.name)
        })
        .eq('id', articleId);

    console.log(`📊 Analysis: ${analysis.companies.length} companies, sentiment: ${analysis.sentiment.label}`);

    let newBusinessCount = 0;
    let linkedCount = 0;

    // Process each mentioned company
    for (const company of analysis.companies) {
        console.log(`  🏢 Processing: ${company.name} (confidence: ${company.confidence})`);

        // Check if business exists
        const existing = await findBusinessByName(company.name);

        if (existing) {
            // Link to existing business
            await linkArticleToBusiness(
                articleId,
                existing.id,
                company.name,
                company.confidence
            );
            linkedCount++;
            console.log(`    ✅ Linked to existing business: ${existing.legal_name}`);
        } else {
            // NEW COMPANY! Try to discover it
            console.log(`    🆕 New company! Searching global registries...`);

            const registryData = await searchGlobalRegistry(company.name);

            if (registryData) {
                console.log(`    ✨ Found in ${registryData.country} registry: ${registryData.name}`);

                // Add to database
                const { data: newBusiness, error: insertError } = await supabase
                    .from('businesses')
                    .insert({
                        org_number: registryData.id,
                        legal_name: registryData.name,
                        country_code: registryData.country,
                        domain: registryData.website,
                        discovery_source: 'news_article',
                        discovery_article_id: articleId,
                        registry_data: {
                            registered_address: registryData.address,
                            city: registryData.city,
                            postal_code: registryData.postalCode,
                            nace_description: registryData.industry
                        }
                    })
                    .select()
                    .single();

                if (!insertError && newBusiness) {
                    newBusinessCount++;

                    // Link article
                    await linkArticleToBusiness(
                        articleId,
                        newBusiness.id,
                        company.name,
                        company.confidence
                    );

                    // Trigger website scraping if domain exists
                    if (registryData.website) {
                        console.log(`    🌐 Queuing website scrape: ${registryData.website}`);
                        // Note: Actual scraping will be handled by re-scrape cron
                    }
                }
            } else {
                console.log(`    ⚠️  Not found in any registry`);
            }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n✅ Article processing complete:`);
    console.log(`   🆕 New businesses added: ${newBusinessCount}`);
    console.log(`   🔗 Linked to existing: ${linkedCount}`);

    return {
        newBusinesses: newBusinessCount,
        linkedBusinesses: linkedCount,
        analysis
    };
}

/**
 * Batch process all unprocessed articles
 */
export async function processUnprocessedArticles(limit = 10) {
    const { data: articles } = await supabase
        .from('news_articles')
        .select('id, title')
        .is('companies_mentioned', null)
        .order('published_at', { ascending: false })
        .limit(limit);

    if (!articles || articles.length === 0) {
        console.log('✅ No unprocessed articles');
        return;
    }

    console.log(`📰 Processing ${articles.length} unprocessed articles...`);

    for (const article of articles) {
        await processNewsArticle(article.id);
    }

    console.log('✅ Batch processing complete');
}
