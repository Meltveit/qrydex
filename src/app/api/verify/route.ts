import { NextRequest, NextResponse } from 'next/server';
import { verifyAndStoreBusiness, quickVerify } from '@/lib/verification';

/**
 * POST /api/verify - Full verification with storage
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { orgNumber, countryCode, websiteUrl, stateCode } = body;

        if (!orgNumber || !countryCode) {
            return NextResponse.json(
                { error: 'orgNumber and countryCode are required' },
                { status: 400 }
            );
        }

        const result = await verifyAndStoreBusiness({
            orgNumber,
            countryCode,
            websiteUrl,
            stateCode,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error, verified: false },
                { status: 404 }
            );
        }

        return NextResponse.json({
            verified: true,
            business: result.business,
        });
    } catch (error) {
        console.error('Verify API error:', error);
        return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/verify - Quick check without storage
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const orgNumber = searchParams.get('orgNumber');
        const countryCode = searchParams.get('countryCode');

        if (!orgNumber || !countryCode) {
            return NextResponse.json(
                { error: 'orgNumber and countryCode are required' },
                { status: 400 }
            );
        }

        const result = await quickVerify(orgNumber, countryCode);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Quick verify API error:', error);
        return NextResponse.json(
            { error: 'Quick verification failed' },
            { status: 500 }
        );
    }
}
