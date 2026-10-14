import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { extractFindingsFromResults, calculateRiskAssessment } from '@/lib/risk-engine';

import { computeScanDiff } from '@/lib/diff-engine';
import { ScanSnapshot } from '@/types/findings';
import { pentestToScanSnapshot, isPentestResult } from '@/lib/pentest-findings';

export const dynamic = 'force-dynamic';

function toSnapshot(results: unknown, target: string, timestamp: string): ScanSnapshot {
  if (isPentestResult(results)) {
    return pentestToScanSnapshot(results);
  }
  const findings = extractFindingsFromResults(results as Record<string, unknown>);
  const risk = calculateRiskAssessment(findings);
  return {
    target: target || 'Target',
    timestamp: timestamp || new Date().toISOString(),
    results: results as Record<string, unknown>,
    findings,
    riskScore: risk.overallScore,
    grade: risk.grade,
  };
}

export async function POST(req: Request) {
  try {
    const { previousId, currentId, previousScan, currentScan } = await req.json();

    let prevSnapshot: ScanSnapshot | null = null;
    let currSnapshot: ScanSnapshot | null = null;

    if (previousId && currentId) {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
      }

      // Fetch both from db with user isolation (anti-IDOR)
      const result = await db.execute({
        sql: 'SELECT id, target, results, created_at FROM test_history WHERE id IN (?, ?) AND user_id = ?',
        args: [previousId, currentId, session.userId],
      });

      const rows = result.rows;
      const prevRow = rows.find((r) => r.id === previousId);
      const currRow = rows.find((r) => r.id === currentId);

      if (prevRow && currRow) {
        const prevResults = typeof prevRow.results === 'string' ? JSON.parse(prevRow.results as string) : prevRow.results;
        const currResults = typeof currRow.results === 'string' ? JSON.parse(currRow.results as string) : currRow.results;

        prevSnapshot = toSnapshot(
          prevResults,
          (prevRow.target as string) || 'Target',
          (prevRow.created_at as string) || new Date().toISOString()
        );
        currSnapshot = toSnapshot(
          currResults,
          (currRow.target as string) || 'Target',
          (currRow.created_at as string) || new Date().toISOString()
        );
      }
    } else if (previousScan && currentScan) {
      prevSnapshot = toSnapshot(
        previousScan.results || previousScan,
        previousScan.target || 'Target A',
        previousScan.timestamp || previousScan.created_at || 'T0'
      );
      currSnapshot = toSnapshot(
        currentScan.results || currentScan,
        currentScan.target || 'Target B',
        currentScan.timestamp || currentScan.created_at || 'T1'
      );
    }

    if (!prevSnapshot || !currSnapshot) {
      return NextResponse.json({ error: 'Dati di scansione insufficienti per il confronto' }, { status: 400 });
    }

    const diff = computeScanDiff(prevSnapshot, currSnapshot);
    return NextResponse.json(diff);
  } catch (error) {
    console.error('Diff computation error:', error);
    return NextResponse.json({ error: 'Errore nel calcolo del diff' }, { status: 500 });
  }
}
