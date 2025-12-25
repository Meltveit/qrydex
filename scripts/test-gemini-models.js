// List available Gemini models
require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ No API Key found");
        return;
    }

    console.log(`🔑 Using API Key: ${apiKey.substring(0, 10)}...`);
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // Attempt to generate content directly to test default model first
        // Listing models might not be available on all keys depending on restrictions, 
        // but generateContent is the core feature.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("Testing gemini-1.5-flash...");
        const result = await model.generateContent("Hello?");
        console.log("✅ gemini-1.5-flash is WORKING!");

    } catch (e) {
        console.error("❌ gemini-1.5-flash failed:", e.message);

        try {
            const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
            console.log("Testing gemini-pro...");
            const result2 = await model2.generateContent("Hello?");
            console.log("✅ gemini-pro is WORKING!");
        } catch (e2) {
            console.error("❌ gemini-pro also failed:", e2.message);
        }
    }
}

listModels();
