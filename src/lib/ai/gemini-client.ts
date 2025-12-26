import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
    console.warn('⚠️ GOOGLE_GEMINI_API_KEY is not set in environment variables.');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

// Models
// 'gemini-2.0-flash' is the latest fast model
export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/**
 * Helper to generate text from a prompt
 */
export async function generateText(prompt: string): Promise<string | null> {
    try {
        if (!apiKey) return null;

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Gemini generation error:', error);
        return null; // Fail gracefully
    }
}
