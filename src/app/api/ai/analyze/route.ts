import { NextResponse } from 'next/server';
import { Finding, RiskAssessment } from '@/types/findings';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { target, riskAssessment, findings } = (await req.json()) as {
      target: string;
      riskAssessment?: RiskAssessment;
      findings?: Finding[];
    };

    const targetHost = target || 'Target non specificato';
    const activeFindings = findings || riskAssessment?.findings || [];
    const overallScore = riskAssessment?.overallScore ?? 85;
    const grade = riskAssessment?.grade ?? 'B';

    // Generazione del report di sintesi e remediation basato sui finding deterministici
    const criticalFindings = activeFindings.filter((f) => f.severity === 'critical');
    const highFindings = activeFindings.filter((f) => f.severity === 'high');
    const mediumFindings = activeFindings.filter((f) => f.severity === 'medium');

    const topPriorities = [...criticalFindings, ...highFindings, ...mediumFindings].slice(0, 3).map((f, idx) => ({
      rank: idx + 1,
      title: f.title,
      category: f.category,
      severity: f.severity,
      evidence: f.evidence,
      action: f.remediation?.action || 'Verificare la configurazione del servizio ed applicare le patch necessarie.',
      snippet: f.remediation?.codeSnippet,
      reference: f.remediation?.technicalReference || 'Standard di Sicurezza CIS / OWASP',
    }));

    const executiveSummary =
      criticalFindings.length > 0
        ? `L'audit di sicurezza per il perimetro "${targetHost}" ha evidenziato ${criticalFindings.length} vulnerabilità CRITICHE che espongono l'infrastruttura a rischio di compromissione diretta. Il punteggio complessivo è ${overallScore}/100 (Grado ${grade}). Si raccomanda la chiusura immediata delle porte non necessarie e la protezione dei file di configurazione.`
        : highFindings.length > 0
        ? `L'infrastruttura "${targetHost}" presenta una postura discreta (Punteggio: ${overallScore}/100, Grado ${grade}), ma richiede interventi prioritari sulle intestazioni HTTP (HSTS/CSP) e sulla configurazione dei record crittografici per prevenire attacchi di spoofing e intercettazione.`
        : `L'host "${targetHost}" mostra una postura di sicurezza e disponibilità solida (Punteggio: ${overallScore}/100, Grado ${grade}). I controlli di base su perimetro, crittografia e disponibilità sono conformi alle buone pratiche.`;

    const falsePositivesAnalysis = [
      {
        topic: 'CDN & Web Application Firewall (WAF)',
        note: 'Se il dominio utilizza proxy reversi come Cloudflare o Akamai, alcuni header di risposta o certificati edge potrebbero mascherare il reale server di origine.',
      },
      {
        topic: 'Porte aperte intenzionali',
        note: 'Se porte come 22 (SSH) o 443 (HTTPS) sono aperte intenzionalmente per la gestione remota, assicurarsi che utilizzino autenticazione a chiave pubblica e rate limiting fail2ban.',
      },
      {
        topic: 'DMARC in modalità Monitoring',
        note: 'Una policy "p=none" è accettabile solo durante le prime 2-4 settimane di fase transitoria prima di elevare a "p=quarantine" o "p=reject".',
      },
    ];

    const complianceChecklist = [
      {
        standard: 'OWASP Top 10 (A01/A05)',
        status: criticalFindings.length === 0 ? 'CONFORME' : 'ATTENZIONE',
        detail: 'Controllo accessi e misconfigurazioni di sicurezza perimetrali.',
      },
      {
        standard: 'CIS Benchmark SSL/TLS',
        status: highFindings.some((f) => f.id.includes('ssl') || f.id.includes('tls')) ? 'DA MIGLIORARE' : 'CONFORME',
        detail: 'Utilizzo di suite di cifratura moderne (TLS 1.2 / TLS 1.3) e HSTS attivo.',
      },
      {
        standard: 'RFC 7489 (Email Defense)',
        status: activeFindings.some((f) => f.id.includes('dmarc')) ? 'DEBOLE' : 'CONFORME',
        detail: 'Postura anti-phishing con record SPF e policy DMARC restrittiva.',
      },
    ];

    return NextResponse.json({
      target: targetHost,
      timestamp: new Date().toISOString(),
      score: overallScore,
      grade,
      executiveSummary,
      topPriorities,
      falsePositivesAnalysis,
      complianceChecklist,
    });
  } catch (error) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: 'Errore durante la generazione del report di remediation' }, { status: 500 });
  }
}
