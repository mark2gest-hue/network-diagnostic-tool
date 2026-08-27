import { FindingDiff, ScanDiffResult, ScanSnapshot } from '@/types/findings';

/**
 * Confronta due snapshot storici dello stesso target temporale (T0 vs T1)
 * ed estrae le anomalie, le vulnerabilità introdotte o risolte e le variazioni di configurazione.
 */
export function computeScanDiff(previous: ScanSnapshot, current: ScanSnapshot): ScanDiffResult {
  const changes: FindingDiff[] = [];
  let newVulnsCount = 0;
  let resolvedVulnsCount = 0;
  let configDriftsCount = 0;

  const prevFindingsMap = new Map(previous.findings.map((f) => [f.id, f]));
  const currFindingsMap = new Map(current.findings.map((f) => [f.id, f]));

  // 1. Individua nuovi finding (Vulnerabilità o problemi di configurazione apparsi in T1)
  currFindingsMap.forEach((currFinding, id) => {
    const prev = prevFindingsMap.get(id);
    if (!prev) {
      changes.push({
        id: currFinding.id,
        category: currFinding.category,
        changeType: 'added',
        title: `Nuovo Rilevamento: ${currFinding.title}`,
        currentEvidence: currFinding.evidence,
        severity: currFinding.severity,
        description: currFinding.description,
      });

      if (currFinding.category === 'security') {
        newVulnsCount++;
      } else {
        configDriftsCount++;
      }
    } else {
      // Esisteva già: controlla se l'evidenza o severità è cambiata
      if (prev.evidence !== currFinding.evidence || prev.severity !== currFinding.severity) {
        changes.push({
          id: currFinding.id,
          category: currFinding.category,
          changeType: 'changed',
          title: `Modifica Stato: ${currFinding.title}`,
          previousEvidence: prev.evidence,
          currentEvidence: currFinding.evidence,
          severity: currFinding.severity,
          description: `Variazione nell'evidenza riscontrata tra le due scansioni.`,
        });
        configDriftsCount++;
      }
    }
  });

  // 2. Individua finding risolti (presenti in T0 ma scomparsi in T1)
  prevFindingsMap.forEach((prevFinding, id) => {
    if (!currFindingsMap.has(id)) {
      changes.push({
        id: prevFinding.id,
        category: prevFinding.category,
        changeType: 'removed',
        title: `Problema Risolto: ${prevFinding.title}`,
        previousEvidence: prevFinding.evidence,
        severity: prevFinding.severity,
        description: `Il problema non è più presente nella scansione corrente (Remediation completata).`,
      });

      if (prevFinding.category === 'security') {
        resolvedVulnsCount++;
      }
    }
  });


  // 3. Confronto metriche di Latenza / TTFB
  const prevTtfb = previous.results['ttfb'] as Record<string, unknown> | undefined;
  const prevPing = previous.results['ping'] as Record<string, unknown> | undefined;
  const currTtfb = current.results['ttfb'] as Record<string, unknown> | undefined;
  const currPing = current.results['ping'] as Record<string, unknown> | undefined;

  const prevLatency = (typeof prevTtfb?.ttfb === 'number' ? prevTtfb.ttfb : undefined) ?? 
                      (typeof prevPing?.avgLatency === 'number' ? prevPing.avgLatency : undefined);
  const currLatency = (typeof currTtfb?.ttfb === 'number' ? currTtfb.ttfb : undefined) ?? 
                      (typeof currPing?.avgLatency === 'number' ? currPing.avgLatency : undefined);
  let latencyDeltaMs: number | undefined;

  if (typeof prevLatency === 'number' && typeof currLatency === 'number') {
    latencyDeltaMs = Math.round(currLatency - prevLatency);
    if (Math.abs(latencyDeltaMs) > 100) {
      changes.push({
        id: 'metric-latency-delta',
        category: 'availability',
        changeType: latencyDeltaMs > 0 ? 'degraded' : 'improved',
        title: latencyDeltaMs > 0 ? 'Degrado Latenza / TTFB' : 'Miglioramento Latenza / TTFB',
        previousEvidence: `${prevLatency} ms`,
        currentEvidence: `${currLatency} ms (${latencyDeltaMs > 0 ? `+${latencyDeltaMs}` : latencyDeltaMs} ms)`,
        severity: latencyDeltaMs > 250 ? 'medium' : 'low',
        description: `Variazione significativa nel tempo di risposta rilevato.`,
      });
    }
  }

  // 4. Confronto Certificato SSL
  const prevSsl = (previous.results['ssl'] || previous.results['tls']) as Record<string, unknown> | undefined;
  const currSsl = (current.results['ssl'] || current.results['tls']) as Record<string, unknown> | undefined;
  if (prevSsl && currSsl) {
    const prevIssuer = typeof prevSsl.issuer === 'string' ? prevSsl.issuer : undefined;
    const currIssuer = typeof currSsl.issuer === 'string' ? currSsl.issuer : undefined;
    if (prevIssuer && currIssuer && prevIssuer !== currIssuer) {
      changes.push({
        id: 'ssl-issuer-changed',
        category: 'configuration',
        changeType: 'changed',
        title: 'Certificato SSL: Cambio di Autorità di Certificazione (CA)',
        previousEvidence: `Issuer precedente: ${prevIssuer}`,
        currentEvidence: `Nuovo Issuer: ${currIssuer}`,
        severity: 'info',
        description: 'La Certification Authority del certificato SSL/TLS è stata modificata tra le due scansioni.',
      });
      configDriftsCount++;
    }
  }


  const scoreDelta = current.riskScore - previous.riskScore;

  return {
    target: current.target,
    previousTimestamp: previous.timestamp,
    currentTimestamp: current.timestamp,
    previousScore: previous.riskScore,
    currentScore: current.riskScore,
    scoreDelta,
    previousGrade: previous.grade,
    currentGrade: current.grade,
    changes,
    summary: {
      newVulnerabilities: newVulnsCount,
      resolvedVulnerabilities: resolvedVulnsCount,
      configDrifts: configDriftsCount,
      latencyDeltaMs,
    },
  };
}
