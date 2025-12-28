import type { Business } from '@/types/database';

interface SchemaOrgAddress {
    '@type': 'PostalAddress';
    streetAddress?: string;
    addressLocality?: string;
    postalCode?: string;
    addressCountry?: string;
}

interface SchemaOrgGeo {
    '@type': 'GeoCoordinates';
    latitude: number;
    longitude: number;
}

interface SchemaOrgOpeningHours {
    '@type': 'OpeningHoursSpecification';
    dayOfWeek: string[];
    opens: string;
    closes: string;
}

/**
 * Generates Schema.org LocalBusiness JSON-LD
 */
export function generateBusinessSchema(business: Business) {
    const registryData = business.registry_data || {};
    const qualityAnalysis = business.quality_analysis || {};

    // Construct address
    // Assuming registered_address is a string, we might need to parse it or use structured if available
    // For now, simple string is allowed in Schema.org but structured is better.
    // We will try to rely on what we have.

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        '@id': `https://qrydex.com/business/${business.org_number}`,
        name: business.legal_name,
        image: business.logo_url ? [business.logo_url] : undefined,
        description: business.company_description || qualityAnalysis.ai_summary || undefined,
        url: qualityAnalysis.website_url || undefined,
        telephone: qualityAnalysis.contact_phone || undefined,
        email: qualityAnalysis.contact_email || undefined,
        address: {
            '@type': 'PostalAddress',
            streetAddress: registryData.registered_address || undefined,
            addressCountry: business.country_code,
        },
        identifier: {
            '@type': 'PropertyValue',
            name: 'Organization Number',
            value: business.org_number,
        },
        // Enhanced fields
        sameAs: buildSameAsList(business),
    };

    // Add opening hours if available
    if (business.opening_hours) {
        // TODO: Parse custom opening_hours JSONB to Schema format
        // For now, we leave it out until we have a consistent parser
    }

    // Add Geo if available
    if (business.geo_coordinates) {
        // cast to any because we know the structure from migration but TS assumes Json
        const geo = business.geo_coordinates as any;
        if (geo.lat && geo.lng) {
            (schema as any).geo = {
                '@type': 'GeoCoordinates',
                latitude: geo.lat,
                longitude: geo.lng
            };
        }
    }

    // Add Trust Score as Aggregate Rating (0-100 converted to 0-5)
    if (business.trust_score) {
        (schema as any).aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: (business.trust_score / 20).toFixed(1), // Convert 100 to 5.0 scale
            bestRating: '5',
            worstRating: '0',
            ratingCount: '1', // Based on 1 trusted evaluation (Qrydex)
            reviewCount: '1'
        };
    }

    return schema;
}

function buildSameAsList(business: Business): string[] {
    const sameAs: string[] = [];

    // Add social media
    if (business.social_media) {
        const social = business.social_media as any;
        if (social.linkedin) sameAs.push(social.linkedin);
        if (social.facebook) sameAs.push(social.facebook);
        if (social.twitter) sameAs.push(social.twitter);
        if (social.instagram) sameAs.push(social.instagram);
    }

    // Add registry links if available
    if (business.country_code === 'NO') {
        sameAs.push(`https://w2.brreg.no/enhet/sok/detalj.jsp?orgnr=${business.org_number}`);
        sameAs.push(`https://www.proff.no/bransjesøk?q=${business.org_number}`);
    }

    return sameAs;
}
