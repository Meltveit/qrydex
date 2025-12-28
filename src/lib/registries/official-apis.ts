/**
 * Official Public Registry APIs (No Authentication Required)
 * Sweden (Bolagsverket) and Finland (YTJ/PRH)
 */

export interface OfficialCompany {
    id: string;
    name: string;
    country: string;
    website?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    industry?: string;
    status?: string;
}

/**
 * Sweden - Bolagsverket Official Open Data API
 * Source: https://data.bolagsverket.se/
 * 100% Free, No API Key Required
 */
export async function crawlSwedenOfficialAPI(naceCode: string, limit: number = 50): Promise<OfficialCompany[]> {
    const companies: OfficialCompany[] = [];

    try {
        // Bolagsverket has SPARQL endpoint for open data
        // We can also use their company search API
        const apiUrl = `https://data.bolagsverket.se/api/bolagsverket/foretagsformer/json`;

        // Alternative: Use their CSV/JSON downloads filtered by SNI code
        // The open data portal provides bulk downloads we can query

        // For now, let's use a more direct approach via their search
        const searchUrl = `https://www.bolagsverket.se/ff/foretagsformer/sok?sni=${naceCode}&antal=${limit}`;

        const response = await fetch(searchUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'QrydexBot/2.0 (Business Directory)'
            }
        });

        if (!response.ok) {
            console.warn(`Sweden API returned ${response.status}`);
            return [];
        }

        const data = await response.json();
        const results = data.hits || data.results || [];

        for (const company of results.slice(0, limit)) {
            companies.push({
                id: company.organisationsnummer || company.orgnr,
                name: company.namn || company.foretagsnamn,
                country: 'SE',
                address: company.adress,
                city: company.postort,
                postalCode: company.postnummer,
                industry: company.sniBeskrivning || `SNI ${naceCode}`,
                status: company.status
            });
        }

        console.log(`  🇸🇪 Sweden (Official API): Found ${companies.length} companies`);
        return companies;

    } catch (error) {
        console.error('Sweden Official API error:', error);
        return [];
    }
}

/**
 * Finland - YTJ/PRH Official Open Data API
 * Source: https://avoindata.prh.fi/
 * 100% Free, No API Key Required
 */
export async function crawlFinlandOfficialAPI(naceCode: string, limit: number = 50): Promise<OfficialCompany[]> {
    const companies: OfficialCompany[] = [];

    try {
        // PRH (Patent- ja rekisterihallitus) Avoin Data API
        // This is the official Finnish business registry
        const apiUrl = `https://avoindata.prh.fi/bis/v1?totalResults=true&maxResults=${limit}&resultsFrom=0&companyRegistrationFrom=1800-01-01&businessLineCode=${naceCode}`;

        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'QrydexBot/2.0 (Business Directory)'
            }
        });

        if (!response.ok) {
            console.warn(`Finland API returned ${response.status}`);
            return [];
        }

        const data = await response.json();
        const results = data.results || [];

        for (const company of results) {
            // Extract business ID (Y-tunnus)
            const businessId = company.businessId;
            const name = company.name;

            // Extract address
            const addresses = company.addresses || [];
            const businessAddress = addresses.find((a: any) => a.type === 1) || addresses[0];

            companies.push({
                id: businessId,
                name: name,
                country: 'FI',
                address: businessAddress?.street,
                city: businessAddress?.city,
                postalCode: businessAddress?.postCode,
                industry: `TOL ${naceCode}`,
                status: company.companyForm
            });
        }

        console.log(`  🇫🇮 Finland (Official API): Found ${companies.length} companies`);
        return companies;

    } catch (error) {
        console.error('Finland Official API error:', error);
        return [];
    }
}

/**
 * Germany - Use OpenCorporates (Best Free Option)
 * Germany's Handelsregister requires payment, but OpenCorporates aggregates it
 */
export async function crawlGermanyOpenData(naceCode: string, limit: number = 30): Promise<OfficialCompany[]> {
    const companies: OfficialCompany[] = [];

    try {
        // Germany doesn't have a free official API
        // Best option: Use European Business Register or OpenCorporates
        // Alternative: Scrape Unternehmensregister.de (but it's protected)

        console.log(`  🇩🇪 Germany: Using fallback (no free official API)`);

        // For now, return empty - we'll rely on OpenCorporates or manual imports
        return [];

    } catch (error) {
        console.error('Germany data error:', error);
        return [];
    }
}

/**
 * Denmark - CVR API (Already Implemented in global-registry.ts)
 * This is already using the official free API: cvrapi.dk
 */
export async function crawlDenmarkOfficialAPI(naceCode: string, limit: number = 50): Promise<OfficialCompany[]> {
    const companies: OfficialCompany[] = [];

    try {
        // Denmark's CVR has a great free API via cvrapi.dk
        // We can search by NACE code (branchekode)
        const apiUrl = `https://cvrapi.dk/api?search=*&country=dk&branchekode=${naceCode}`;

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'QrydexBot/2.0 (Business Directory)'
            }
        });

        if (!response.ok) return [];

        const data = await response.json();

        // Note: CVR API returns one result per query
        // We'd need to iterate with different search terms
        // For bulk search, we need the premium API or scraping

        if (!data.error && data.vat) {
            companies.push({
                id: '' + data.vat,
                name: data.name,
                country: 'DK',
                website: data.website,
                address: data.address,
                city: data.city,
                postalCode: data.zipcode,
                industry: `NACE ${naceCode}`
            });
        }

        console.log(`  🇩🇰 Denmark (Official API): Found ${companies.length} companies`);
        return companies;

    } catch (error) {
        console.error('Denmark API error:', error);
        return [];
    }
}

/**
 * EU-Wide: European Business Register (EBR)
 * This is a network of European business registers
 */
export async function crawlEuropeanBusinessRegister(naceCode: string, country: string, limit: number = 20): Promise<OfficialCompany[]> {
    try {
        // The European Business Register is a paid service
        // But some member registries provide limited free access
        console.log(`  🇪🇺 EBR: Not available (requires subscription)`);
        return [];
    } catch {
        return [];
    }
}

// Export all official APIs
export {
    crawlSwedenOfficialAPI as crawlSwedenByIndustry,
    crawlFinlandOfficialAPI as crawlFinlandByIndustry,
    crawlDenmarkOfficialAPI as crawlDenmarkByIndustry_Bulk
};
