import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from './lib/constants';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  const path = request.nextUrl.pathname;

  // Proteggi GET su /api/history e /api/history/diff
  const isProtectedHistory = (path === '/api/history' && request.method === 'GET') || path.startsWith('/api/history/diff');
  const isProtectedAssetOrWebhook = path.startsWith('/api/assets') || path.startsWith('/api/webhooks');

  if (isProtectedHistory || isProtectedAssetOrWebhook) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: login richiesto' }, { status: 401 });
    }

    try {
      await jwtVerify(token, getJwtSecret());
      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: 'Unauthorized: token non valido' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/history/:path*', '/api/assets/:path*', '/api/webhooks/:path*', '/api/auth/me'],
};
