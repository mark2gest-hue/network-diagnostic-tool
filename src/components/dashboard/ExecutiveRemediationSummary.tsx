'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  FileText,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { BigScore, ActionCard, StatusPill, RowList, ExpandableRow, CommandBlock } from '@/components/ui/nd';
import { extractFindingsFromResults, calculateRiskAssessment } from '@/lib/risk-engine';
import type { RiskAssessment } from '@/types/findings';

export interface ExecutiveRemediationSummaryProps {
  target: string;
  perspectiveMode?: 'executive' | 'it-pro';
  onOpenExportModal?: () => void;
  demoAssessment?: RiskAssessment;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  internalResults?: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  securityResults?: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vulnerabilityResults?: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pentestResults?: Record<string, any> | null;
}

export interface RemediationItem {
  id: string;
  category: 'email' | 'web' | 'network' | 'dns';
  severity: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  threatDescription: string;
  businessImpact: string;
  solutionCommand: string;
  solutionType: 'BIND / DNS' | 'Nginx / Web Server' | 'Firewall / UFW' | 'Cloudflare / Edge' | 'Policy / Config';
  mitreDefend?: string;
  cwe?: string;
  nistCsf?: string;
}

export function ExecutiveRemediationSummary({ 
  target, 
  perspectiveMode = 'executive',
  onOpenExportModal,
  demoAssessment,
  results,
  internalResults,
  securityResults,
  vulnerabilityResults,
  pentestResults,
}: ExecutiveRemediationSummaryProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Consolidamento dei risultati grezzi di tutti i moduli diagnostici
  const consolidatedRaw = React.useMemo(() => {
    return {
      ...(results || {}),
      security: securityResults || undefined,
      vulnerabilities: vulnerabilityResults || undefined,
      pentest: pentestResults || undefined,
      internal: internalResults || undefined,
    };
  }, [results, securityResults, vulnerabilityResults, pentestResults, internalResults]);

  // Estrazione deterministica dei finding e calcolo della postura di rischio
  const findings = React.useMemo(() => {
    return demoAssessment ? demoAssessment.findings : extractFindingsFromResults(consolidatedRaw);
  }, [consolidatedRaw, demoAssessment]);

  const assessment = React.useMemo(() => {
    return demoAssessment ?? calculateRiskAssessment(findings, consolidatedRaw);
  }, [findings, consolidatedRaw, demoAssessment]);

  // Rileva se almeno un test ha completato l'esecuzione
  const hasExecutedTests = React.useMemo(() => {
    if (demoAssessment) return true;
    const rawEntries = Object.values(results || {}).filter(
      (r) => r && r.status !== 'idle' && r.status !== 'running'
    );
    const secEntries = Object.values(securityResults || {}).filter(
      (r) => r && r.status !== 'idle' && r.status !== 'running'
    );
    const vulnEntries = Object.values(vulnerabilityResults || {}).filter(
      (r) => r && r.status !== 'idle' && r.status !== 'running'
    );
    const hasPentest = Boolean(
      pentestResults &&
        ((pentestResults.tests && pentestResults.tests.length > 0) ||
          (Array.isArray(pentestResults) && pentestResults.length > 0))
    );
    return rawEntries.length > 0 || secEntries.length > 0 || vulnEntries.length > 0 || hasPentest;
  }, [results, securityResults, vulnerabilityResults, pentestResults, demoAssessment]);

  // Mappatura dinamica dei finding verso il piano di remediation
  const remediationList: RemediationItem[] = React.useMemo(() => {
    return findings.map((f): RemediationItem => {
      let solType: RemediationItem['solutionType'] = 'Nginx / Web Server';
      let category: RemediationItem['category'] = 'web';
      let mitre = 'D3-AHC';
      let cwe = 'CWE-16';
      let nist = 'PR.IP-1';

      const fid = f.id.toLowerCase();
      if (fid.includes('dmarc') || fid.includes('spf') || fid.includes('dkim') || fid.includes('mx') || fid.includes('email')) {
        category = 'email';
        solType = 'BIND / DNS';
        mitre = 'D3-MHA';
        cwe = fid.includes('dmarc') ? 'CWE-345' : 'CWE-290';
        nist = 'PR.DS-6';
      } else if (fid.includes('dns') || fid.includes('ptr') || fid.includes('soa') || fid.includes('ns')) {
        category = 'dns';
        solType = 'BIND / DNS';
        mitre = 'D3-DNS';
        cwe = 'CWE-345';
        nist = 'PR.DS-6';
      } else if (fid.includes('port') || fid.includes('ssh') || fid.includes('firewall') || fid.includes('telnet') || fid.includes('ftp')) {
        category = 'network';
        solType = 'Firewall / UFW';
        mitre = 'D3-NTF';
        cwe = 'CWE-284';
        nist = 'PR.AC-4';
      } else if (fid.includes('ttfb') || fid.includes('latency') || fid.includes('ddos') || fid.includes('waf')) {
        category = 'network';
        solType = 'Cloudflare / Edge';
        mitre = 'D3-NTF';
        cwe = 'CWE-400';
        nist = 'PR.AC-5';
      } else if (fid.includes('hsts')) {
        category = 'web';
        solType = 'Nginx / Web Server';
        mitre = 'D3-ENCR';
        cwe = 'CWE-319';
        nist = 'PR.DS-2';
      } else if (fid.includes('csp')) {
        category = 'web';
        solType = 'Nginx / Web Server';
        mitre = 'D3-AHC';
        cwe = 'CWE-79';
        nist = 'PR.PT-1';
      } else if (fid.includes('xfo') || fid.includes('clickjack')) {
        category = 'web';
        solType = 'Nginx / Web Server';
        mitre = 'D3-AHC';
        cwe = 'CWE-1021';
        nist = 'PR.PT-1';
      } else if (fid.includes('file') || fid.includes('env') || fid.includes('git')) {
        category = 'web';
        solType = 'Nginx / Web Server';
        mitre = 'D3-FC';
        cwe = 'CWE-200';
        nist = 'PR.AC-4';
      } else if (fid.includes('cors')) {
        category = 'web';
        solType = 'Nginx / Web Server';
        mitre = 'D3-AA';
        cwe = 'CWE-942';
        nist = 'PR.AC-4';
      } else if (fid.includes('cookie')) {
        category = 'web';
        solType = 'Nginx / Web Server';
        mitre = 'D3-CH';
        cwe = 'CWE-614';
        nist = 'PR.DS-1';
      } else if (fid.includes('ssl') || fid.includes('tls')) {
        category = 'web';
        solType = 'Nginx / Web Server';
        mitre = 'D3-CM';
        cwe = 'CWE-295';
        nist = 'PR.DS-2';
      } else if (fid.includes('blacklist') || fid.includes('dnsbl')) {
        category = 'network';
        solType = 'Policy / Config';
        mitre = 'D3-RA';
        cwe = 'CWE-358';
        nist = 'DE.CM-1';
      }

      return {
        id: f.id,
        category,
        severity: f.severity === 'critical' ? 'critical' : f.severity === 'high' ? 'high' : f.severity === 'medium' ? 'medium' : 'info',
        title: f.title,
        threatDescription: f.description,
        businessImpact: f.impact || 'Possibile impatto operativo o di conformità sul perimetro esposto.',
        solutionCommand: f.remediation?.codeSnippet || `# Azione raccomandata:\n# ${f.remediation?.action || 'Rivedere configurazione'}\n# Riferimento: ${f.remediation?.technicalReference || 'Standard di sicurezza'}`,
        solutionType: solType,
        mitreDefend: mitre,
        cwe,
        nistCsf: nist,
      };
    });
  }, [findings]);

  // Stato per Area Aziendale calcolato dinamicamente
  const contextualNotes = React.useMemo(() => {
    const emailFindings = findings.filter(f => f.category === 'configuration' && (f.id.includes('dmarc') || f.id.includes('spf') || f.id.includes('dkim')));
    const webFindings = findings.filter(f => f.id.includes('hsts') || f.id.includes('csp') || f.id.includes('xfo') || f.id.includes('ssl') || f.id.includes('cookie'));
    const netFindings = findings.filter(f => f.id.includes('port') || f.id.includes('blacklist') || f.id.includes('latency') || f.category === 'availability');
    const appFindings = findings.filter(f => f.id.includes('file') || f.id.includes('cors') || f.id.startsWith('pentest'));

    return [
      {
        category: 'Autenticazione Email & Postura Dominio',
        title: emailFindings.length > 0 ? emailFindings[0].title : 'Configurazione SPF, DKIM & DMARC',
        status: emailFindings.length > 0 ? (emailFindings.some(f => f.severity === 'high') ? 'Intervento Richiesto' : 'In Corso di Hardening') : 'Conforme Standard Moderni',
        statusClass: emailFindings.length > 0 ? 'bg-[#d97706]/20 text-[#fbbf24] border-[#b45309]' : 'bg-[#064e3b]/30 text-[#34d399] border-[#059669]',
        explanation: emailFindings.length > 0 
          ? emailFindings.map(f => f.description).join(' ') 
          : 'I record di autenticazione email (SPF, DKIM, DMARC) risultano configurati o non sono state riscontrate anomalie nei controlli passivi.',
        action: emailFindings.length > 0 
          ? (emailFindings[0].remediation?.action || 'Rivedere i record DNS autorizzativi.') 
          : 'Mantenere il monitoraggio periodico dei flussi di recapito email.'
      },
      {
        category: 'Web Server Hardening & Crittografia',
        title: webFindings.length > 0 ? webFindings[0].title : 'Protezione HTTPS, HSTS & Headers',
        status: webFindings.length > 0 ? (webFindings.some(f => f.severity === 'high' || f.severity === 'critical') ? 'Intervento Richiesto' : 'Migliorabile') : 'Conforme Standard Moderni',
        statusClass: webFindings.length > 0 ? 'bg-[#d97706]/20 text-[#fbbf24] border-[#b45309]' : 'bg-[#064e3b]/30 text-[#34d399] border-[#059669]',
        explanation: webFindings.length > 0
          ? webFindings.map(f => f.description).join(' ')
          : 'Il server applica parametri crittografici TLS validi e gli header protettivi fondamentali sono attivi.',
        action: webFindings.length > 0
          ? (webFindings[0].remediation?.action || 'Aggiornare la configurazione del web server.')
          : 'Nessuna azione urgente richiesta. Verificare periodicamente il ciclo di rinnovo TLS.'
      },
      {
        category: 'Infrastruttura di Rete & Porte Esterne',
        title: netFindings.length > 0 ? netFindings[0].title : 'Superficie di Rete & Firewall',
        status: netFindings.length > 0 ? (netFindings.some(f => f.severity === 'critical') ? 'Criticità Esposizione' : 'Attenzione') : 'Nessuna Porta Critica Rilevata',
        statusClass: netFindings.length > 0 ? (netFindings.some(f => f.severity === 'critical') ? 'bg-[#991b1b]/20 text-[#f87171] border-[#7f1d1d]' : 'bg-[#d97706]/20 text-[#fbbf24] border-[#b45309]') : 'bg-[#064e3b]/30 text-[#34d399] border-[#059669]',
        explanation: netFindings.length > 0
          ? netFindings.map(f => f.description).join(' ')
          : 'I controlli sulle porte standard e sulle blacklist DNSBL non hanno evidenziato servizi database o intermediari esposti senza autorizzazione.',
        action: netFindings.length > 0
          ? (netFindings[0].remediation?.action || 'Restringere le regole firewall su IP fidati.')
          : 'Mantenere attive le regole restrittive di default sul firewall perimetrale.'
      },
      {
        category: 'Integrità Applicativa & File Sensibili',
        title: appFindings.length > 0 ? appFindings[0].title : 'Superficie Applicativa & Leak',
        status: appFindings.length > 0 ? (appFindings.some(f => f.severity === 'critical') ? 'Vulnerabilità Confermata' : 'Attenzione Richiesta') : 'Nessun Leak Rilevato',
        statusClass: appFindings.length > 0 ? 'bg-[#991b1b]/20 text-[#f87171] border-[#7f1d1d]' : 'bg-[#064e3b]/30 text-[#34d399] border-[#059669]',
        explanation: appFindings.length > 0
          ? appFindings.map(f => f.description).join(' ')
          : 'Non sono stati riscontrati file di configurazione (.env, .git), backup di database o misconfigurazioni CORS con credenziali riflettute.',
        action: appFindings.length > 0
          ? (appFindings[0].remediation?.action || 'Rimuovere i file esposti e correggere i permessi web.')
          : 'Mantenere bloccate le estensioni critiche nella configurazione del reverse proxy.'
      }
    ];
  }, [findings]);

  // Lista ordinata per severità per i filtri IT-Pro
  const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  const sortedRemediations = React.useMemo(() => {
    return [...remediationList].sort((a, b) => (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0));
  }, [remediationList]);

  const filteredList = filterSeverity === 'all'
    ? sortedRemediations
    : sortedRemediations.filter(item => item.severity === filterSeverity);

  // Top 3 azioni prioritarie da proporre all'imprenditore / team IT
  const topActionCards = React.useMemo(() => {
    if (sortedRemediations.length === 0) {
      return [
        {
          title: 'Mantenere il monitoraggio continuo dei flussi email',
          why: 'I record SPF e DMARC risultano attivi e non mostrano anomalie di spoofing al momento dell\'ispezione.',
          priority: <StatusPill tone="ok">Verificato</StatusPill>,
          snippet: undefined,
        },
        {
          title: 'Supervisionare la scadenza dei certificati crittografici',
          why: 'La crittografia TLS è operativa. Si raccomanda di accertarsi del rinnovo automatico periodico.',
          priority: <StatusPill tone="ok">Verificato</StatusPill>,
          snippet: undefined,
        },
        {
          title: 'Preservare l\'isolamento delle porte di backend',
          why: 'Nessuna porta di database (MySQL, PostgreSQL, Redis) è esposta su interfaccia pubblica.',
          priority: <StatusPill tone="ok">Verificato</StatusPill>,
          snippet: undefined,
        }
      ];
    }

    return sortedRemediations.slice(0, 3).map(item => ({
      title: item.title,
      why: item.businessImpact || item.threatDescription,
      priority: item.severity === 'critical' ? (
        <StatusPill tone="crit">Priorità Critica</StatusPill>
      ) : item.severity === 'high' ? (
        <StatusPill tone="warn">Priorità Alta</StatusPill>
      ) : item.severity === 'medium' ? (
        <StatusPill tone="warn">Priorità Media</StatusPill>
      ) : (
        <StatusPill tone="low">Priorità Bassa</StatusPill>
      ),
      snippet: item.solutionCommand.split('\n')[0],
    }));
  }, [sortedRemediations]);

  const downloadExecutivePdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header Dark
    doc.setFillColor(10, 15, 26);
    doc.rect(0, 0, pageWidth, 42, 'F');

    doc.setTextColor(0, 240, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('AIUTIAMOCI IMPRESA — EXECUTIVE AUDIT REPORT', 14, 18);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const scoreText = hasExecutedTests 
      ? `Punteggio Postura: ${assessment.overallScore}/100 (Grado ${assessment.grade})` 
      : 'Punteggio Postura: In attesa di scansione';
    const coverageText = `Copertura Esecutiva: ${assessment.coverage?.coveragePercentage ?? 100}%`;
    doc.text(`Target: ${target} | ${scoreText} | ${coverageText}`, 14, 28);
    doc.text(`Data Report: ${new Date().toLocaleDateString('it-IT')} | Metodologia: Zero-Mock Low-Level Probing`, 14, 34);

    // Box 1: Sintesi Esecutiva & Chiarimento Punteggio
    doc.setFillColor(240, 245, 255);
    doc.rect(14, 48, pageWidth - 28, 32, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SINTESI ESECUTIVA & INTERPRETAZIONE DELLA POSTURA:', 18, 55);
    doc.setFont('helvetica', 'normal');
    
    const summaryLines = doc.splitTextToSize(assessment.summary || 'Valutazione completata senza anomalie bloccanti.', pageWidth - 36);
    doc.text(summaryLines, 18, 62);

    if (assessment.coverage?.caveatNotes) {
      doc.setTextColor(180, 83, 9);
      doc.setFontSize(8);
      doc.text(`Nota Metodologica: ${assessment.coverage.caveatNotes}`, 18, 75);
    }

    // Box 2: Stato per Area Aziendale
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTE METODOLOGICHE & CONTESTUALIZZAZIONE DEI RISCHI PER AREA', 14, 88);

    const notesTableData = contextualNotes.map(n => [
      n.category.toUpperCase(),
      n.title,
      n.status,
      n.explanation
    ]);

    autoTable(doc, {
      startY: 94,
      head: [['Ambito', 'Elemento', 'Classificazione', 'Contestualizzazione Operativa']],
      body: notesTableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: 'bold' },
        1: { cellWidth: 38 },
        2: { cellWidth: 28 },
        3: { cellWidth: 'auto' },
      }
    });

    // Pagina 2: Matrice delle Correzioni
    doc.addPage();

    doc.setFillColor(10, 15, 26);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(0, 240, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PIANO DI BONIFICA & INTERVENTI PRIORITIZZATI', 14, 18);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Interventi raccomandati basati sulle evidenze riscontrate per ${target}`, 14, 25);

    const remediationTableData = sortedRemediations.length > 0 
      ? sortedRemediations.map(r => [
          r.severity.toUpperCase(),
          r.title,
          `${r.mitreDefend || 'D3-AHA'} / ${r.cwe || 'N/A'}`,
          r.solutionType,
          r.businessImpact,
          r.solutionCommand
        ])
      : [['INFO', 'Nessuna criticità identificata', 'N/A', 'Audit Positivo', 'Nessun intervento bloccante necessario', 'Superficie conforme ai controlli eseguiti']];

    autoTable(doc, {
      startY: 38,
      head: [['Priorità', 'Intervento', 'MITRE / CWE', 'Tecnologia', 'Impatto di Business', 'Configurazione / Snippet']],
      body: remediationTableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 16, fontStyle: 'bold' },
        1: { cellWidth: 36 },
        2: { cellWidth: 24, fontStyle: 'bold' },
        3: { cellWidth: 20 },
        4: { cellWidth: 40 },
        5: { cellWidth: 'auto', fontStyle: 'italic' },
      }
    });

    // Footer
    const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Documento riservato generato da Aiutiamoci Impresa — Diagnostic Tool Ops Pro | Pagina ${i} di ${pageCount}`, 14, doc.internal.pageSize.height - 8);
    }

    doc.save(`Executive_Report_Contestualizzato_${target}.pdf`);
  };

  const downloadJsonReport = () => {
    const reportData = {
      target,
      timestamp: new Date().toISOString(),
      overallScore: hasExecutedTests ? assessment.overallScore : null,
      grade: hasExecutedTests ? assessment.grade : null,
      coverage: assessment.coverage,
      breakdown: assessment.breakdown,
      summary: assessment.summary,
      contextualNotes,
      findingsCount: findings.length,
      remediations: sortedRemediations
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audit_Security_Report_${target}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Executive & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-[1.625rem] font-bold leading-tight text-foreground">
            {perspectiveMode === 'executive' ? 'Riepilogo esecutivo' : 'Console diagnostica e bonifica'}
          </h1>
          <p className="mt-1 text-[0.9375rem] text-ink-2">
            {perspectiveMode === 'executive'
              ? 'Postura di rischio, azioni chiave per il team IT e stato per area aziendale.'
              : 'Dettaglio a basso livello, mappatura MITRE/CWE e configurazioni operative.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={downloadJsonReport}
            className="text-xs"
          >
            <FileText className="size-4 mr-2" aria-hidden="true" />
            Esporta JSON
          </Button>

          <Button
            variant="default"
            onClick={onOpenExportModal ? onOpenExportModal : downloadExecutivePdf}
            className="text-xs"
          >
            <Download className="size-4 mr-2" aria-hidden="true" />
            Scarica PDF completo
          </Button>
        </div>
      </div>

      {/* Punteggio unico grande + verdetto calcolato dinamicamente */}
      <div className="rounded-lg border border-border bg-surface p-6 sm:p-8">
        <BigScore
          score={hasExecutedTests ? assessment.overallScore : null}
          verdict={
            !hasExecutedTests
              ? `In attesa di esecuzione diagnostica per ${target}.`
              : assessment.overallScore >= 85
              ? 'La postura del dominio risulta solida e conforme.'
              : assessment.overallScore >= 60
              ? 'Attenzione richiesta su alcuni parametri di sicurezza.'
              : 'Rilevate criticità significative che richiedono bonifica.'
          }
          tone={
            !hasExecutedTests
              ? 'neutral'
              : assessment.overallScore >= 85
              ? 'ok'
              : assessment.overallScore >= 60
              ? 'warn'
              : 'crit'
          }
        >
          <p className="text-[0.9375rem] text-ink-2">
            {!hasExecutedTests
              ? 'Avvia i moduli diagnostici per calcolare il punteggio di esposizione e la matrice delle raccomandazioni.'
              : findings.length === 0
              ? 'Nessun problema bloccante riscontrato nelle verifiche effettuate.'
              : `Rilevate ${findings.length} osservazioni. Consulta i consigli prioritari sotto da girare al team IT.`}
          </p>
          {hasExecutedTests && (
            <details className="mt-3 cursor-pointer text-xs text-accent">
              <summary className="font-semibold select-none hover:underline">Dettaglio scomposizione punteggio</summary>
              <div className="mt-2 space-y-1.5 rounded-md border border-border bg-field p-3 font-mono text-[0.8125rem] text-ink-2">
                <p>• {assessment.breakdown.formulaExplanation}</p>
                <p>• Copertura esecutiva moduli: {assessment.coverage?.coveragePercentage ?? 100}% ({assessment.coverage?.completedModules ?? 1}/{assessment.coverage?.totalModules ?? 1} completati).</p>
                {assessment.coverage?.caveatNotes && (
                  <p className="text-warn">⚠️ {assessment.coverage.caveatNotes}</p>
                )}
              </div>
            </details>
          )}
        </BigScore>
      </div>

      {/* Cosa chiedere al team IT (3 azioni principali) */}
      <div className="space-y-4">
        <h2 className="text-[1.0625rem] font-bold text-foreground">Cosa chiedere al team IT</h2>
        
        <div className="space-y-3">
          {topActionCards.map((card, idx) => (
            <ActionCard
              key={idx}
              n={idx + 1}
              title={card.title}
              why={card.why}
              priority={card.priority}
            >
              {card.snippet && (
                <div className="mt-2">
                  <span className="inline-block rounded bg-field border border-field-border px-2.5 py-1 font-mono text-xs text-foreground truncate max-w-full">
                    {card.snippet}
                  </span>
                </div>
              )}
            </ActionCard>
          ))}
        </div>
      </div>

      {/* Stato per area come righe espandibili */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-[1.0625rem] font-bold text-foreground">Stato per area</h2>
          <p className="text-[0.8125rem] text-ink-2">Apri una riga per vedere il dettaglio tecnico e l&apos;azione consigliata.</p>
        </div>

        <RowList>
          {contextualNotes.map((note, idx) => (
            <ExpandableRow
              key={idx}
              status={
                note.status.includes('Conforme') || note.status.includes('Nessun') ? (
                  <StatusPill tone="ok" />
                ) : note.status.includes('Intervento') || note.status.includes('Criticità') ? (
                  <StatusPill tone="crit" />
                ) : (
                  <StatusPill tone="warn" />
                )
              }
              title={note.category}
              summary={note.title}
              value={note.status}
            >
              <div className="space-y-2 pt-1 text-[0.875rem]">
                <p className="text-foreground">{note.explanation}</p>
                <div className="rounded-md border border-border bg-field p-3 text-xs">
                  <strong className="text-ink-2">Azione consigliata: </strong>
                  <span className="text-foreground">{note.action}</span>
                </div>
              </div>
            </ExpandableRow>
          ))}
        </RowList>
      </div>

      {/* Vista IT Pro: Matrice Correzioni Tecniche con Snippet */}
      {perspectiveMode === 'it-pro' && (
        <div className="space-y-4 pt-6 border-t border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[1.0625rem] font-bold text-foreground">
              Configurazioni di risoluzione e comandi ({filteredList.length})
            </h2>

            {/* Severity Filters */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-ink-3 mr-1">Filtra:</span>
              {['all', 'critical', 'high', 'medium', 'info'].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                    filterSeverity === sev
                      ? 'bg-accent-bg text-accent border-accent/40'
                      : 'bg-surface text-ink-2 border-border hover:bg-hover'
                  }`}
                >
                  {sev.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {filteredList.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-ink-2">
              Nessun intervento di remediation corrispondente ai filtri attuali.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border bg-surface p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill
                        tone={item.severity === 'critical' ? 'crit' : item.severity === 'high' ? 'warn' : 'low'}
                      >
                        {item.severity.toUpperCase()}
                      </StatusPill>
                      <span className="font-mono text-xs text-ink-2 bg-field px-2 py-0.5 rounded border border-field-border">
                        {item.solutionType}
                      </span>
                      {item.mitreDefend && (
                        <span className="font-mono text-xs text-accent bg-accent-bg px-2 py-0.5 rounded">
                          MITRE: {item.mitreDefend}
                        </span>
                      )}
                      {item.cwe && (
                        <span className="font-mono text-xs text-ink-3 bg-field px-2 py-0.5 rounded">
                          {item.cwe}
                        </span>
                      )}
                      <h3 className="font-bold text-foreground text-sm">{item.title}</h3>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(item.solutionCommand, item.id)}
                      className="text-xs"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="size-3.5 mr-1 text-ok" aria-hidden="true" />
                          Copiato
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5 mr-1" aria-hidden="true" />
                          Copia comando
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-ink-2">
                    <div className="rounded border border-border bg-field p-2.5">
                      <span className="font-bold text-ink-3 block mb-0.5">VULNERABILITÀ RILEVATA</span>
                      <span>{item.threatDescription}</span>
                    </div>
                    <div className="rounded border border-border bg-field p-2.5">
                      <span className="font-bold text-warn block mb-0.5">IMPATTO SUL CLIENTE</span>
                      <span>{item.businessImpact}</span>
                    </div>
                  </div>

                  <CommandBlock
                    command={item.solutionCommand}
                    label="Configurazione / comando da applicare:"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
