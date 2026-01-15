import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple geo-detection based on request headers
// In production, you'd use a service like MaxMind or ip-api
export async function GET(request: NextRequest) {
    try {
        // Try to get country from Vercel's geo headers
        const country = request.headers.get('x-vercel-ip-country');
        const city = request.headers.get('x-vercel-ip-city');
        const region = request.headers.get('x-vercel-ip-country-region');

        if (country) {
            return NextResponse.json({
                country: country.toLowerCase(),
                city: city || null,
                region: region || null,
            });
        }

        // Fallback: try to detect from Accept-Language header
        const acceptLanguage = request.headers.get('accept-language');
        if (acceptLanguage) {
            const languageToCountry: Record<string, string> = {
                'en-US': 'us',
                'en-GB': 'gb',
                'en-AU': 'au',
                'en-CA': 'ca',
                'da': 'dk',
                'da-DK': 'dk',
                'nb': 'no',
                'nb-NO': 'no',
                'nn': 'no',
                'nn-NO': 'no',
                'sv': 'se',
                'sv-SE': 'se',
                'de': 'de',
                'de-DE': 'de',
                'de-AT': 'at',
                'de-CH': 'ch',
                'fr': 'fr',
                'fr-FR': 'fr',
                'fr-CA': 'ca',
                'es': 'es',
                'es-ES': 'es',
                'es-MX': 'mx',
                'pt': 'pt',
                'pt-BR': 'br',
                'pt-PT': 'pt',
                'it': 'it',
                'it-IT': 'it',
                'nl': 'nl',
                'nl-NL': 'nl',
                'pl': 'pl',
                'pl-PL': 'pl',
                'ja': 'jp',
                'ja-JP': 'jp',
                'ko': 'kr',
                'ko-KR': 'kr',
                'zh': 'cn',
                'zh-CN': 'cn',
                'zh-TW': 'tw',
                'ru': 'ru',
                'ru-RU': 'ru',
            };

            const primaryLanguage = acceptLanguage.split(',')[0].trim();
            const detectedCountry = languageToCountry[primaryLanguage];

            if (detectedCountry) {
                return NextResponse.json({
                    country: detectedCountry,
                    city: null,
                    region: null,
                    source: 'language',
                });
            }
        }

        // Default fallback
        return NextResponse.json({
            country: 'us',
            city: null,
            region: null,
            source: 'default',
        });
    } catch (error) {
        console.error('Geo detection error:', error);
        return NextResponse.json({
            country: 'us',
            city: null,
            region: null,
            source: 'error',
        });
    }
}
