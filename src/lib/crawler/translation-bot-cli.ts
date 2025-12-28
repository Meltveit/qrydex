/**
 * Translation Bot
 * Automatically translates business data to all supported languages
 * 
 * Languages: Norwegian (no), Swedish (sv), Danish (da), Finnish (fi), German (de), French (fr), Spanish (es), English (en)
 */

import { createServerClient } from '../supabase';
import { generateText } from '../ai/gemini-client';

// ALL supported languages for maximum SEO reach
const LANGUAGES = [
    'no',  // Norwegian (Norsk)
    'sv',  // Swedish (Svenska)
    'da',  // Danish (Dansk)
    'fi',  // Finnish (Suomi)
    'en',  // English (Global SEO)
    'de',  // German (Deutsch)
    'fr',  // French (Français)
    'es'   // Spanish (Español)
];

interface TranslationTask {
    businessId: string;
    sourceLanguage: string;
    sourceData: {
        company_description?: string;
        services?: string[];
        products?: string[];
        industry_text?: string;
    };
}

/**
 * Translate text using Gemini
 */
async function translateText(
    text: string,
    fromLang: string,
    toLang: string
): Promise<string> {
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

    const prompt = `Translate this business text from ${langNames[fromLang]} to ${langNames[toLang]}.

Maintain professional tone and business terminology. Return ONLY the translation, no explanations.

Text to translate:
${text}

Translation:`;

    const translation = await generateText(prompt);
    return translation?.trim() || text;
}

/**
 * Translate business data to all languages
 */
export async function translateBusiness(task: TranslationTask): Promise<boolean> {
    const supabase = createServerClient();
    console.log(`  🌍 Translating business ${task.businessId}...`);

    const translations: Record<string, any> = {};

    try {
        // Translate company description
        if (task.sourceData.company_description) {
            for (const lang of LANGUAGES) {
                if (lang === task.sourceLanguage) {
                    translations[lang] = {
                        company_description: task.sourceData.company_description
                    };
                } else {
                    const translated = await translateText(
                        task.sourceData.company_description,
                        task.sourceLanguage,
                        lang
                    );

                    translations[lang] = {
                        company_description: translated
                    };

                    // Rate limiting (reduced for faster processing)
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        // Translate services
        if (task.sourceData.services && task.sourceData.services.length > 0) {
            for (const lang of LANGUAGES) {
                if (!translations[lang]) translations[lang] = {};

                if (lang === task.sourceLanguage) {
                    translations[lang].services = task.sourceData.services;
                } else {
                    const translatedServices = [];
                    for (const service of task.sourceData.services.slice(0, 5)) { // Limit to 5
                        const translated = await translateText(service, task.sourceLanguage, lang);
                        translatedServices.push(translated);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    translations[lang].services = translatedServices;
                }
            }
        }

        // Translate Industry Text
        if (task.sourceData.industry_text) {
            for (const lang of LANGUAGES) {
                if (!translations[lang]) translations[lang] = {};

                if (lang === task.sourceLanguage) {
                    translations[lang].industry_text = task.sourceData.industry_text;
                } else {
                    const translated = await translateText(
                        task.sourceData.industry_text,
                        task.sourceLanguage,
                        lang
                    );
                    translations[lang].industry_text = translated;
                    // Extended delay for rate limiting (reduced)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        // Update database with translations
        await supabase
            .from('businesses')
            .update({ translations })
            .eq('id', task.businessId);

        console.log(`  ✅ Translated to ${LANGUAGES.length} languages`);
        return true;
    } catch (error: any) {
        console.error(`  ❌ Translation error:`, error.message);
        return false;
    }
}

// CLI execution - RUNS CONTINUOUSLY
if (require.main === module) {
    console.log('🌍 Translation Bot - CONTINUOUS MODE');
    console.log('   Continuously translating business data');
    console.log('   Press Ctrl+C to stop\n');

    let cycleCount = 0;

    async function runContinuously() {
        const supabase = createServerClient();

        // eslint-disable-next-line no-constant-condition
        while (true) {
            cycleCount++;
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔄 CYCLE ${cycleCount} - ${new Date().toLocaleString()}`);
            console.log(`${'='.repeat(60)}\n`);

            try {
                // Find businesses needing translation (have data but no translations OR incomplete translations)
                // Priority: High Trust Score -> Recently Scraped -> Has content
                const { data: rawBusinesses, count } = await supabase
                    .from('businesses')
                    .select('id, company_description, services, products, country_code, industry_code, quality_analysis, translations', { count: 'exact' })
                    .not('company_description', 'is', null)
                    .order('trust_score', { ascending: false, nullsFirst: false }) // Prioritize trusted businesses
                    .limit(50); // Process larger batch to filter

                // Filter in-memory for quality content and missing/incomplete translations
                const businesses = (rawBusinesses || []).filter(b => {
                    // MUST have description > 50 chars to be worth translating
                    if (!b.company_description || b.company_description.length < 50) return false;

                    // Check if translations are missing or incomplete
                    if (!b.translations) return true; // No translations at all

                    const translations = b.translations as Record<string, any>;
                    // Check if empty object
                    if (Object.keys(translations).length === 0) return true;

                    // Check if all required languages are present and have descriptions
                    const requiredLanguages = ['no', 'sv', 'da', 'fi', 'en', 'de', 'fr', 'es'];
                    for (const lang of requiredLanguages) {
                        if (!translations[lang] || !translations[lang].company_description) {
                            return true; // Missing language or incomplete
                        }
                    }

                    return false; // Has complete translations
                }).slice(0, 3); // Take top 3 valid ones per cycle

                if (!businesses || businesses.length === 0) {
                    console.log('✅ All businesses translated! Waiting for new data...');
                } else {
                    console.log(`Found ${count} businesses needing translation`);
                    console.log(`Processing ${businesses.length} in this cycle...\n`);

                    for (const business of businesses) {
                        try {
                            // Determine source language based on country
                            const langMap: Record<string, string> = {
                                'NO': 'no',
                                'SE': 'sv',
                                'DK': 'da',
                                'FI': 'fi',
                                'DE': 'de', // Updated: German is German
                                'FR': 'fr', // Updated: French is French
                                'GB': 'en',
                                'US': 'en',
                                'ES': 'es'
                            };

                            // Determine source language based on detected language (priority) or country
                            const detected = (business.quality_analysis as any)?.detected_language;
                            const sourceLanguage = detected ? detected.substring(0, 2) : (langMap[business.country_code] || 'en');

                            // Extract just the text part of industry code if it follows format "Code: Text"
                            // e.g. "52.260: Andre støttetjenester..." -> "Andre støttetjenester..."
                            let industryTextToTranslate = business.industry_code;
                            if (business.industry_code && business.industry_code.includes(':')) {
                                industryTextToTranslate = business.industry_code.split(':')[1].trim();
                            }

                            const task: TranslationTask = {
                                businessId: business.id,
                                sourceLanguage,
                                sourceData: {
                                    company_description: business.company_description,
                                    services: business.services as string[],
                                    products: business.products as string[],
                                    industry_text: industryTextToTranslate // New field
                                }
                            };

                            await translateBusiness(task);

                            // Rate limiting between businesses (reduced for faster processing)
                            console.log('  ⏳ Cooling down (30s)...');
                            await new Promise(resolve => setTimeout(resolve, 30000));

                        } catch (error: any) {
                            console.error(`  ❌ Error processing ${business.id}:`, error.message);
                        }
                    }
                }

                console.log('\n⏱️  Sleeping 5 minutes before next cycle...');
                await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // 5 min

            } catch (err: any) {
                console.error('❌ Error in cycle:', err.message);
                console.log('   Retrying in 5 minutes...');
                await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
            }
        }
    }

    runContinuously().catch((err) => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
}
