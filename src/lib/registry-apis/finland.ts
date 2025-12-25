import type { RegistryData } from '@/types/database';

interface YTJResponse {
    results: Array<{
        businessId: string;
        name: string;
        registrationDate: string;
        companyForm: string;
        detailsUri: string;
        addresses?: Array<{
            street: string;
            city: string;
            postCode: string;
        }>;
    }>;
}

/**
 * Search Finland's PRH / YTJ registry (Open Data)
 * API Docs: http://avoindata.prh.fi/bis/v1/
 */
export async function searchFinlandRegistry(query: string): Promise<RegistryData | null> {
    try {
        // Support search by Name or Business ID
        // Determine if query is ID-like (1234567-8)
        const isId = /^\d{7}-\d$/.test(query);

        let url = '';
        if (isId) {
            url = `http://avoindata.prh.fi/bis/v1/${query}`;
        } else {
            url = `http://avoindata.prh.fi/bis/v1?totalResults=false&maxResults=1&resultsFrom=0&name=${encodeURIComponent(query)}`;
        }

        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();
        const result = isId ? data : data.results?.[0];

        if (!result) return null;

        // Note: For ID lookups, data structure might slightly differ, 
        // but often consistent enough for name extraction.
        // Full details require mapping more complex fields.

        // Handling address is tricky in YTJ list response, sometimes separate.
        // We use what we have.

        // Registration Date format likely YYYY-MM-DD

        return {
            org_nr: result.businessId,
            legal_name: result.name,

            registration_date: result.registrationDate,
            company_status: 'Active', // Default
            last_verified_registry: new Date().toISOString(),
            // Address logic is complex in YTJ, requires separate fetch or parsing 'addresses' array if present
            registered_address: result.addresses?.[0] ? `${result.addresses[0].street}, ${result.addresses[0].city}` : undefined
        };

    } catch (e) {
        console.error('Finland Registry Error:', e);
        return null;
    }
}
