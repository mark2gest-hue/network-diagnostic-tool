import { NextResponse } from 'next/server';
import { validateSafeTarget } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const SENSITIVE_FILES = [
  { path: '/.env', label: 'Ambiente Principale (.env)', risk: 'critical' },
  { path: '/.env.local', label: 'Ambiente Locale (.env.local)', risk: 'critical' },
  { path: '/.env.production', label: 'Ambiente Produzione (.env.production)', risk: 'critical' },
  { path: '/.git/HEAD', label: 'Repository Git (.git/HEAD)', risk: 'critical' },
  { path: '/.git/config', label: 'Configurazione Git (.git/config)', risk: 'critical' },
  { path: '/docker-compose.yml', label: 'Orchestrazione Docker (docker-compose.yml)', risk: 'critical' },
  { path: '/Dockerfile', label: 'Specifica Build Dockerfile', risk: 'high' },
  { path: '/.aws/credentials', label: 'Credenziali Cloud AWS (.aws/credentials)', risk: 'critical' },
  { path: '/.vscode/sftp.json', label: 'Credenziali SFTP VSCode', risk: 'critical' },
  { path: '/id_rsa', label: 'Chiave Privata SSH (id_rsa)', risk: 'critical' },
  { path: '/backup.sql', label: 'Database Backup (backup.sql)', risk: 'high' },
  { path: '/dump.sql', label: 'Database Dump (dump.sql)', risk: 'high' },
  { path: '/database.sql', label: 'Database SQL (database.sql)', risk: 'high' },
  { path: '/wp-config.php.bak', label: 'WordPress Backup (wp-config.php.bak)', risk: 'high' },
  { path: '/wp-config.php~', label: 'WordPress Editor Backup (wp-config.php~)', risk: 'high' },
  { path: '/xmlrpc.php', label: 'WordPress XML-RPC (Rischio Brute-force/DDoS)', risk: 'medium' },
  { path: '/wp-json/wp/v2/users', label: 'WordPress User Enumeration REST API', risk: 'medium' },
  { path: '/phpinfo.php', label: 'PHP Info Telemetria (phpinfo.php)', risk: 'high' },
  { path: '/server-status', label: 'Apache Server Status', risk: 'medium' },
  { path: '/web.config', label: 'Configurazione IIS (web.config)', risk: 'high' },
  { path: '/.well-known/security.txt', label: 'Security Policy (security.txt)', risk: 'info' },
  { path: '/robots.txt', label: 'Robots File (robots.txt)', risk: 'info' }
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target');
  const target = (rawTarget || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = await validateSafeTarget(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const validatedTarget = validation.target;
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
            if (file.path.startsWith('/.git/')) {
              const text = await res.text();
              if (text.includes('ref:') || text.includes('[core]') || text.includes('[remote')) {
                return { ...file, status: 'exposed', detail: 'Trovato puntatore o configurazione Git!' };
              }
            } else if (file.path.startsWith('/.env')) {
              const text = await res.text();
              if (text.includes('=') && !isHtml) {
                return { ...file, status: 'exposed', detail: 'Esposizione variabili d\'ambiente' };
              }
            } else if (file.path.endsWith('.sql')) {
              const text = await res.text();
              if (!isHtml && (text.includes('CREATE TABLE') || text.includes('INSERT INTO') || text.includes('DROP TABLE') || text.includes('MySQL dump'))) {
                return { ...file, status: 'exposed', detail: 'Rilevato dump SQL di database scaricabile!' };
              }
            } else if (file.path === '/id_rsa') {
              const text = await res.text();
              if (text.includes('BEGIN RSA PRIVATE KEY') || text.includes('BEGIN OPENSSH PRIVATE KEY')) {
                return { ...file, status: 'exposed', detail: 'Chiave privata SSH non protetta!' };
              }
            } else if (file.path === '/docker-compose.yml' || file.path === '/Dockerfile') {
              const text = await res.text();
              if (!isHtml && (text.includes('version:') || text.includes('services:') || text.includes('FROM '))) {
                return { ...file, status: 'exposed', detail: 'File di infrastruttura Docker accessibile' };
              }
            } else if (file.path === '/wp-json/wp/v2/users') {
              const text = await res.text();
              if (contentType.includes('application/json') && text.includes('"slug":')) {
                return { ...file, status: 'exposed', detail: 'Esposizione nomi utente WordPress (User Enumeration)' };
              }
            } else if (file.path === '/phpinfo.php') {
              const text = await res.text();
              if (text.includes('PHP Version') && text.includes('Configuration')) {
                return { ...file, status: 'exposed', detail: 'Telemetria PHP Info completa esposta' };
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
