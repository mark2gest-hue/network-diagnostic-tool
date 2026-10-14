import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getJwtSecret } from './lib/constants';

const SCAN_PREFIXES = [
  '/api/tests',
  '/api/security',
  '/api/vulnerabilities',
  '/api/pentest',
  '/api/lan',
  '/api/ai',
  '/api/active-defense',
  '/api/defense',
];

async function verifyTokenHmac(token: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, signatureB64] = parts;

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const key = await crypto.subtle.importKey(
      'raw',
      getJwtSecret(),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decodifica signature Base64URL
    const b64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = atob(b64);
    const signature = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      signature[i] = binStr.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!isValid) return false;

    // Controlla scadenza se presente
    const payloadStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadStr);
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  const path = request.nextUrl.pathname;

  const hostname = request.nextUrl.hostname;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname.endsWith('.local');

  // In locale non esiste la schermata di login: reindirizza subito alla dashboard
  if (isLocalHost && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const isDemoMode = !isLocalHost && (process.env.APP_MODE ?? (process.env.NODE_ENV === 'production' ? 'demo' : 'local')) === 'demo';
  if (isDemoMode && SCAN_PREFIXES.some((p) => path.startsWith(p))) {
    return NextResponse.json({ error: 'Disabilitato in modalità demo: scansioni attive solo in locale' }, { status: 403 });
  }

  if (isDemoMode && !path.startsWith('/api')) {
    if (!token || !(await verifyTokenHmac(token))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Proteggi l'intero percorso /api/history (qualsiasi metodo: GET, POST, DELETE) e /api/tests
  const isProtectedPath =
    path.startsWith('/api/history') ||
    path.startsWith('/api/assets') ||
    path.startsWith('/api/webhooks') ||
    path === '/api/auth/me';

  if (!isLocalHost && isProtectedPath) {
    if (!token || !(await verifyTokenHmac(token))) {
      return NextResponse.json({ error: 'Unauthorized: login o token non valido' }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
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
    '/api/defense/:path*',
  ],
};
