import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getThreatIntelStatus, syncCisaKevCatalog } from '@/lib/threat-intel-engine';

export const dynamic = 'force-dynamic';

function isAuthorizedSyncRequest(req: NextRequest): boolean {
  const configuredSecret = (process.env.THREAT_INTEL_SYNC_SECRET || '').trim();
  const providedSecret = (req.headers.get('x-threat-intel-secret') || '').trim();

  if (configuredSecret && providedSecret) {
    const a = Buffer.from(configuredSecret, 'utf8');
    const b = Buffer.from(providedSecret, 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
    return false;
  }

  const hostname = req.nextUrl.hostname;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const appMode = process.env.APP_MODE;
  return isLocalHost && appMode !== 'demo';
}

export async function GET() {
  const status = await getThreatIntelStatus();
  return NextResponse.json(status, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedSyncRequest(req)) {
    return NextResponse.json(
      { error: 'Non autorizzato: sincronizzazione consentita solo in locale o con x-threat-intel-secret valido.' },
      { status: 403 }
    );
  }

  try {
    const status = await syncCisaKevCatalog();
    return NextResponse.json(
      { ok: true, ...status },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore sincronizzazione catalogo CISA KEV';
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
