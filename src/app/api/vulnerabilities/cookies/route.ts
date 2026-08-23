import { NextResponse } from 'next/server';
import { targetSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target');
  const target = (rawTarget || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = targetSchema.safeParse(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  const validatedTarget = validation.data;
  const baseUrl = validatedTarget.startsWith('http') ? validatedTarget : `https://${validatedTarget}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(baseUrl, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timeout);

    // Estrai header Set-Cookie
    const setCookieHeaders = res.headers.getSetCookie 
      ? res.headers.getSetCookie() 
      : [res.headers.get('set-cookie')].filter(Boolean) as string[];

    if (setCookieHeaders.length === 0) {
      return NextResponse.json({
        status: 'pass',
        cookiesFound: 0,
        cookies: [],
        message: 'Nessun cookie impostato nella risposta HTTP iniziale.',
        recommendation: 'Se l\'applicazione usa cookie di sessione, assicurati che includano sempre HttpOnly, Secure e SameSite.'
      });
    }

    const analyzedCookies = setCookieHeaders.map((cookieStr) => {
      const parts = cookieStr.split(';').map(p => p.trim());
      const [nameVal] = parts;
      const name = nameVal.split('=')[0];

      const isHttpOnly = parts.some(p => p.toLowerCase() === 'httponly');
      const isSecure = parts.some(p => p.toLowerCase() === 'secure');
      const sameSitePart = parts.find(p => p.toLowerCase().startsWith('samesite='));
      const sameSite = sameSitePart ? sameSitePart.split('=')[1] : null;

      const issues: string[] = [];
      if (!isHttpOnly) issues.push('Manca HttpOnly (Vulnerabile a XSS)');
      if (!isSecure) issues.push('Manca Secure (Vulnerabile a intercettazione HTTP)');
      if (!sameSite) issues.push('Manca SameSite (Vulnerabile a CSRF)');

      return {
        name,
        isHttpOnly,
        isSecure,
        sameSite: sameSite || 'Non impostato',
        issues,
        safe: issues.length === 0
      };
    });

    const totalIssues = analyzedCookies.reduce((acc, c) => acc + c.issues.length, 0);
    const status = totalIssues === 0 ? 'pass' : totalIssues <= 2 ? 'warning' : 'fail';

    return NextResponse.json({
      status,
      cookiesFound: analyzedCookies.length,
      cookies: analyzedCookies,
      totalIssues,
      message: totalIssues === 0 
        ? `Tutti i ${analyzedCookies.length} cookie analizzati contengono i flag di sicurezza corretti.`
        : `Rilevate ${totalIssues} debolezze di sicurezza nei cookie analizzati.`,
      recommendation: totalIssues > 0
        ? 'Imposta HttpOnly, Secure e SameSite=Lax (o Strict) su tutti i cookie applicativi e di autenticazione.'
        : 'Configurazione cookie eccellente.'
    });
  } catch {
    return NextResponse.json({ error: 'Audit sicurezza cookie fallito' }, { status: 500 });
  }
}
