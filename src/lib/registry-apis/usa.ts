/**
 * USA Business Registry Integration
 * Combines SEC EDGAR for public companies and state registries via OpenCorporates
 */

import type { RegistryData } from '@/types/database';

// SEC EDGAR API for public companies
const SEC_API_BASE = 'https://data.sec.gov';
const OPENCORPORATES_API = 'https://api.opencorporates.com/v0.4';

interface SecCompany {
    cik: string;
    entityType: string;
    sic: string;
    sicDescription: string;
    name: string;
    tickers?: string[];
    exchanges?: string[];
    stateOfIncorporation?: string;
    fiscalYearEnd?: string;
}

interface OpenCorporatesCompany {
    company: {
        name: string;
        company_number: string;
        jurisdiction_code: string;
        incorporation_date?: string;
        dissolution_date?: string;
        company_type?: string;
        registry_url?: string;
        branch_status?: string;
        current_status?: string;
        registered_address?: {
            street_address?: string;
            locality?: string;
            region?: string;
            postal_code?: string;
            country?: string;
        };
        industry_codes?: Array<{
            code: string;
            description: string;
        }>;
    };
}

/**
 * Look up public companies via SEC EDGAR
 */
export async function lookupSecEdgar(cikOrTicker: string): Promise<RegistryData | null> {
    try {
        // Pad CIK to 10 digits if it's numeric
        const isNumeric = /^\d+$/.test(cikOrTicker);
        const searchValue = isNumeric ? cikOrTicker.padStart(10, '0') : cikOrTicker.toUpperCase();

        // First try company tickers API
        const response = await fetch(
            `${SEC_API_BASE}/submissions/CIK${searchValue}.json`,
            {
                headers: {
                    'User-Agent': 'Qrydex/1.0 (contact@qrydex.com)',
                    'Accept': 'application/json',
                },
                next: { revalidate: 86400 }
            }
        );

        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`SEC API error: ${response.status}`);
        }

        const data = await response.json();

        const registryData: RegistryData = {
            org_nr: data.cik,
            last_verified_registry: new Date().toISOString(),
            legal_name: data.name,
            company_status: 'Active',
            industry_codes: data.sic ? [`${data.sic}: ${data.sicDescription || 'Unknown'}`] : [],
        };

        return registryData;
    } catch (error) {
        console.error('Error fetching from SEC EDGAR:', error);
        return null;
    }
}

/**
 * Look up US state business registrations via OpenCorporates
 * Requires API key for production use
 */
export async function lookupUsStateRegistry(
    companyNumber: string,
    stateCode: string
): Promise<RegistryData | null> {
    const apiKey = process.env.OPENCORPORATES_API_KEY;

    try {
        const jurisdictionCode = `us_${stateCode.toLowerCase()}`;

        const url = apiKey
            ? `${OPENCORPORATES_API}/companies/${jurisdictionCode}/${companyNumber}?api_token=${apiKey}`
            : `${OPENCORPORATES_API}/companies/${jurisdictionCode}/${companyNumber}`;

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
            },
            next: { revalidate: 86400 }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`OpenCorporates API error: ${response.status}`);
        }

        const data: OpenCorporatesCompany = await response.json();
        const company = data.company;

        // Map status
        let companyStatus: 'Active' | 'Dissolved' | 'Liquidation' | 'Unknown' = 'Unknown';
        const status = company.current_status?.toLowerCase();
        if (status?.includes('active') || status?.includes('good standing')) {
            companyStatus = 'Active';
        } else if (status?.includes('dissolved') || status?.includes('inactive')) {
            companyStatus = 'Dissolved';
        }

        // Build address
        const addr = company.registered_address;
        const address = addr
            ? [
                addr.street_address,
                addr.locality,
                addr.region,
                addr.postal_code,
                addr.country
            ].filter(Boolean).join(', ')
            : undefined;

        const registryData: RegistryData = {
            org_nr: company.company_number,
            last_verified_registry: new Date().toISOString(),
            legal_name: company.name,
            registered_address: address,
            registration_date: company.incorporation_date,
            company_status: companyStatus,
            industry_codes: company.industry_codes?.map(ic => `${ic.code}: ${ic.description}`),
        };

        return registryData;
    } catch (error) {
        console.error('Error fetching from OpenCorporates:', error);
        return null;
    }
}

/**
 * Search US companies via OpenCorporates
 */
export async function searchUsCompanies(query: string, limit = 10): Promise<OpenCorporatesCompany['company'][]> {
    try {
        const params = new URLSearchParams({
            q: query,
            jurisdiction_code: 'us',
            per_page: limit.toString(),
        });

        const response = await fetch(
            `${OPENCORPORATES_API}/companies/search?${params}`,
            {
                headers: {
                    'Accept': 'application/json',
                }
            }
        );

        if (!response.ok) {
            throw new Error(`OpenCorporates API error: ${response.status}`);
        }

        const data = await response.json();
        return data.results?.companies?.map((c: OpenCorporatesCompany) => c.company) || [];
    } catch (error) {
        console.error('Error searching OpenCorporates:', error);
        return [];
    }
}
