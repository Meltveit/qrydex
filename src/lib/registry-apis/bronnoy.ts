/**
 * Brønnøysundregistrene API Integration
 * Norwegian business registry - free public API
 * https://data.brreg.no/enhetsregisteret/api/docs/index.html
 */

import type { RegistryData } from '@/types/database';

const BRREG_API_BASE = 'https://data.brreg.no/enhetsregisteret/api';

interface BrregEnhet {
    organisasjonsnummer: string;
    navn: string;
    organisasjonsform?: {
        kode: string;
        beskrivelse: string;
    };
    registreringsdatoEnhetsregisteret?: string;
    registrertIMvaregisteret?: boolean;
    naeringskode1?: {
        kode: string;
        beskrivelse: string;
    };
    antallAnsatte?: number;
    forretningsadresse?: {
        land: string;
        landkode: string;
        postnummer: string;
        poststed: string;
        adresse: string[];
        kommune: string;
    };
    hjemmeside?: string;
    konkurs?: boolean;
    underAvvikling?: boolean;
    underTvangsavviklingEllerTvangsopplosning?: boolean;
}

export async function lookupBrregEnhet(orgNumber: string): Promise<RegistryData | null> {
    try {
        // Remove spaces and validate format
        const cleanOrgNumber = orgNumber.replace(/\s/g, '');

        if (!/^\d{9}$/.test(cleanOrgNumber)) {
            console.error('Invalid Norwegian org number format:', orgNumber);
            return null;
        }

        const response = await fetch(`${BRREG_API_BASE}/enheter/${cleanOrgNumber}`, {
            headers: {
                'Accept': 'application/json',
            },
            next: { revalidate: 86400 } // Cache for 24 hours
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Brønnøysund API error: ${response.status}`);
        }

        const data: BrregEnhet = await response.json();

        // Determine company status
        let companyStatus: 'Active' | 'Dissolved' | 'Liquidation' | 'Unknown' = 'Active';
        if (data.konkurs) {
            companyStatus = 'Dissolved';
        } else if (data.underAvvikling || data.underTvangsavviklingEllerTvangsopplosning) {
            companyStatus = 'Liquidation';
        }

        // Build address string
        const address = data.forretningsadresse
            ? [
                ...(data.forretningsadresse.adresse || []),
                `${data.forretningsadresse.postnummer} ${data.forretningsadresse.poststed}`,
                data.forretningsadresse.land
            ].filter(Boolean).join(', ')
            : undefined;

        const registryData: RegistryData = {
            org_nr: data.organisasjonsnummer,
            vat_number: data.registrertIMvaregisteret ? `NO${data.organisasjonsnummer}MVA` : undefined,
            vat_status: data.registrertIMvaregisteret ? 'Active' : 'Unknown',
            last_verified_registry: new Date().toISOString(),
            legal_name: data.navn,
            registered_address: address,
            registration_date: data.registreringsdatoEnhetsregisteret,
            company_status: companyStatus,
            industry_codes: data.naeringskode1 ? [`${data.naeringskode1.kode}: ${data.naeringskode1.beskrivelse}`] : [],
            employee_count: data.antallAnsatte,
        };

        return registryData;
    } catch (error) {
        console.error('Error fetching from Brønnøysund:', error);
        return null;
    }
}

export async function searchBrregEnheter(query: string, limit = 10): Promise<BrregEnhet[]> {
    try {
        const params = new URLSearchParams({
            navn: query,
            size: limit.toString(),
        });

        const response = await fetch(`${BRREG_API_BASE}/enheter?${params}`, {
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Brønnøysund API error: ${response.status}`);
        }

        const data = await response.json();
        return data._embedded?.enheter || [];
    } catch (error) {
        console.error('Error searching Brønnøysund:', error);
        return [];
    }
}
