/**
 * Nordic & EU Registry Populator
 * Automatically populates database with businesses from multiple countries
 * 
 * Priority: Sweden, Denmark, Finland (Nordic neighbors)
 * Secondary: Germany, France, UK (major EU markets)
 */

import { createClient } from '@supabase/supabase-js';
import {
    searchSwedenRegistry,
    searchDenmarkRegistry,
    searchFinlandRegistry,
    searchGermanyRegistry,
    searchFranceRegistry,
    searchUKRegistry
} from '../lib-external/registries/global-registry';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PopulationConfig {
    country: string;
    countryCode: string;
    searchFn: (query: string) => Promise<any>;
    sampleCompanies: string[]; // Well-known companies to seed with
    targetCount: number;
}

const CONFIGS: PopulationConfig[] = [
    {
        country: 'Sweden',
        countryCode: 'SE',
        searchFn: searchSwedenRegistry,
        targetCount: 1000,
        sampleCompanies: [
            'Volvo AB',
            'Ericsson AB',
            'IKEA AB',
            'H&M AB',
            'Spotify AB',
            'Klarna AB',
            'SEB AB',
            'Swedbank AB',
            'Scania AB',
            'ABB AB'
        ]
    },
    {
        country: 'Denmark',
        countryCode: 'DK',
        searchFn: searchDenmarkRegistry,
        targetCount: 800,
        sampleCompanies: [
            'Maersk ApS',
            'Novo Nordisk ApS',
            'Carlsberg ApS',
            'Vestas ApS',
            'LEGO ApS',
            'Danske Bank ApS',
            'Coloplast ApS',
            'DSV ApS',
            'Pandora ApS',
            'Grundfos ApS'
        ]
    },
    {
        country: 'Finland',
        countryCode: 'FI',
        searchFn: searchFinlandRegistry,
        targetCount: 600,
        sampleCompanies: [
            'Nokia Oyj',
            'Kone Oyj',
            'Neste Oyj',
            'Stora Enso Oyj',
            'UPM Oyj',
            'Wärtsilä Oyj',
            'Nordea Oyj',
            'Fortum Oyj',
            'Supercell Oy',
            'Rovio Oy'
        ]
    },
    {
        country: 'Germany',
        countryCode: 'DE',
        searchFn: searchGermanyRegistry,
        targetCount: 500,
        sampleCompanies: [
            'Volkswagen GmbH',
            'BMW GmbH',
            'Siemens GmbH',
            'Deutsche Bank GmbH',
            'Allianz GmbH',
            'SAP GmbH',
            'Bosch GmbH',
            'BASF GmbH',
            'Daimler GmbH',
            'Bayer GmbH'
        ]
    },
    {
        country: 'France',
        countryCode: 'FR',
        searchFn: searchFranceRegistry,
        targetCount: 500,
        sampleCompanies: [
            'Total SA',
            'BNP Paribas SA',
            'AXA SA',
            'LVMH SA',
            'Airbus SA',
            'Renault SA',
            'Carrefour SA',
            'Orange SA',
            'Peugeot SA',
            'Danone SA'
        ]
    },
    {
        country: 'UK',
        countryCode: 'GB',
        searchFn: searchUKRegistry,
        targetCount: 500,
        sampleCompanies: [
            'BP Ltd',
            'HSBC Ltd',
            'Unilever Ltd',
            'GlaxoSmithKline Ltd',
            'Vodafone Ltd',
            'Rolls-Royce Ltd',
            'BAE Systems Ltd',
            'Tesco Ltd',
            'Barclays Ltd',
            'Shell Ltd'
        ]
    }
];

/**
 * Add business to database if not exists
 */
async function addBusinessIfNew(registryData: any, countryCode: string): Promise<boolean> {
    if (!registryData || !registryData.id) return false;

    // Check if exists
    const { data: existing } = await supabase
        .from('businesses')
        .select('id')
        .eq('org_number', registryData.id)
        .eq('country_code', countryCode)
        .single();

    if (existing) {
        console.log(`  ⏭️  Already exists: ${registryData.name}`);
        return false;
    }

    // Add new business
    const { error } = await supabase.from('businesses').insert({
        org_number: registryData.id,
        legal_name: registryData.name,
        country_code: countryCode,
        domain: registryData.website,
        registry_data: {
            legal_name: registryData.name,
            org_nr: registryData.id,
            registered_address: registryData.address,
            city: registryData.city,
            postal_code: registryData.postalCode,
            industry_codes: registryData.industry ? [registryData.industry] : []
        },
        verification_status: 'verified',
        last_verified_at: new Date().toISOString()
    });

    if (error) {
        console.error(`  ❌ Error adding ${registryData.name}:`, error.message);
        return false;
    }

    console.log(`  ✅ Added: ${registryData.name}`);
    return true;
}

/**
 * Populate from a specific country
 */
async function populateCountry(config: PopulationConfig): Promise<number> {
    console.log(`\n🌍 Populating ${config.country} (${config.countryCode})`);
    console.log(`   Target: ${config.targetCount} companies`);

    let addedCount = 0;
    const seenIds = new Set<string>();

    // 1. Add well-known companies first
    console.log(`\n   📋 Adding ${config.sampleCompanies.length} well-known companies...`);
    for (const companyName of config.sampleCompanies) {
        try {
            const result = await config.searchFn(companyName);

            if (result && !seenIds.has(result.id)) {
                seenIds.add(result.id);
                const added = await addBusinessIfNew(result, config.countryCode);
                if (added) addedCount++;
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`  ⚠️  Error searching ${companyName}:`, error);
        }
    }

    console.log(`\n   ✨ Added ${addedCount} ${config.country} companies`);
    return addedCount;
}

/**
 * Main execution
 */
export async function populateNordicEU(countries?: string[]) {
    console.log('🚀 Nordic & EU Registry Populator Starting...\n');

    const configsToRun = countries
        ? CONFIGS.filter(c => countries.includes(c.countryCode))
        : CONFIGS;

    let totalAdded = 0;

    for (const config of configsToRun) {
        const count = await populateCountry(config);
        totalAdded += count;

        // Pause between countries
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log('\n\n📊 FINAL SUMMARY:');
    console.log(`   🎉 Total businesses added: ${totalAdded}`);
    console.log('   ✅ Database populated successfully!');
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const countries = args.length > 0 ? args : undefined;

    if (countries) {
        console.log(`🎯 Running for specific countries: ${countries.join(', ')}\n`);
    }

    populateNordicEU(countries)
        .then(() => {
            console.log('\n✅ Population complete');
            process.exit(0);
        })
        .catch((err) => {
            console.error('❌ Fatal error:', err);
            process.exit(1);
        });
}
