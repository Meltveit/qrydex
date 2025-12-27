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

        return {
            id: company.vat,
            name: company.name,
            country: 'DK',
            website: company.website,
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
 * France - INPI/SIRENE
 */
export async function searchFranceRegistry(name: string): Promise<RegistryCompany | null> {
    try {
        const response = await fetch(
            `https://entreprise.data.gouv.fr/api/sirene/v3/unites_legales?nom=${encodeURIComponent(name)}`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) return null;

        const data = await response.json();
        const company = data.unite_legale;

        if (!company) return null;

        return {
            id: company.siren,
            name: company.denomination,
            country: 'FR',
            city: company.siege?.commune,
            postalCode: company.siege?.code_postal,
            industry: company.activite_principale_entreprise
        };
    } catch {
        return null;
    }
}

/**
 * Spain - BORME
 */
export async function searchSpainRegistry(name: string): Promise<RegistryCompany | null> {
    // Spain's registry is complex and requires web scraping
    // Using OpenCorporates
    return searchOpenCorporates(name, 'ES');
}

/**
 * UK - Companies House
 */
export async function searchUKRegistry(name: string): Promise<RegistryCompany | null> {
    // Note: Companies House API requires API key (free)
    // For now, using OpenCorporates
    return searchOpenCorporates(name, 'GB');
}

/**
 * USA - Multiple sources (Delaware, SEC, etc.)
 */
export async function searchUSARegistry(name: string): Promise<RegistryCompany | null> {
    // USA doesn't have a centralized registry
    // Using OpenCorporates which aggregates state registries
    return searchOpenCorporates(name, 'US');
}

/**
 * OpenCorporates - Fallback for countries without free APIs
 * Free tier: 100 requests/month, 5000/month with API key
 */
async function searchOpenCorporates(
    name: string,
    countryCode: string
): Promise<RegistryCompany | null> {
    try {
        const apiKey = process.env.OPENCORPORATES_API_KEY || '';
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
            address: company.registered_address_in_full,
            city: company.registered_address?.locality,
            postalCode: company.registered_address?.postal_code,
            industry: company.industry_codes?.[0]?.description
        };
    } catch {
        return null;
    }
}

/**
 * Smart multi-country search
 * Tries appropriate registry based on company name suffix
 */
export async function searchGlobalRegistry(companyName: string): Promise<RegistryCompany | null> {
    console.log(`🌍 Searching global registries for: ${companyName}`);

    // Detect country from suffix
    if (/\s+(AS|ASA)$/i.test(companyName)) {
        return await searchNorwayRegistry(companyName);
    }

    if (/\s+AB$/i.test(companyName)) {
        return await searchSwedenRegistry(companyName);
    }

    if (/\s+ApS$/i.test(companyName)) {
        return await searchDenmarkRegistry(companyName);
    }

    if (/\s+Oy(j)?$/i.test(companyName)) {
        return await searchFinlandRegistry(companyName);
    }

    if (/\s+GmbH$/i.test(companyName)) {
        return await searchGermanyRegistry(companyName);
    }

    if (/\s+(SARL|SAS|SA)$/i.test(companyName)) {
        return await searchFranceRegistry(companyName);
    }

    if (/\s+(SL|SLU)$/i.test(companyName)) {
        return await searchSpainRegistry(companyName);
    }

    if (/\s+(Ltd|Limited|PLC)$/i.test(companyName)) {
        return await searchUKRegistry(companyName);
    }

    if (/\s+(Inc|Corp|LLC)$/i.test(companyName)) {
        return await searchUSARegistry(companyName);
    }

    // Default: Try Norway first (most likely for your use case)
    let result = await searchNorwayRegistry(companyName);
    if (result) return result;

    // Try other Nordic countries
    result = await searchSwedenRegistry(companyName);
    if (result) return result;

    result = await searchDenmarkRegistry(companyName);
    if (result) return result;

    return null;
}
