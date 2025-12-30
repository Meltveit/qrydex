/**
 * Unified Registry Service
 * Routes verification requests to the appropriate registry based on country
 */

import type { RegistryData } from '@/types/database';
import { lookupBrregEnhet } from './bronnoy';
import { validateVatNumber, isEUCountry } from './vies';
import { lookupCompaniesHouse } from './companies-house';
import { lookupSecEdgar, lookupUsStateRegistry } from './usa';
import { searchDenmarkRegistry } from './denmark';
import { searchFinlandRegistry } from './finland';
import { searchSwedenRegistry } from './sweden';
import { verifyUSCompany } from './opencorporates';

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

        // Denmark - CVR
        if (country === 'DK') {
            const data = await searchDenmarkRegistry(identifier);
            return {
                success: data !== null,
                data,
                source: 'CVR (cvrapi.dk)',
            };
        }

        // Finland - PRH / YTJ
        if (country === 'FI') {
            const data = await searchFinlandRegistry(identifier);
            return {
                success: data !== null,
                data,
                source: 'YTJ (PRH)',
            };
        }

        // Sweden - Bolagsverket (Placeholder)
        if (country === 'SE') {
            const data = await searchSwedenRegistry(identifier);
            if (data) {
                return {
                    success: true,
                    data,
                    source: 'Bolagsverket (Mock)',
                };
            }
            // Fallback to VIES for Sweden if mock returns null (which it does currently)
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

        // USA - SEC EDGAR, OpenCorporates or State Registry
        if (country === 'US') {
            // Logic:
            // 1. If we have a state code in the identifier (US-CA-12345), use OpenCorporates for state
            // 2. If options.stateCode provided, use OpenCorporates
            // 3. Fallback to SEC Edgar (public companies)

            // Check for composed ID: US-STATE-NUMBER
            const parts = identifier.split('-');
            if (parts.length >= 3 && parts[0] === 'US') {
                const state = parts[1];
                const number = parts.slice(2).join('-');

                const { success, data: ocData } = await verifyUSCompany(state, number);
                if (success && ocData) {
                    return {
                        success: true,
                        data: {
                            legal_name: ocData.name,
                            org_nr: identifier,
                            country_code: 'US',
                            company_status: ocData.current_status === 'Active' ? 'Active' : 'Inactive',
                            registered_address: ocData.registered_address_in_full,
                            company_type: ocData.company_type,
                            established_date: ocData.incorporation_date,
                            last_verified_registry: new Date().toISOString(),
                            source_url: ocData.registry_url
                        },
                        source: 'OpenCorporates',
                    };
                }
            }

            // Try OpenCorporates if state provided in options
            if (options?.stateCode) {
                const { success, data: ocData } = await verifyUSCompany(options.stateCode, identifier);
                if (success && ocData) {
                    return {
                        success: true,
                        data: {
                            legal_name: ocData.name,
                            org_nr: identifier,
                            country_code: 'US',
                            company_status: ocData.current_status === 'Active' ? 'Active' : 'Inactive',
                            registered_address: ocData.registered_address_in_full,
                            company_type: ocData.company_type,
                            established_date: ocData.incorporation_date,
                            last_verified_registry: new Date().toISOString(),
                            source_url: ocData.registry_url
                        },
                        source: `OpenCorporates (${options.stateCode})`,
                    };
                }
            }

            // Try SEC first for public companies (fallback)
            let data = await lookupSecEdgar(identifier);
            if (data) {
                return {
                    success: true,
                    data,
                    source: 'SEC EDGAR',
                };
            }

            return {
                success: false,
                data: null,
                source: 'US Registries',
                error: 'Company not found in OpenCorporates or SEC. Ensure ID format is US-STATE-NUMBER or provide stateCode.',
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
