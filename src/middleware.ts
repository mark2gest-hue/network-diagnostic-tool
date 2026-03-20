import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from './lib/constants';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  
  // For debugging
  if (request.nextUrl.pathname.startsWith('/api/auth/me')) {
    console.log(`Middleware: ${request.nextUrl.pathname}, token present: ${!!token}`);
  }

  // We only protect a few routes if needed, otherwise we just attach the user info
  if (request.nextUrl.pathname.startsWith('/api/history')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await jwtVerify(token, getJwtSecret());
      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/history/:path*', '/api/auth/me'],
};
