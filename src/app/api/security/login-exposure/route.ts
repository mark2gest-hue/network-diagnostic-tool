import { NextResponse } from 'next/server';
import { validateSafeTarget } from '@/lib/validators';
import { createPinnedLookup } from '@/lib/security-guard';
import { auditLoginExposure } from '@/lib/login-exposure-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target');
  const path = searchParams.get('path') || '';

  const cleanTarget = (rawTarget || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  if (!cleanTarget) {
    return NextResponse.json({ error: 'Parametro target obbligatorio' }, { status: 400 });
  }

  const validation = await validateSafeTarget(cleanTarget);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const validatedTarget = validation.target;
  const pinnedLookup = createPinnedLookup(validation.resolvedIps);

  // Costruzione URL completo (con supporto protocollo e percorso opzionale es. /login o /admin)
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const candidateUrl = validatedTarget.startsWith('http') 
    ? `${validatedTarget}${normalizedPath}` 
    : `https://${validatedTarget}${normalizedPath}`;

  try {
    const auditResult = await auditLoginExposure(candidateUrl, pinnedLookup);

    // Se https fallisce con unreachable e non c'era protocollo esplicito, prova http
    if (!auditResult.isReachable && !validatedTarget.startsWith('http')) {
      const httpCandidate = `http://${validatedTarget}${normalizedPath}`;
      const fallbackResult = await auditLoginExposure(httpCandidate, pinnedLookup);
      if (fallbackResult.isReachable) {
        return NextResponse.json(fallbackResult);
      }
    }

    return NextResponse.json(auditResult);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Errore sconosciuto durante l\'audit';
    return NextResponse.json({ error: `Audit fallito: ${msg}` }, { status: 500 });
  }
}
