
import { createServerClient } from '@/lib/supabase';
import { generateText } from '@/lib/ai/gemini-client';

// Mock search function (Replace with SerperDev/Google API in production)
async function searchForDomain(companyName: string, orgNumber: string, country: string): Promise<string | null> {
    console.log(`🔍 Searching for domain: ${companyName} (${country})...`);

    // Heuristic: specific overrides for demo
    if (companyName.toLowerCase().includes('dnb')) return 'dnb.no';
    if (companyName.toLowerCase().includes('telenor')) return 'telenor.no';
    if (companyName.toLowerCase().includes('equinor')) return 'equinor.com';
    if (companyName.toLowerCase().includes('gjensidige')) return 'gjensidige.no';

    // In real implementation:
    // const results = await googleSearch(`${companyName} ${orgNumber} offisiell side`);
    // return results[0].link;

    return null;
}

async function runDiscoveryJob() {
    console.log('🕵️‍♂️ Starting Discovery Bot (Oppdageren)...');

    const supabase = createServerClient();

    // Find businesses without domain
    const { data: homelessBusinesses, error } = await supabase
        .from('businesses')
        .select('*')
        .is('domain', null)
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!homelessBusinesses || homelessBusinesses.length === 0) {
        console.log('No businesses missing domains.');
        return;
    }

    console.log(`Found ${homelessBusinesses.length} businesses without domain.`);

    let found = 0;

    for (const business of homelessBusinesses) {
        const domain = await searchForDomain(business.legal_name, business.org_number, business.country_code);

        if (domain) {
            console.log(`🎉 Found domain for ${business.legal_name}: ${domain}`);

            await supabase
                .from('businesses')
                .update({ domain: domain })
                .eq('id', business.id);

            found++;
        } else {
            console.log(`Searching failed for ${business.legal_name}`);
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n🕵️‍♂️ Discovery complete. Found ${found} new domains.`);
}

runDiscoveryJob();
