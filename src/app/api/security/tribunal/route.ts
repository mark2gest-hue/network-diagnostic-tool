import { NextResponse } from 'next/server';
import { extractEmpiricalEvidence, deliberateCourtVerdict } from '@/lib/tribunal-engine';
import { RiskAssessment } from '@/types/findings';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const target = String(body.target || '').trim();
    const assessment = (body.assessment || body.riskAssessment) as RiskAssessment | null;
    const rawResults = (body.rawResults || body.results) as Record<string, any> | undefined;

    if (!target) {
      return NextResponse.json({ error: 'Target domain obbligatorio per convocare il Tribunale' }, { status: 400 });
    }

    // 1. Estrazione rigorosa delle evidenze empiriche misurate (Zero Allucinazioni)
    const evidenceBundle = extractEmpiricalEvidence(target, assessment, rawResults);

    // 2. Deliberazione della Corte dei 3 Giudici (Red Team, Blue Team, Business Advisor)
    const courtVerdict = deliberateCourtVerdict(evidenceBundle);

    return NextResponse.json({
      success: true,
      verdict: courtVerdict,
      evidence: evidenceBundle,
    });
  } catch (error: any) {
    console.error('Security Tribunal Execution Error:', error);
    return NextResponse.json({
      error: 'Impossibile completare la deliberazione del Tribunale',
      detail: error?.message || 'Errore interno',
    }, { status: 500 });
  }
}
