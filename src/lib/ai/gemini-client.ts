import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
    console.warn('⚠️ GOOGLE_GEMINI_API_KEY is not set in environment variables.');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

// Models
// 'gemini-2.0-flash' is the fastest and most cost-effective for high volume
export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/**
 * Helper to generate text from a prompt with robust Retry logic
 */
export async function generateText(prompt: string, retries = 3): Promise<string | null> {
    if (!apiKey) return null;

    let attempt = 0;

    while (attempt < retries) {
        try {
            const result = await geminiModel.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            attempt++;

            // Check for rate limiting (429) or overloaded model (503)
            const isRateLimit = error.message?.includes('429') || error.message?.includes('Too Many Requests');
            const isOverloaded = error.message?.includes('503') || error.message?.includes('Overloaded');

            if ((isRateLimit || isOverloaded) && attempt < retries) {
                // Exponential backoff: 2s, 4s, 8s...
                const delay = 2000 * Math.pow(2, attempt);
                console.warn(`⚠️ Gemini Rate Limit hit. Waiting ${delay}ms before retry ${attempt}/${retries}...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            console.error('Gemini generation error:', error.message);
            return null; // Fail gracefully on other errors or final retry
        }
    }
    return null;
}
