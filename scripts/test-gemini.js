// Simple test script for Gemini API Integration
require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
        console.error("❌ No GOOGLE_GEMINI_API_KEY found in .env.local");
        return;
    }

    console.log(`🔑 Found API Key: ${apiKey.substring(0, 10)}...`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = "Explain briefly why a B2B business verification system is useful.";

    console.log("\n🤖 Sending request to Gemini...");

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("\n✅ Gemini Response:");
        console.log("-----------------------------------");
        console.log(text);
        console.log("-----------------------------------");
        console.log("Integrasjon fungerer!");

    } catch (error) {
        console.error("\n❌ Gemini Error:", error.message);
    }
}

testGemini();
