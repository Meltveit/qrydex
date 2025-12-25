import type { RegistryData } from '@/types/database';

interface CVRResponse {
    vat: number;
    name: string;
    address: string;
    zipcode: string;
    city: string;
    startdate: string;
    employees: number;
    industrycode: number;
    industrydesc: string;
    companycodetitle: string;
    cvruid: string;
    error?: string;
}

/**
 * Search Denmark's CVR registry via cvrapi.dk (Unofficial but reliable gateway)
 */
export async function searchDenmarkRegistry(query: string): Promise<RegistryData | null> {
    try {
        // search param can be VAT number (8 digits) or name
        // cvrapi.dk is free for low volume
        const response = await fetch(`https://cvrapi.dk/api?search=${encodeURIComponent(query)}&country=dk`, {
            headers: {
                'User-Agent': 'Qrydex/1.0 (Business Verification Platform)'
            }
        });

        if (!response.ok) return null;

        const data = await response.json() as CVRResponse;

        if (data.error) return null;

        return {
            org_nr: data.vat.toString(),
            vat_number: `DK${data.vat}`,
            vat_status: 'Active', // Assuming active if returned properly
            company_status: 'Active', // Simplified assumption
            legal_name: data.name,
            registered_address: `${data.address}, ${data.zipcode} ${data.city}`,
            registration_date: data.startdate, // Format: dd/mm/yyyy usually, checking format needed
            industry_codes: [data.industrycode.toString(), data.industrydesc],
            employee_count: data.employees,
            last_verified_registry: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error fetching from CVR API:', error);
        return null;
    }
}
