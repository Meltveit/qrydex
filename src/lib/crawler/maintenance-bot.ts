
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
    console.error('Missing environment variables!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Configuration
const BATCH_SIZE = 5;
const DELAY_MS = 2000;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 1. Fetch businesses that need verification (prioritizing high trust score, oldest verification)
async function getBusinessesToVerify() {
    // Logic: 
    // - Verified businesses only (we don't maintain 'discovered' ones yet)
    // - Either never AI verified OR verified very long ago
    // - Sort by trust_score desc (protect the best assets first)

    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('verification_status', 'verified')
        // Try to filter for those needing AI verification. 
        // We'll manually filter in code if 'ai_verified_at' is null/old to simplify query
        .order('trust_score', { ascending: false })
        .limit(50); // Fetch a chunk

    if (error) {
        console.error('Error fetching businesses:', error);
        return [];
    }

    // Filter purely for: ai_verified_at IS NULL OR older than 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    return data.filter(b => {
        if (!b.last_verified_at) return true;
        return new Date(b.last_verified_at) < thirtyDaysAgo;
    });
}

// 2. AI Analysis Function
async function analyzeBusinessIntegrity(business: any) {
    const prompt = `
    Analyze this business data for consistency.
    
    Company Name: "${business.legal_name}"
    Website URL: "${business.website_url || business.domain}"
    Description: "${business.company_description || ''}"
    
    Task:
    1. Does the website likely belong to this SPECIFIC company?
    2. Is the description specific to "${business.legal_name}" or is it a generic description of a parent company/holding?
    
    Context:
    - If Company is "A/S Røra Fabrikker" and Website is "coop.no" and Description talks about "Coop is a cooperative...", this is a PARENT_MISMATCH.
    - If Company is "Equinor" and website is "equinor.com", this is MATCH.
    - If Company name is completely different from URL (e.g. "Pizza Shop" vs "accounting.com"), this is WRONG_WEBSITE.

    Return JSON:
    {
        "status": "MATCH" | "PARENT_MISMATCH" | "WRONG_WEBSITE",
        "confidence": number (0-100),
        "reason": "short explanation"
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.error('AI Error:', e);
        return null;
    }
}

// 3. Main Loop
async function runMaintenance() {
    console.log('Starting Maintenance Bot...');

    while (true) {
        const batch = await getBusinessesToVerify();
        if (batch.length === 0) {
            console.log('No businesses need verification. Sleeping for 1 minute...');
            await sleep(60000);
            continue;
        }

        console.log(`Processing batch of ${batch.length} businesses...`);

        for (const business of batch) {
            console.log(`Verifying: ${business.legal_name} (${business.org_number})`);

            const analysis = await analyzeBusinessIntegrity(business);

            if (!analysis) {
                console.log('Skipping (AI Failed)');
                continue;
            }

            console.log(`> Result: ${analysis.status} (${analysis.confidence}%) - ${analysis.reason}`);

            const updates: any = {
                last_verified_at: new Date().toISOString()
            };

            if (analysis.status === 'MATCH' && analysis.confidence > 80) {
                // All good
                updates.ai_quality_score = 100;
            } else if (analysis.status === 'PARENT_MISMATCH') {
                // Clear description so it doesn't look misleading
                // Flag for re-scraping (maybe add a 'needs_deep_scan' flag in future)
                updates.company_description = null;
                updates.company_description = null;
                console.log('>>> Action: Cleared misleading description.');
            } else if (business.company_description && business.company_description.startsWith("Based on the available data")) {
                // Garbage collection for generic AI descriptions
                updates.company_description = null;
                console.log('>>> Action: Cleared generic AI placeholder description.');
            } else if (analysis.status === 'WRONG_WEBSITE' && analysis.confidence > 90) {
                // Dangerous! Unlink website.
                updates.website_url = null;
                updates.website_status = 'pending_discovery'; // Send back to discovery bot
                updates.company_description = null;
                updates.ai_quality_score = 0;
                console.log('>>> Action: REMOVED Website. Sent back to discovery.');
            }

            // Update DB
            const { error } = await supabase
                .from('businesses')
                .update(updates)
                .eq('org_number', business.org_number);

            if (error) console.error('DB Update Error:', error);

            await sleep(DELAY_MS);
        }
    }
}

// Run
runMaintenance().catch(console.error);
