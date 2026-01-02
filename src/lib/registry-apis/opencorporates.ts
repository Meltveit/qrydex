
export interface OpenCorporatesCompany {
    name: string;
    jurisdiction_code: string; // e.g., "us_ca"
    company_number: string;
    incorporation_date: string;
    company_type: string;
    registered_address_in_full: string;
    current_status: string;
    registry_url: string;
}

/**
 * Verify a US company via OpenCorporates API
 * @param state - US state code (e.g., "CA", "DE", "TX")
 * @param companyNumber - State company ID
 */
export async function verifyUSCompany(
    state: string,
    companyNumber: string
): Promise<{ success: boolean; data?: OpenCorporatesCompany }> {
    const jurisdictionCode = `us_${state.toLowerCase()}`;

    // Rate limit warning: Free tier allows limited requests
    // Ideally we should cache this or use a queue

    try {
        console.log(`🔍 Verifying US Company: ${jurisdictionCode}/${companyNumber} via OpenCorporates...`);
        const response = await fetch(
            `https://api.opencorporates.com/v0.4/companies/${jurisdictionCode}/${companyNumber}`
        );

        if (response.status === 404) {
            console.log(`❌ Company not found in OpenCorporates: ${companyNumber}`);
            return { success: false };
        }

        if (!response.ok) {
            console.error(`❌ OpenCorporates API error: ${response.statusText}`);
            return { success: false };
        }

        const data = await response.json();
        return {
            success: true,
            data: data.results.company
        };
    } catch (error: any) {
        console.error(`❌ OpenCorporates network error:`, error.message);
        return { success: false };
    }
}

/**
 * Search for US company by name (fallback if no ID)
 * Useful for finding the ID if we only have the name
 */
export async function searchUSCompany(
    companyName: string,
    state?: string
): Promise<{ success: boolean; data?: OpenCorporatesCompany }> {
    try {
        const jurisdiction = state ? `us_${state.toLowerCase()}` : 'us';
        const params = new URLSearchParams({
            q: companyName,
            jurisdiction_code: jurisdiction,
            per_page: '1'
        });

        const response = await fetch(
            `https://api.opencorporates.com/v0.4/companies/search?${params}`
        );

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();
        if (data.results.companies && data.results.companies.length > 0) {
            return {
                success: true,
                data: data.results.companies[0].company
            };
        }

        return { success: false };
    } catch (error) {
        return { success: false };
    }
}
/**
 * Bulk search for companies (for importing new companies)
 * @param query - Search term (e.g. "Technology")
 * @param jurisdiction - Jurisdiction code (e.g. "us_de")
 * @param page - Page number (default 1)
 */
export async function searchCompaniesBulk(
    query: string,
    jurisdiction: string = 'us',
    page: number = 1
): Promise<{ success: boolean; companies: OpenCorporatesCompany[]; total_pages: number }> {
    try {
        const params = new URLSearchParams({
            q: query,
            jurisdiction_code: jurisdiction,
            per_page: '30', // Max per page often 30-50 for free
            page: page.toString()
        });

        // Add API Key if available
        const apiKey = process.env.OPENCORPORATES_API_KEY;
        if (apiKey) {
            params.append('api_token', apiKey);
        }

        console.log(`🔍 Bulk Search OpenCorporates: "${query}" in ${jurisdiction} (Page ${page})...`);
        const response = await fetch(
            `https://api.opencorporates.com/v0.4/companies/search?${params}`
        );

        if (!response.ok) {
            console.error(`❌ OpenCorporates API error: ${response.status} ${response.statusText}`);
            return { success: false, companies: [], total_pages: 0 };
        }

        const data = await response.json();
        const companies = (data.results.companies || []).map((c: any) => c.company);

        return {
            success: true,
            companies: companies,
            total_pages: data.results.total_pages || 0
        };
    } catch (error: any) {
        console.error(`❌ OpenCorporates network error:`, error.message);
        return { success: false, companies: [], total_pages: 0 };
    }
}
