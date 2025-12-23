/**
 * VIES VAT Validation API Integration
 * EU VAT Information Exchange System
 * https://ec.europa.eu/taxation_customs/vies/
 */

import type { RegistryData } from '@/types/database';

// VIES SOAP endpoint - we'll use a free REST wrapper or direct SOAP
const VIES_API_URL = 'https://ec.europa.eu/taxation_customs/vies/rest-api/ms';

interface ViesResponse {
    isValid: boolean;
    requestDate: string;
    userError?: string;
    name?: string;
    address?: string;
    requestIdentifier?: string;
    vatNumber: string;
    countryCode: string;
}

// EU country codes that use VIES
const EU_COUNTRY_CODES = [
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES',
    'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
    'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'XI' // XI = Northern Ireland
];

export function isEUCountry(countryCode: string): boolean {
    return EU_COUNTRY_CODES.includes(countryCode.toUpperCase());
}

export async function validateVatNumber(vatNumber: string): Promise<RegistryData | null> {
    try {
        // Extract country code and number
        const cleanVat = vatNumber.replace(/\s/g, '').toUpperCase();
        const countryCode = cleanVat.slice(0, 2);
        const number = cleanVat.slice(2);

        if (!isEUCountry(countryCode)) {
            console.error('Not an EU country code:', countryCode);
            return null;
        }

        // Greece uses 'EL' in VAT but 'GR' as ISO country code
        const viesCountryCode = countryCode === 'GR' ? 'EL' : countryCode;

        const response = await fetch(
            `${VIES_API_URL}/${viesCountryCode}/vat/${number}`,
            {
                headers: {
                    'Accept': 'application/json',
                },
                next: { revalidate: 86400 } // Cache for 24 hours
            }
        );

        if (!response.ok) {
            if (response.status === 400 || response.status === 404) {
                return null;
            }
            throw new Error(`VIES API error: ${response.status}`);
        }

        const data: ViesResponse = await response.json();

        if (!data.isValid) {
            return {
                org_nr: number,
                vat_number: cleanVat,
                vat_status: 'Inactive',
                last_verified_registry: new Date().toISOString(),
                company_status: 'Unknown',
            };
        }

        const registryData: RegistryData = {
            org_nr: number,
            vat_number: cleanVat,
            vat_status: 'Active',
            last_verified_registry: new Date().toISOString(),
            legal_name: data.name || undefined,
            registered_address: data.address || undefined,
            company_status: 'Active',
        };

        return registryData;
    } catch (error) {
        console.error('Error validating VAT with VIES:', error);
        return null;
    }
}

/**
 * Batch validate multiple VAT numbers
 */
export async function batchValidateVat(vatNumbers: string[]): Promise<Map<string, RegistryData | null>> {
    const results = new Map<string, RegistryData | null>();

    // VIES has rate limits, so we process sequentially with delays
    for (const vatNumber of vatNumbers) {
        results.set(vatNumber, await validateVatNumber(vatNumber));
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
}
