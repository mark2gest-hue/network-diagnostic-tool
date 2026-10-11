import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from './lib/constants';

const SCAN_PREFIXES = [
  '/api/tests',
  '/api/security',
  '/api/vulnerabilities',
  '/api/pentest',
  '/api/lan',
  '/api/ai',
  '/api/active-defense',
];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  const path = request.nextUrl.pathname;

  const isDemoMode = (process.env.APP_MODE ?? (process.env.NODE_ENV === 'production' ? 'demo' : 'local')) === 'demo';
  if (isDemoMode && SCAN_PREFIXES.some((p) => path.startsWith(p))) {
    return NextResponse.json({ error: 'Disabilitato in modalità demo: scansioni attive solo in locale' }, { status: 403 });
  }

  if (isDemoMode && !path.startsWith('/api')) {
    try {
      if (!token) throw new Error('no session');
      await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Proteggi l'intero percorso /api/history (qualsiasi metodo: GET, POST, DELETE) e /api/tests
  const isProtectedPath =
    path.startsWith('/api/history') ||
    path.startsWith('/api/assets') ||
    path.startsWith('/api/webhooks') ||
    path === '/api/auth/me';

  if (isProtectedPath) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: login richiesto' }, { status: 401 });
    }

    try {
      await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });
      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: 'Unauthorized: token non valido' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/history/:path*',
    '/api/assets/:path*',
    '/api/webhooks/:path*',
    '/api/auth/me',
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
    '/api/tests/:path*',
    '/api/security/:path*',
    '/api/vulnerabilities/:path*',
    '/api/pentest/:path*',
    '/api/lan/:path*',
    '/api/ai/:path*',
    '/api/active-defense',
  ],
};
