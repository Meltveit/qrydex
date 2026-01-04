/**
 * Description Enhancer Bot
 * Retroactively adds "Key Offerings" to company descriptions and updates translations.
 * Prioritizes US companies.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServerClient } from '../supabase';
import { generateText } from '../ai/gemini-client';

const BATCH_SIZE = 50;

const MSG_KEY_OFFERINGS_EN = "Key Offerings:";

const LANGUAGES = [
    'no', 'sv', 'da', 'fi', 'en', 'de', 'fr', 'es'
];

const langNames: Record<string, string> = {
    'no': 'Norwegian',
    'sv': 'Swedish',
    'da': 'Danish',
    'fi': 'Finnish',
    'en': 'English',
    'de': 'German',
    'fr': 'French',
    'es': 'Spanish'
};

async function translateText(text: string, fromLang: string, toLang: string): Promise<string> {
    const prompt = `Translate this business text header and list from ${langNames[fromLang]} to ${langNames[toLang]}.
    
Maintain professional tone. Return ONLY the translation.

Text to translate:
${text}

Translation:`;

    const translation = await generateText(prompt);
    return translation?.trim() || text;
}

async function generateEnhancedContent(business: any): Promise<{ description: string, services: string } | null> {
    const desc = business.company_description || '';
    const services = business.quality_analysis?.services || [];
    const products = business.product_categories || [];
    const sitelinks = (business.sitelinks || []).map((l: any) => l.title).join(', ');
    const industry = (business.registry_data?.industry_codes || []).join(', ');

    const prompt = `Enhance this company information.
    
    Current Description: "${desc}"
    Industry: ${industry}
    Services: ${services.join(', ')}
    Products: ${products.join(', ')}
    
    Task:
    1. Main Description: Correct short (< 250 chars) descriptions by expanding them to ~350-400 chars using the provided data. If already good, keep/polish it. Professional tone.
    2. detailed_services_description: Create a separate summary (50-150 chars) listing specific products/services. Start with "Key Offerings:" (or similar).
    
    Return pure JSON format:
    {
      "description": "The main company description text...",
      "services": "Key Offerings: Service A, Service B, Product C..."
    }
    `;

    try {
        const res = await generateText(prompt);
        // Clean markdown code blocks if present
        const jsonStr = res?.replace(/```json/g, '').replace(/```/g, '').trim();
        if (!jsonStr) return null;

        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("AI Generation failed:", e);
        return null;
    }
}

async function runEnhancer() {
    const supabase = createServerClient();
    console.log('🚀 Description Enhancer Bot Started (Split Field Mode)');

    while (true) {
        // 1. Prioritize US companies first
        let { data: batch, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('country_code', 'US')
            .not('company_description', 'is', null)
            // Filter: If we haven't populated services_description yet
            // Note: quality_analysis is JSONB. verifying specific key existence in query is hard in basic Supabase JS
            // So we rely on fetching and checking in memory or checking a flag?
            // Let's iterate all not-null descriptions. We can check if 'quality_analysis' contains 'services_description'
            // .not('quality_analysis->>services_description', 'is', null) // Syntax might vary
            // Simplest: Check in memory.
            .order('last_verified_at', { ascending: true })
            .limit(BATCH_SIZE);

        if (!batch || batch.length === 0) {
            // Fallback to ALL
            ({ data: batch, error } = await supabase
                .from('businesses')
                .select('*')
                .not('company_description', 'is', null)
                .order('last_verified_at', { ascending: true })
                .limit(BATCH_SIZE));
        }

        if (error || !batch || batch.length === 0) {
            console.log('✅ No businesses need enhancement. Waiting 1 min...');
            await new Promise(r => setTimeout(r, 60000));
            continue;
        }

        // Filter in memory: Skip if we already have a specialized services description
        // (Unless we want to re-run based on user request "updates old ones")
        // User asked to "go over old firms". So we should process them if they lack this field.
        const realBatch = batch.filter((b: any) => {
            const qa = b.quality_analysis || {};
            return !qa.services_description;
        });

        if (realBatch.length === 0) {
            console.log('⏳ Batch filtered out (already processed). Sleeping...');
            // We need to update existing rows to prevent infinite loop of fetching same rows
            // Hack: Update their 'updated_at' essentially.
            // Or better: ensure the loop progresses.
            // If we rely on 'last_verified_at', we should update it.
            // Let's just sleep short and hope order changes or update the timestamp for the skipped ones?
            // To be safe, let's process 1-2 anyway or use a distinct offset? No.
            // Let's just update their `last_verified_at` to now() to push them to end of queue.
            if (batch.length > 0) {
                const ids = batch.map((b: any) => b.id);
                await supabase.from('businesses').update({ last_verified_at: new Date().toISOString() }).in('id', ids);
            }
            await new Promise(r => setTimeout(r, 2000));
            continue;
        }

        console.log(`\n🎯 Processing batch of ${realBatch.length} businesses...`);

        for (const business of realBatch) {
            try {
                console.log(`  🔧 Enhancing: ${business.legal_name} (${business.country_code})`);

                // 1. Generate Split Content
                const generated = await generateEnhancedContent(business);
                if (!generated || !generated.description) {
                    console.log('     ⚠️ Failed to generate content.');
                    continue;
                }

                const { description: mainDescEn, services: servicesEn } = generated;

                // 2. Prepare Updates
                const qa = business.quality_analysis || {};
                const currentTranslations = business.translations || {};
                const updatedTranslations: any = { ...currentTranslations };

                // Update English
                // Store main description in column
                // Store services in QA
                const updatedQA = {
                    ...qa,
                    services_description: servicesEn
                };

                // Ensure English specific translation block exists
                updatedTranslations['en'] = {
                    ...(updatedTranslations['en'] || {}),
                    company_description: mainDescEn,
                    services_description: servicesEn
                };

                // 3. Process Other Languages
                for (const lang of LANGUAGES) {
                    if (lang === 'en') continue;

                    // If existing translation for description exists, UPDATE it with new main desc + translate services
                    // Logic: We are rewriting the main description, so we MUST re-translate it to keep sync.

                    if (updatedTranslations[lang]?.company_description || true) { // Always for core languages?
                        // Let's stick to: if we have EN data, we try to provide translations for supported langs 
                        // if the business is relevant? 
                        // Revert to: if translation existed, update it.
                        if (updatedTranslations[lang] || lang === 'no') { // Always do Norwegian + existing

                            // Initialize content obj if needed
                            if (!updatedTranslations[lang]) updatedTranslations[lang] = {};

                            const tMain = await translateText(mainDescEn, 'en', lang);
                            const tServices = await translateText(servicesEn, 'en', lang);

                            updatedTranslations[lang].company_description = tMain;
                            updatedTranslations[lang].services_description = tServices;
                        }
                    }
                }

                // 4. Save to DB
                // Note: We deliberately overwrite company_description with the clean version (without appended services)
                const { error: updateError } = await supabase
                    .from('businesses')
                    .update({
                        company_description: mainDescEn,
                        quality_analysis: updatedQA,
                        translations: updatedTranslations,
                        last_verified_at: new Date().toISOString() // Touch generic timestamp
                    })
                    .eq('id', business.id);

                if (updateError) throw updateError;
                console.log('     ✅ Updated (Split fields).');

                // Rate limit
                await new Promise(r => setTimeout(r, 2000));

            } catch (err: any) {
                console.error(`     ❌ Error: ${err.message}`);
            }
        }

        console.log('💤 Batch complete. Sleeping 5s...');
        await new Promise(r => setTimeout(r, 5000));
    }
}

// Run if called directly
if (require.main === module) {
    runEnhancer().catch(console.error);
}
