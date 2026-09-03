import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { extractFindingsFromResults, calculateRiskAssessment } from '@/lib/risk-engine';

import { computeScanDiff } from '@/lib/diff-engine';
import { ScanSnapshot } from '@/types/findings';

export const dynamic = 'force-dynamic';

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

        const prevFindings = extractFindingsFromResults(prevResults);
        const currFindings = extractFindingsFromResults(currResults);

        const prevRisk = calculateRiskAssessment(prevFindings);
        const currRisk = calculateRiskAssessment(currFindings);

        prevSnapshot = {
          target: (prevRow.target as string) || 'Target',
          timestamp: (prevRow.created_at as string) || new Date().toISOString(),
          results: prevResults,
          findings: prevFindings,
          riskScore: prevRisk.overallScore,
          grade: prevRisk.grade,
        };

        currSnapshot = {
          target: (currRow.target as string) || 'Target',
          timestamp: (currRow.created_at as string) || new Date().toISOString(),
          results: currResults,
          findings: currFindings,
          riskScore: currRisk.overallScore,
          grade: currRisk.grade,
        };
      }
    } else if (previousScan && currentScan) {
      const prevFindings = extractFindingsFromResults(previousScan.results || previousScan);
      const currFindings = extractFindingsFromResults(currentScan.results || currentScan);
      const prevRisk = calculateRiskAssessment(prevFindings);
      const currRisk = calculateRiskAssessment(currFindings);

      prevSnapshot = {
        target: previousScan.target || 'Target A',
        timestamp: previousScan.timestamp || previousScan.created_at || 'T0',
        results: previousScan.results || previousScan,
        findings: prevFindings,
        riskScore: prevRisk.overallScore,
        grade: prevRisk.grade,
      };

      currSnapshot = {
        target: currentScan.target || 'Target B',
        timestamp: currentScan.timestamp || currentScan.created_at || 'T1',
        results: currentScan.results || currentScan,
        findings: currFindings,
        riskScore: currRisk.overallScore,
        grade: currRisk.grade,
      };
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
