/**
 * Unified Registry Service
 * Routes verification requests to the appropriate registry based on country
 */

import type { RegistryData } from '@/types/database';
import { lookupBrregEnhet } from './bronnoy';
import { validateVatNumber, isEUCountry } from './vies';
import { lookupCompaniesHouse } from './companies-house';
import { lookupSecEdgar, lookupUsStateRegistry } from './usa';

export interface VerificationResult {
    success: boolean;
    data: RegistryData | null;
    source: string;
    error?: string;
}

/**
 * Verify a business based on country and identifier
 */
export async function verifyBusiness(
    identifier: string,
    countryCode: string,
    options?: {
        stateCode?: string; // For US state registrations
    }
): Promise<VerificationResult> {
    const country = countryCode.toUpperCase();

    try {
        // Norway - Brønnøysund
        if (country === 'NO') {
            const data = await lookupBrregEnhet(identifier);
            return {
                success: data !== null,
                data,
                source: 'Brønnøysundregistrene',
            };
        }

        // UK - Companies House
        if (country === 'GB' || country === 'UK') {
            const data = await lookupCompaniesHouse(identifier);
            return {
                success: data !== null,
                data,
                source: 'Companies House',
            };
        }

        // USA - SEC EDGAR or State Registry
        if (country === 'US') {
            // Try SEC first for public companies
            let data = await lookupSecEdgar(identifier);
            if (data) {
                return {
                    success: true,
                    data,
                    source: 'SEC EDGAR',
                };
            }

            // Try state registry if state code provided
            if (options?.stateCode) {
                data = await lookupUsStateRegistry(identifier, options.stateCode);
                return {
                    success: data !== null,
                    data,
                    source: `US State Registry (${options.stateCode})`,
                };
            }

            return {
                success: false,
                data: null,
                source: 'US Registries',
                error: 'Company not found in SEC. State code required for state registry lookup.',
            };
        }

        // EU countries - VIES VAT validation
        if (isEUCountry(country)) {
            // Prepend country code to identifier if not already present
            const vatNumber = identifier.startsWith(country)
                ? identifier
                : `${country}${identifier}`;

            const data = await validateVatNumber(vatNumber);
            return {
                success: data !== null && data.vat_status === 'Active',
                data,
                source: 'VIES (EU VAT)',
            };
        }

        // Fallback - OpenCorporates (handled in USA module but works globally)
        return {
            success: false,
            data: null,
            source: 'Unknown',
            error: `No registry integration available for country: ${country}`,
        };
    } catch (error) {
        console.error(`Error verifying business in ${country}:`, error);
        return {
            success: false,
            data: null,
            source: 'Error',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Calculate registry score component (0-40 points)
 */
export function calculateRegistryScore(data: RegistryData | null): number {
    if (!data) return 0;

    let score = 0;

    // Active registration: +30 points
    if (data.company_status === 'Active') {
        score += 30;
    } else if (data.company_status === 'Liquidation') {
        score += 10;
    }

    // VAT registered: +5 points
    if (data.vat_status === 'Active') {
        score += 5;
    }

    // Has recent verification: +5 points
    if (data.last_verified_registry) {
        const lastVerified = new Date(data.last_verified_registry);
        const daysSinceVerification = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceVerification < 30) {
            score += 5;
        }
    }

    return Math.min(score, 40);
}

export { lookupBrregEnhet } from './bronnoy';
export { validateVatNumber, isEUCountry } from './vies';
export { lookupCompaniesHouse } from './companies-house';
export { lookupSecEdgar, lookupUsStateRegistry } from './usa';
