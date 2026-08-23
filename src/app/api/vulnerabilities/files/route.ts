import { NextResponse } from 'next/server';
import { targetSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const SENSITIVE_FILES = [
  { path: '/.env', label: 'Ambiente (.env)', risk: 'critical' },
  { path: '/.git/HEAD', label: 'Repository Git (.git/HEAD)', risk: 'critical' },
  { path: '/backup.sql', label: 'Database Backup (backup.sql)', risk: 'high' },
  { path: '/dump.sql', label: 'Database Dump (dump.sql)', risk: 'high' },
  { path: '/wp-config.php.bak', label: 'WordPress Backup (wp-config.php.bak)', risk: 'high' },
  { path: '/server-status', label: 'Apache Server Status', risk: 'medium' },
  { path: '/.well-known/security.txt', label: 'Security Policy (security.txt)', risk: 'info' },
  { path: '/robots.txt', label: 'Robots File (robots.txt)', risk: 'info' }
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
    const checks = await Promise.allSettled(
      SENSITIVE_FILES.map(async (file) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        try {
          const res = await fetch(`${cleanBaseUrl}${file.path}`, {
            method: 'GET',
            signal: controller.signal,
            redirect: 'manual' // Evita redirect che mascherano 404
          });
          clearTimeout(timeout);

          const contentType = res.headers.get('content-type') || '';
          // Consideriamo esposto solo se 200 OK e non una pagina HTML di errore generico (SPA catch-all)
          if (res.status === 200) {
            const isHtml = contentType.includes('text/html');
            if (file.path === '/.git/HEAD') {
              const text = await res.text();
              if (text.includes('ref:')) {
                return { ...file, status: 'exposed', detail: 'Trovato puntatore ref di Git!' };
              }
            } else if (file.path === '/.env') {
              const text = await res.text();
              if (text.includes('=') && !isHtml) {
                return { ...file, status: 'exposed', detail: 'Esposizione variabili d\'ambiente' };
              }
            } else if (!isHtml || file.path.endsWith('.txt')) {
              return { ...file, status: 'exposed', detail: `File raggiungibile (HTTP 200)` };
            }
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    const exposed = checks
      .map(c => c.status === 'fulfilled' ? c.value : null)
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const criticalCount = exposed.filter(e => e.risk === 'critical').length;
    const highCount = exposed.filter(e => e.risk === 'high').length;

    const status = criticalCount > 0 ? 'fail' : highCount > 0 ? 'warning' : 'pass';

    return NextResponse.json({
      status,
      exposedFiles: exposed,
      totalChecked: SENSITIVE_FILES.length,
      message: exposed.length > 0
        ? `Rilevati ${exposed.length} file o percorsi sensibili esposti pubblicamente.`
        : 'Nessun file di configurazione, dump o repository sensibile rilevato esposto.',
      recommendation: exposed.length > 0
        ? 'Blocca immediatamente l\'accesso ai file di backup, .git e .env tramite regole di configurazione web server (Nginx/Apache/Cloudflare).'
        : 'I percorsi sensibili comuni risultano protetti o inaccessibili.'
    });
  } catch {
    return NextResponse.json({ error: 'Scansione file sensibili fallita' }, { status: 500 });
  }
}
