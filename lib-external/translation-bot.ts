/**
 * Translation Bot
 * Automatically translates business data to all supported languages
 * 
 * Languages: Norwegian (no), Swedish (sv), Danish (da), Finnish (fi)
 */

import { createClient } from '@supabase/supabase-js';
import { generateText } from '../src/lib/ai/gemini-client';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
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
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                    translations[lang].services = translatedServices;
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

/**
 * Batch translate businesses without translations
 */
export async function translateMissingBusinesses(limit = 50): Promise<number> {
    console.log('🌍 Translation Bot Starting...\n');

    // Find businesses needing translation (have data but no translations)
    const { data: businesses } = await supabase
        .from('businesses')
        .select('id, company_description, services, products, country_code')
        .not('company_description', 'is', null)
        .is('translations', null)
        .limit(limit);

    if (!businesses || businesses.length === 0) {
        console.log('✅ All businesses already translated!');
        return 0;
    }

    console.log(`Found ${businesses.length} businesses needing translation\n`);

    let successCount = 0;

    for (const business of businesses) {
        // Determine source language based on country
        const langMap: Record<string, string> = {
            'NO': 'no',
            'SE': 'sv',
            'DK': 'da',
            'FI': 'fi',
            'DE': 'en', // Default to English for non-Nordic
            'FR': 'en',
            'GB': 'en',
            'US': 'en'
        };

        const sourceLanguage = langMap[business.country_code] || 'no';

        const task: TranslationTask = {
            businessId: business.id,
            sourceLanguage,
            sourceData: {
                company_description: business.company_description,
                services: business.services as string[],
                products: business.products as string[]
            }
        };

        const success = await translateBusiness(task);
        if (success) successCount++;
    }

    console.log(`\n📊 Translation Summary:`);
    console.log(`   ✅ Translated: ${successCount}/${businesses.length}`);
    console.log(`   📈 Success rate: ${((successCount / businesses.length) * 100).toFixed(1)}%`);

    return successCount;
}
