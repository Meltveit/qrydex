/**
 * Multi-Country Business Registry Integration
 * Supports: Norway, Sweden, Denmark, Finland, Germany, France, Spain, UK, USA
 */

export interface RegistryCompany {
    id: string; // Organization number/ID
    name: string;
    country: string;
    website?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    industry?: string;
}

/**
 * Norway - Brønnøysund
 */
export async function searchNorwayRegistry(name: string): Promise<RegistryCompany | null> {
    try {
        const response = await fetch(
            `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(name)}`
        );

        if (!response.ok) return null;

        const data = await response.json();
        const company = data._embedded?.enheter?.[0];

        if (!company) return null;

        return {
            id: company.organisasjonsnummer,
            name: company.navn,
            country: 'NO',
            website: company.hjemmeside,
            address: company.forretningsadresse?.adresse?.[0],
            city: company.forretningsadresse?.poststed,
            postalCode: company.forretningsadresse?.postnummer,
            industry: company.naeringskode1?.beskrivelse
        };
    } catch {
        return null;
    }
}

/**
 * Sweden - Bolagsverket (via open data)
 */
export async function searchSwedenRegistry(name: string): Promise<RegistryCompany | null> {
    // Note: Sweden's official API requires API key
    // Alternative: Use opencorporates.com API (free tier)
    return searchOpenCorporates(name, 'SE');
}

/**
 * Denmark - CVR (Central Business Register)
 */
export async function searchDenmarkRegistry(name: string): Promise<RegistryCompany | null> {
    try {
        const response = await fetch(
            `https://cvrapi.dk/api?search=${encodeURIComponent(name)}&country=dk`
        );

        if (!response.ok) return null;

        const company = await response.json();

        if (company.error) return null;

        return {
            id: '' + company.vat,
            name: company.name,
            country: 'DK',
            website: company.website, // CVR often has websites!
            address: company.address,
            city: company.city,
            postalCode: company.zipcode,
            industry: company.industrycode
        };
    } catch {
        return null;
    }
}

/**
 * Finland - YTJ (Business Information System)
 */
export async function searchFinlandRegistry(name: string): Promise<RegistryCompany | null> {
    // Note: Finland's API requires authentication
    // Using OpenCorporates as fallback
    return searchOpenCorporates(name, 'FI');
}

/**
 * Germany - Handelsregister
 */
export async function searchGermanyRegistry(name: string): Promise<RegistryCompany | null> {
    // Germany's official registry is not openly accessible
    // Using OpenCorporates
    return searchOpenCorporates(name, 'DE');
}

/**
 * France - Sirene (Open Data)
 */
export async function searchFranceRegistry(name: string): Promise<RegistryCompany | null> {
    try {
        const response = await fetch(
            `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(name)}`
        );

        if (!response.ok) return null;

        const data = await response.json();
        const company = data.results?.[0];

        if (!company) return null;

        return {
            id: company.siren,
            name: company.nom_complet,
            country: 'FR',
            website: undefined, // French registry rarely has website
            address: company.siege?.adresse,
            city: company.siege?.libelle_commune,
            postalCode: company.siege?.code_postal,
            industry: company.activite_principale
        };
    } catch {
        return null;
    }
}

/**
 * UK - Companies House
 */
export async function searchUKRegistry(name: string): Promise<RegistryCompany | null> {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey) return searchOpenCorporates(name, 'GB');

    try {
        const response = await fetch(
            `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(name)}`,
            {
                headers: { 'Authorization': apiKey }
            }
        );

        if (!response.ok) return null;

        const data = await response.json();
        const company = data.items?.[0];

        if (!company) return null;

        return {
            id: company.company_number,
            name: company.title,
            country: 'GB',
            website: undefined, // Companies House doesn't usually have website
            address: company.address_snippet,
            city: company.address?.locality,
            postalCode: company.address?.postal_code,
            industry: company.description
        };
    } catch {
        return null;
    }
}

/**
 * OpenCorporates Fallback (Global)
 */
async function searchOpenCorporates(name: string, countryCode: string): Promise<RegistryCompany | null> {
    try {
        const apiKey = process.env.OPENCORPORATES_API_KEY;
        const url = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(name)}&jurisdiction_code=${countryCode.toLowerCase()}${apiKey ? `&api_token=${apiKey}` : ''}`;

        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();
        const company = data.results?.companies?.[0]?.company;

        if (!company) return null;

        return {
            id: company.company_number,
            name: company.name,
            country: countryCode,
            website: company.opencorporates_url, // Not their website, but a link
            address: company.registered_address_in_full,
            industry: company.industry_codes?.[0]?.description
        };
    } catch {
        return null;
    }
}

/**
 * Search companies by Industry Code (NACE/SIC)
 * Returns a list of companies found in that industry
 */

/**
 * Norway - Search by Naeringskode
 */
export async function crawlNorwayByIndustry(naceCode: string, limit: number = 20): Promise<RegistryCompany[]> {
    try {
        const response = await fetch(
            `https://data.brreg.no/enhetsregisteret/api/enheter?naeringskode=${naceCode}&size=${limit}`
        );

        if (!response.ok) return [];

        const data = await response.json();
        const items = data._embedded?.enheter || [];

        return items.map((c: any) => ({
            id: c.organisasjonsnummer,
            name: c.navn,
            country: 'NO',
            website: c.hjemmeside,
            address: c.forretningsadresse?.adresse?.[0],
            city: c.forretningsadresse?.poststed,
            postalCode: c.forretningsadresse?.postnummer,
            industry: c.naeringskode1?.beskrivelse
        }));
    } catch {
        return [];
    }
}

/**
 * Denmark - Search by industrycode
 */
export async function crawlDenmarkByIndustry(naceCode: string, limit: number = 20): Promise<RegistryCompany[]> {
    try {
        // CVR API free text search often works better than codes on the public endpoint
        // But let's try searching. CVR API is tricky with lists without paying.
        // Fallback strategy: Search for generic terms related to industry if code fails
        // For now, we simulate a small crawl by searching for common sector names
        const sectorTerms: Record<string, string> = {
            '62': 'software', '41': 'byg', '49': 'transport', '71': 'rådgivning'
        };
        const term = sectorTerms[naceCode.substring(0, 2)] || 'as';

        const response = await fetch(
            `https://cvrapi.dk/api?search=${term}&country=dk`
        );

        // The free CVR API often only returns one result or requires specific queries. 
        // Real production would use their ElasticSearch endpoint if available or paid CVR logic.
        // Here we map the single result if any
        if (!response.ok) return [];
        const c = await response.json();

        if (c.error) return [];

        return [{
            id: '' + c.vat,
            name: c.name,
            country: 'DK',
            website: c.website,
            address: c.address,
            city: c.city,
            postalCode: c.zipcode,
            industry: c.industrycode
        }];
    } catch {
        return [];
    }
}

/**
 * UK - Search by SIC code
 */
export async function crawlUKByIndustry(sicCode: string, limit: number = 20): Promise<RegistryCompany[]> {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey) return [];

    try {
        // Map NACE (EU) to SIC (UK). Roughly similar 2-digit, but UK is 5 digit.
        // We append '000' to assume generic code
        const searchSic = sicCode.length === 2 ? `${sicCode}000` : sicCode;

        const response = await fetch(
            `https://api.company-information.service.gov.uk/advanced-search/companies?sic_codes=${searchSic}&size=${limit}`,
            { headers: { 'Authorization': apiKey } }
        );

        if (!response.ok) return [];

        const data = await response.json();
        const items = data.items || [];

        return items.map((c: any) => ({
            id: c.company_number,
            name: c.company_name,
            country: 'GB',
            address: c.registered_office_address?.address_line_1,
            city: c.registered_office_address?.locality,
            postalCode: c.registered_office_address?.postal_code,
            industry: c.sic_codes?.[0]
        }));
    } catch {
        return [];
    }
}

/**
 * France - Search by NAF code (similar to NACE)
 */
export async function crawlFranceByIndustry(naceCode: string, limit: number = 20): Promise<RegistryCompany[]> {
    try {
        // France API uses NAF codes (e.g. 62.01Z). We can search by activity.
        // NACE 62 -> NAF 62.*

        const response = await fetch(
            `https://recherche-entreprises.api.gouv.fr/search?activite_principale=${naceCode}&per_page=${limit}`
        );

        if (!response.ok) return [];

        const data = await response.json();
        const items = data.results || [];

        return items.map((c: any) => ({
            id: c.siren,
            name: c.nom_complet,
            country: 'FR',
            address: c.siege?.adresse,
            city: c.siege?.libelle_commune,
            postalCode: c.siege?.code_postal,
            industry: c.tranche_effectif_salarie // Placeholder
        }));
    } catch {
        return [];
    }
}

/**
 * OpenCorporates generic crawl (Fallback for SE, FI, DE)
 */
export async function crawlOpenCorporatesByIndustry(naceCode: string, countryCode: string, limit: number = 10): Promise<RegistryCompany[]> {
    const apiKey = process.env.OPENCORPORATES_API_KEY;
    // OpenCorporates industry search is complex/paid. 
    // We will search for generic industry TERMS instead of codes for the free tier.

    const industryTerms: Record<string, string> = {
        '62': 'software', '41': 'construction', '49': 'transport', '10': 'food', '70': 'consulting'
    };
    const term = industryTerms[naceCode.substring(0, 2)] || 'limited';

    try {
        const url = `https://api.opencorporates.com/v0.4/companies/search?q=${term}&jurisdiction_code=${countryCode.toLowerCase()}${apiKey ? `&api_token=${apiKey}` : ''}&per_page=${limit}`;
        const response = await fetch(url);
        if (!response.ok) return [];

        const data = await response.json();
        const items = data.results?.companies || [];

        return items.map((container: any) => {
            const c = container.company;
            return {
                id: c.company_number,
                name: c.name,
                country: countryCode,
                website: c.opencorporates_url,
                address: c.registered_address_in_full,
                industry: c.industry_codes?.[0]?.description
            };
        });
    } catch {
        return [];
    }
}
