import { NextResponse } from 'next/server';
import { runSmartRescrape } from '@/scripts/smart-rescrape';

// Secure cron endpoint
export async function GET(request: Request) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await runSmartRescrape(100); // Process 100 businesses per run

        return NextResponse.json({
            success: true,
            message: 'Re-scraping completed'
        });
    } catch (error) {
        console.error('Cron re-scrape error:', error);
        return NextResponse.json({
            error: 'Re-scraping failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
