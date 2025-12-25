
import { generateText } from './gemini-client';

interface WebsiteData {
    homepage: {
        content: string;
        title: string;
    };
    subpages: {
        content: string;
        title: string;
    }[];
}

interface AnalysisResult {
    company_description: string;
    products: string[];
    services: string[];
    sentiment?: 'positive' | 'neutral' | 'negative';
}

/**
 * Uses Gemini to analyze scraped website data and extract rich information
 */
export async function analyzeWebsite(data: any, companyName: string): Promise<AnalysisResult> {
    console.log(`🧠 AI Analyzing ${companyName}...`);

    // Combine some relevant text for analysis
    const siteText = [
        `Title: ${data.homepage.title}`,
        `Homepage Content: ${data.homepage.content.slice(0, 4000)}`,
        ...data.subpages.map((p: any) => `Subpage ${p.title}: ${p.content.slice(0, 1000)}`)
    ].join('\n\n').slice(0, 10000);

    const prompt = `
        You are an expert business analyst. Analyze the following website content for the company "${companyName}".
        
        Extract the following information in Norwegian:
        1. Professional company description (max 300 characters).
        2. List of main products/software (array of strings).
        3. List of services offered (array of strings).
        
        Return the result as a raw JSON object with these keys:
        {
          "company_description": "...",
          "products": ["...", "..."],
          "services": ["...", "..."]
        }
        
        Website Content:
        ${siteText}
    `;

    try {
        const response = await generateText(prompt);
        if (!response) throw new Error('Empty response from AI');

        // Extract JSON from potential markdown wrapping
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : response;

        const parsed = JSON.parse(cleanJson);

        return {
            company_description: parsed.company_description || '',
            products: parsed.products || [],
            services: parsed.services || []
        };
    } catch (error) {
        console.error('AI Analysis failed:', error);
        return {
            company_description: 'Kunne ikke analysere nettstedet.',
            products: [],
            services: []
        };
    }
}
