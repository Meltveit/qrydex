/**
 * News Intelligence Module
 * Extracts company names, sentiment, and topics from news articles using AI
 */

import { generateText } from '../../src/lib/ai/gemini-client';

export interface ExtractedCompany {
    name: string;
    confidence: number; // 0-1
    mentions: number; // How many times mentioned
    context: string; // Surrounding context
}

export interface SentimentAnalysis {
    label: 'positive' | 'neutral' | 'negative';
    score: number; // -1.0 to 1.0
    reasoning: string;
}

export interface ArticleAnalysis {
    companies: ExtractedCompany[];
    sentiment: SentimentAnalysis;
    topics: string[];
}

/**
 * Extract companies mentioned in article using AI
 */
export async function extractCompaniesFromText(
    title: string,
    content: string
): Promise<ExtractedCompany[]> {
    const prompt = `Analyze this Norwegian/English news article and extract ALL company names mentioned.

TITLE: ${title}

CONTENT: ${content.substring(0, 3000)}

Return a JSON array of companies in this EXACT format:
[
  {
    "name": "Full legal company name (e.g. 'Equinor ASA', 'Telenor Norge AS')",
    "confidence": 0.95,
    "mentions": 3,
    "context": "Brief context of how they were mentioned"
  }
]

Rules:
- Include ONLY Norwegian/Nordic companies (AS, ASA, SA, AB, ApS, Oyj)
- Use full legal names (with AS/ASA suffix)
- confidence: 0.5-1.0 based on how certain you are it's a real company
- mentions: How many times the company appears in the text
- Be generous - include any business entity mentioned

Return ONLY the JSON array, no other text.`;

    try {
        const response = await generateText(prompt);

        if (!response) return [];

        const cleaned = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const companies = JSON.parse(cleaned) as ExtractedCompany[];

        return companies.filter(c => c.confidence >= 0.5);
    } catch (error) {
        console.error('Error extracting companies:', error);
        return [];
    }
}

/**
 * Analyze sentiment of article
 */
export async function analyzeSentiment(
    title: string,
    content: string
): Promise<SentimentAnalysis> {
    const prompt = `Analyze the sentiment of this news article.

TITLE: ${title}

CONTENT: ${content.substring(0, 2000)}

Return JSON in this EXACT format:
{
  "label": "positive" | "neutral" | "negative",
  "score": 0.5,
  "reasoning": "Brief explanation"
}

Guidelines:
- "positive": Good news, achievements, growth, awards
- "negative": Scandals, layoffs, bankruptcy, lawsuits, losses
- "neutral": Factual reporting, announcements
- score: -1.0 (very negative) to 1.0 (very positive)

Return ONLY the JSON object, no other text.`;

    try {
        const response = await generateText(prompt);

        if (!response) {
            return {
                label: 'neutral',
                score: 0,
                reasoning: 'No response from AI'
            };
        }

        const cleaned = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
        return JSON.parse(cleaned) as SentimentAnalysis;
    } catch (error) {
        console.error('Error analyzing sentiment:', error);
        return {
            label: 'neutral',
            score: 0,
            reasoning: 'Analysis failed'
        };
    }
}

/**
 * Extract topics/keywords from article
 */
export async function extractTopics(
    title: string,
    content: string
): Promise<string[]> {
    const prompt = `Extract 3-5 key topics/keywords from this article.

TITLE: ${title}

CONTENT: ${content.substring(0, 2000)}

Return a JSON array of Norwegian topic keywords (lowercase):
["teknologi", "finans", "miljø"]

Topics should be:
- Single words or short phrases
- In Norwegian
- Relevant categories (industri, finans, startup, fusjon, etc.)

Return ONLY the JSON array, no other text.`;

    try {
        const response = await generateText(prompt);

        if (!response) return [];

        const cleaned = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
        return JSON.parse(cleaned) as string[];
    } catch (error) {
        console.error('Error extracting topics:', error);
        return [];
    }
}

/**
 * Complete article analysis (companies + sentiment + topics)
 */
export async function analyzeArticle(
    title: string,
    content: string
): Promise<ArticleAnalysis> {
    console.log(`🤖 Analyzing article: ${title.substring(0, 50)}...`);

    const [companies, sentiment, topics] = await Promise.all([
        extractCompaniesFromText(title, content),
        analyzeSentiment(title, content),
        extractTopics(title, content)
    ]);

    console.log(`  📊 Found ${companies.length} companies, sentiment: ${sentiment.label}`);

    return {
        companies,
        sentiment,
        topics
    };
}
