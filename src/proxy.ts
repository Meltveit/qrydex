import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
    return new NextResponse('410 Gone - This project has been discontinued.', {
        status: 410,
        headers: {
            'Content-Type': 'text/plain',
        },
    });
}

export const config = {
    matcher: '/:path*',
};
