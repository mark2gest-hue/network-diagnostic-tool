import { NextResponse } from 'next/server';
import { targetSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const ADMIN_PATHS = [
  '/admin', '/wp-admin', '/phpmyadmin', '/administrator', '/login', '/dashboard', '/backoffice', '/controlpanel'
];

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
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  try {
    const results = await Promise.all(
      ADMIN_PATHS.map(async (path) => {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(`${cleanBaseUrl}${path}`, { 
            method: 'GET',
            signal: controller.signal,
            redirect: 'follow'
          });
          clearTimeout(id);
          
          if (response.status === 200) {
            return { path, status: 'exposed' };
          }
        } catch {
          // Path not reachable
        }
        return null;
      })
    );

    const exposedPaths = results.filter(r => r !== null);

    return NextResponse.json({
      status: exposedPaths.length > 0 ? 'warning' : 'pass',
      exposedPaths,
      message: exposedPaths.length > 0 
        ? `Trovati ${exposedPaths.length} potenziali pannelli admin esposti` 
        : 'Nessun pannello admin comune rilevato',
      recommendation: exposedPaths.length > 0 
        ? 'Proteggi i percorsi amministrativi con autenticazione a due fattori o limitazioni d\'accesso tramite IP.' 
        : 'I percorsi amministrativi comuni non sembrano esposti al pubblico.'
    });
  } catch {
    return NextResponse.json({ error: 'Controllo pannelli admin fallito' }, { status: 500 });
  }
}
