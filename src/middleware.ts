import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from './lib/constants';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  const path = request.nextUrl.pathname;

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
  matcher: ['/api/history/:path*', '/api/assets/:path*', '/api/webhooks/:path*', '/api/auth/me'],
};
