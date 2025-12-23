/**
 * IP Geolocation Service
 * Uses ipinfo.io free tier for location detection
 */

export interface GeoLocation {
    city: string;
    region: string;
    country: string;
    countryCode: string;
    coordinates: {
        lat: number;
        lng: number;
    };
}

const COUNTRY_FLAGS: Record<string, string> = {
    NO: '🇳🇴',
    SE: '🇸🇪',
    DK: '🇩🇰',
    FI: '🇫🇮',
    DE: '🇩🇪',
    NL: '🇳🇱',
    GB: '🇬🇧',
    US: '🇺🇸',
    FR: '🇫🇷',
    ES: '🇪🇸',
    IT: '🇮🇹',
    PL: '🇵🇱',
};

const COUNTRY_NAMES: Record<string, string> = {
    NO: 'Norge',
    SE: 'Sverige',
    DK: 'Danmark',
    FI: 'Finland',
    DE: 'Tyskland',
    NL: 'Nederland',
    GB: 'Storbritannia',
    US: 'USA',
    FR: 'Frankrike',
    ES: 'Spania',
    IT: 'Italia',
    PL: 'Polen',
};

export function getCountryFlag(countryCode: string): string {
    return COUNTRY_FLAGS[countryCode.toUpperCase()] || '🌍';
}

export function getCountryName(countryCode: string): string {
    return COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode;
}

/**
 * Get user location from IP (server-side)
 */
export async function getLocationFromIP(ip?: string): Promise<GeoLocation | null> {
    try {
        // Use ipinfo.io free tier (50k requests/month)
        const url = ip
            ? `https://ipinfo.io/${ip}/json`
            : 'https://ipinfo.io/json';

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        // Parse coordinates (format: "59.9127,10.7461")
        const [lat, lng] = (data.loc || '0,0').split(',').map(Number);

        return {
            city: data.city || 'Unknown',
            region: data.region || '',
            country: getCountryName(data.country),
            countryCode: data.country || '',
            coordinates: { lat, lng },
        };
    } catch (error) {
        console.error('Error fetching IP location:', error);
        return null;
    }
}

/**
 * Calculate distance between two coordinates in km
 */
export function calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
    if (km < 1) return '<1 km';
    if (km >= 1000) return `${Math.round(km / 100) / 10}k km`;
    return `${km} km`;
}
