/**
 * UK Companies House API Integration
 * https://developer.company-information.service.gov.uk/
 */

import type { RegistryData } from '@/types/database';

const COMPANIES_HOUSE_API = 'https://api.company-information.service.gov.uk';

interface CompaniesHouseCompany {
    company_number: string;
    company_name: string;
    company_status: string;
    type: string;
    date_of_creation?: string;
    registered_office_address?: {
        address_line_1?: string;
        address_line_2?: string;
        locality?: string;
        region?: string;
        postal_code?: string;
        country?: string;
    };
    sic_codes?: string[];
    has_charges?: boolean;
    has_insolvency_history?: boolean;
}

export async function lookupCompaniesHouse(companyNumber: string): Promise<RegistryData | null> {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;

    if (!apiKey) {
        console.error('Companies House API key not configured');
        return null;
    }

    try {
        // Pad company number to 8 digits
        const paddedNumber = companyNumber.padStart(8, '0');

        const response = await fetch(
            `${COMPANIES_HOUSE_API}/company/${paddedNumber}`,
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
                    'Accept': 'application/json',
                },
                next: { revalidate: 86400 }
            }
        );

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Companies House API error: ${response.status}`);
        }

        const data: CompaniesHouseCompany = await response.json();

        // Map company status
        let companyStatus: 'Active' | 'Dissolved' | 'Liquidation' | 'Unknown' = 'Unknown';
        switch (data.company_status) {
            case 'active':
                companyStatus = 'Active';
                break;
            case 'dissolved':
                companyStatus = 'Dissolved';
                break;
            case 'liquidation':
            case 'receivership':
            case 'administration':
            case 'voluntary-arrangement':
            case 'insolvency-proceedings':
                companyStatus = 'Liquidation';
                break;
        }

        // Build address
        const addr = data.registered_office_address;
        const address = addr
            ? [
                addr.address_line_1,
                addr.address_line_2,
                addr.locality,
                addr.region,
                addr.postal_code,
                addr.country
            ].filter(Boolean).join(', ')
            : undefined;

        const registryData: RegistryData = {
            org_nr: data.company_number,
            last_verified_registry: new Date().toISOString(),
            legal_name: data.company_name,
            registered_address: address,
            registration_date: data.date_of_creation,
            company_status: companyStatus,
            industry_codes: data.sic_codes,
        };

        return registryData;
    } catch (error) {
        console.error('Error fetching from Companies House:', error);
        return null;
    }
}

export async function searchCompaniesHouse(query: string, limit = 10): Promise<CompaniesHouseCompany[]> {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;

    if (!apiKey) {
        return [];
    }

    try {
        const params = new URLSearchParams({
            q: query,
            items_per_page: limit.toString(),
        });

        const response = await fetch(
            `${COMPANIES_HOUSE_API}/search/companies?${params}`,
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
                    'Accept': 'application/json',
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Companies House API error: ${response.status}`);
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Error searching Companies House:', error);
        return [];
    }
}
