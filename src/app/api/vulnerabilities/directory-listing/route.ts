import { NextResponse } from 'next/server';
import { validateSafeTarget } from '@/lib/validators';
import { safeHttpProbe } from '@/lib/safe-http-probe';

export const dynamic = 'force-dynamic';

interface DirectoryCandidate {
  path: string;
  label: string;
  risk: 'critical' | 'high' | 'medium';
}

const COMMON_DIRECTORIES: DirectoryCandidate[] = [
  { path: '/backup/', label: 'Cartella Backup (/backup/)', risk: 'critical' },
  { path: '/backups/', label: 'Cartella Backups (/backups/)', risk: 'critical' },
  { path: '/data/', label: 'Cartella Dati (/data/)', risk: 'high' },
  { path: '/uploads/', label: 'Cartella Caricamenti (/uploads/)', risk: 'high' },
  { path: '/files/', label: 'Archivio File (/files/)', risk: 'high' },
  { path: '/media/', label: 'Cartella Media (/media/)', risk: 'medium' },
  { path: '/static/', label: 'Cartella Risorse Statiche (/static/)', risk: 'medium' },
  { path: '/assets/', label: 'Asset Applicativi (/assets/)', risk: 'medium' },
  { path: '/download/', label: 'Cartella Download (/download/)', risk: 'medium' },
  { path: '/downloads/', label: 'Cartella Downloads (/downloads/)', risk: 'medium' },
];

// Firme univoche e inconfutabili di motori web server reali (Apache, Nginx, IIS, Lighttpd)
const AUTOINDEX_SIGNATURES = [
  /<title>Index of \/[^<]*<\/title>/i,
  /<h1>Index of \/[^<]*<\/h1>/i,
  /<title>Directory Listing -- \/[^<]*<\/title>/i,
  /<title>Directory listing for \/[^<]*<\/title>/i,
  /<h1>Directory listing for \/[^<]*<\/h1>/i,
  /Parent Directory<\/a>/i,
  /Last modified<\/a>/i,
  /<pre><A HREF="[^"]*">\[To Parent Directory\]<\/A>/i,
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
      COMMON_DIRECTORIES.map(async (dir) => {
        const fullUrl = `${cleanBaseUrl}${dir.path}`;
        try {
          const res = await safeHttpProbe(fullUrl, { timeout: 4500 });
          const contentType = String(res.headers['content-type'] || '');

          // Deve rispondere 200 OK con payload HTML per configurare Directory Listing
          if (res.status === 200 && contentType.includes('text/html')) {
            const body = res.body;

            // Matching empirico sulle firme reali di autoindex (esclude SPA/catch-all 404 mascherati)
            const matchedSignature = AUTOINDEX_SIGNATURES.find((sig) => sig.test(body));
            const hasLinks = body.includes('<a href=') || body.includes('<A HREF=');

            if (matchedSignature && hasLinks) {
              const serverHeader = String(res.headers['server'] || 'Non specificato');
              const snippetMatch = body.match(/<(title|h1)>[^<]*(?:Index of|Directory [Ll]isting)[^<]*<\/(title|h1)>/i);
              const evidenceSnippet = snippetMatch ? snippetMatch[0] : 'Autoindex table/listing detected';

              return {
                path: dir.path,
                label: dir.label,
                risk: dir.risk,
                url: fullUrl,
                server: serverHeader,
                evidenceSnippet,
                curlCommand: `curl -i -sS "${fullUrl}" | head -n 25`,
                detail: `Directory listing attivo (${evidenceSnippet}) su server ${serverHeader}`,
              };
            }
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    const exposed = checks
      .map((c) => (c.status === 'fulfilled' ? c.value : null))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const criticalCount = exposed.filter((e) => e.risk === 'critical').length;
    const highCount = exposed.filter((e) => e.risk === 'high').length;
    const status = criticalCount > 0 ? 'fail' : highCount > 0 || exposed.length > 0 ? 'warning' : 'pass';

    return NextResponse.json({
      status,
      exposedDirectories: exposed,
      totalChecked: COMMON_DIRECTORIES.length,
      message:
        exposed.length > 0
          ? `Rilevate ${exposed.length} directory con indicizzazione automatica (Directory Listing) aperta!`
          : 'Nessuna directory comune espone indicizzazione automatica (autoindex disattivato o protetto).',
      recommendation:
        exposed.length > 0
          ? 'Disabilita immediatamente l\'indicizzazione automatica (es. `Options -Indexes` su Apache, rimuovi `autoindex on` su Nginx).'
          : 'La configurazione del web server impedisce la navigazione non autorizzata delle directory.',
      mitreDefense: {
        id: 'D3-WAC',
        technique: 'Web Application Access Control & Autoindex Hardening',
        cwe: 'CWE-548',
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Directory listing probe error:', error);
    return NextResponse.json({ error: 'Scansione directory listing non riuscita' }, { status: 500 });
  }
}
