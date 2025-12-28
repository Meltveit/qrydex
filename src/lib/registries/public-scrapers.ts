/**
 * Nordic & EU Business Registry Scrapers (Free Public Data)
 * 
 * Provides direct access to public business registries without API keys
 */

export interface PublicCompany {
    id: string;
    name: string;
    country: string;
    website?: string;
    address?: string;
    city?: string;
    industry?: string;
}

/**
 * Sweden - Scrape Allabolag.se (Public Business Directory)
 * Alternative to Bolagsverket API which requires authentication
 */
export async function crawlSwedenPublicData(naceCode: string, limit: number = 50): Promise<PublicCompany[]> {
    const companies: PublicCompany[] = [];

    try {
        // Allabolag.se - scrape industry page
        // Use 'what' which is free text search, but better for SNI codes 
        // Or revert to branschtrad if 62.01 style matches

        // Let's use the 'bransch' slug which is simpler for getting bulk lists
        // Mapping NACE to likely Swedish industry slug:
        let slug = 'data-it-telekom'; // Default for most 62/63/58
        if (naceCode.startsWith('71') || naceCode.startsWith('72') || naceCode.startsWith('74')) slug = 'teknisk-konsultverksamhet';

        const searchUrl = `https://www.allabolag.se/bransch/${slug}`;

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) return [];

        const html = await response.text();

        // Extract company links from list
        // href="/foretag/company-name/orgnr"
        const linkMatches = html.matchAll(/href="\/foretag\/[^"]+\/(\d{6}-\d{4})"/g);

        for (const match of linkMatches) {
            if (companies.length >= limit) break;

            const orgNr = match[1];
            const fullMatch = match[0];
            const slugMatch = fullMatch.match(/\/foretag\/([^\/]+)\//);

            let name = 'Unknown SE Company';
            if (slugMatch && slugMatch[1]) {
                name = slugMatch[1]
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            }

            // Deduplicate
            if (!companies.find(c => c.id === orgNr)) {
                companies.push({
                    id: orgNr,
                    name: name,
                    country: 'SE',
                    industry: `NACE ${naceCode} (Est.)`
                });
            }
        }

        console.log(`  🇸🇪 Sweden (Allabolag): Found ${companies.length} companies`);
        return companies;

    } catch (error) {
        console.error('Sweden scraping error:', error);
        return [];
    }
}

/**
 * Germany - Use Handelsregister Bulk Data
 * Germany publishes open data extracts
 */
export async function crawlGermanyPublicData(naceCode: string, limit: number = 50): Promise<PublicCompany[]> {
    const companies: PublicCompany[] = [];

    try {
        // North Data (northdata.de) aggregates German business register data
        // This is a public search engine for German companies
        const searchUrl = `https://www.northdata.de/_sdd/cs?q=NACE+${naceCode}&l=de`;

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) return [];

        const data = await response.json();
        const results = data.results || [];

        for (const result of results.slice(0, limit)) {
            if (result.type === 'company' && result.id) {
                companies.push({
                    id: result.id,
                    name: result.name || result.label,
                    country: 'DE',
                    address: result.address,
                    city: result.city,
                    industry: `NACE ${naceCode}`
                });
            }
        }

        console.log(`  🇩🇪 Germany: Found ${companies.length} companies via NorthData`);
        return companies;

    } catch (error) {
        console.error('Germany scraping error:', error);
        return [];
    }
}

/**
 * Finland - Use Scraping of YTJ (Public Search)
 */
export async function crawlFinlandPublicData(naceCode: string, limit: number = 30): Promise<PublicCompany[]> {
    const companies: PublicCompany[] = [];

    try {
        // YTJ has a public search interface
        const searchUrl = `https://tietopalvelu.ytj.fi/yritystiedot.aspx?yavain=&toimialakoodi=${naceCode}`;

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) return [];

        const html = await response.text();

        // Extract Finnish business IDs (Y-tunnus format: 1234567-8)
        const businessIdMatches = html.match(/(\d{7}-\d)/g);
        const nameMatches = html.match(/<td[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)</gi);

        if (businessIdMatches && nameMatches) {
            const count = Math.min(businessIdMatches.length, nameMatches.length, limit);

            for (let i = 0; i < count; i++) {
                const name = nameMatches[i].replace(/<[^>]+>/g, '').trim();

                companies.push({
                    id: businessIdMatches[i],
                    name: name,
                    country: 'FI',
                    industry: `NACE ${naceCode}`
                });
            }
        }

        console.log(`  🇫🇮 Finland: Found ${companies.length} companies via YTJ search`);
        return companies;

    } catch (error) {
        console.error('Finland scraping error:', error);
        return [];
    }
}

/**
 * Spain - Use Scraping of INFORMA/eInforma
 */
export async function crawlSpainPublicData(naceCode: string, limit: number = 30): Promise<PublicCompany[]> {
    const companies: PublicCompany[] = [];

    try {
        // Empresia.es is a public Spanish business directory
        const searchUrl = `https://www.empresia.es/empresas/CNAE-${naceCode}`;

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) return [];

        const html = await response.text();

        // Extract Spanish CIF/NIF (format varies, typically A12345678)
        const cifMatches = html.match(/CIF[:\s]+([A-Z]\d{8})/gi);
        const nameMatches = html.match(/<h[23][^>]*class="[^"]*empresa[^"]*"[^>]*>([^<]+)</gi);

        if (cifMatches && nameMatches) {
            const count = Math.min(cifMatches.length, nameMatches.length, limit);

            for (let i = 0; i < count; i++) {
                const cif = cifMatches[i].replace(/CIF[:\s]+/, '');
                const name = nameMatches[i].replace(/<[^>]+>/g, '').trim();

                companies.push({
                    id: cif,
                    name: name,
                    country: 'ES',
                    industry: `CNAE ${naceCode}`
                });
            }
        }

        console.log(`  🇪🇸 Spain: Found ${companies.length} companies via Empresia`);
        return companies;

    } catch (error) {
        console.error('Spain scraping error:', error);
        return [];
    }
}

/**
 * Generic EU Company Scraper using EU Business Registry Network
 */
export async function crawlEUBusinessRegistry(naceCode: string, country: string, limit: number = 20): Promise<PublicCompany[]> {
    const companies: PublicCompany[] = [];

    try {
        // European Business Register (EBR) has search functionality
        // This is a consortium of European business registers
        console.log(`  🇪🇺 Trying EU Business Register for ${country}...`);

        // Note: This would require implementing the specific protocol
        // For now, return empty to avoid errors
        return [];

    } catch (error) {
        console.error('EU Registry error:', error);
        return [];
    }
}

// Export all crawlers
export {
    crawlSwedenPublicData as crawlSwedenByIndustry,
    crawlGermanyPublicData as crawlGermanyByIndustry,
    crawlFinlandPublicData as crawlFinlandByIndustry,
    crawlSpainPublicData as crawlSpainByIndustry
};
