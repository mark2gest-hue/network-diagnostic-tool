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

  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const candidateUrl = validatedTarget.startsWith('http') 
    ? `${validatedTarget}${normalizedPath}` 
    : `https://${validatedTarget}${normalizedPath}`;

  try {
    let auditResult = await auditLoginExposure(candidateUrl, pinnedLookup);

    // Fallback automatico su HTTP se HTTPS non risponde
    if (!auditResult.isReachable && !validatedTarget.startsWith('http')) {
      const httpCandidate = `http://${validatedTarget}${normalizedPath}`;
      const fallbackResult = await auditLoginExposure(httpCandidate, pinnedLookup);
      if (fallbackResult.isReachable) {
        auditResult = fallbackResult;
      }
    }

    // Mappiamo status coerente con la suite di vulnerabilità:
    // 'fail' = critico/alto, 'warning' = medio, 'pass' = low/nessun rischio esposto
    let status: 'pass' | 'warning' | 'fail' = 'pass';
    if (auditResult.exposureRisk === 'CRITICAL' || auditResult.exposureRisk === 'HIGH') {
      status = 'fail';
    } else if (auditResult.exposureRisk === 'MEDIUM') {
      status = 'warning';
    }

    return NextResponse.json({
      status,
      ...auditResult,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Errore sconosciuto durante l\'audit';
    return NextResponse.json({ error: `Audit login fallito: ${msg}` }, { status: 500 });
  }
}
