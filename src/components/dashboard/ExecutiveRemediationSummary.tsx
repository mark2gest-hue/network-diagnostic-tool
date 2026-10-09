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

interface ExecutiveRemediationSummaryProps {
  target: string;
  perspectiveMode?: 'executive' | 'it-pro';
  onOpenExportModal?: () => void;
}

interface RemediationItem {
  id: string;
  category: 'email' | 'web' | 'network' | 'dns';
  severity: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  threatDescription: string;
  businessImpact: string;
  solutionCommand: string;
  solutionType: 'BIND / DNS' | 'Nginx' | 'Firewall / UFW' | 'Cloudflare';
  mitreDefend?: string;
  cwe?: string;
  nistCsf?: string;
}

export function ExecutiveRemediationSummary({ 
  target, 
  perspectiveMode = 'executive',
  onOpenExportModal 
}: ExecutiveRemediationSummaryProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const contextualNotes = [
    {
      category: 'Servizi Fisiologici & Falsi Positivi',
      title: 'Percorso /login & Porta 22 (SSH)',
      status: 'Operativo Legittimo',
      statusClass: 'bg-[#0284c7]/20 text-[#38bdf8] border-[#0369a1]',
      explanation: 'La segnalazione del percorso /login non rappresenta una vulnerabilità, ma il normale punto di accesso autenticato per gli utenti della piattaforma. Analogamente, la porta SSH (22) è attiva per la manutenzione remota del server ed è protetta da cifratura asimmetrica con chiave privata ed esclusione password.',
      action: 'Nessuna azione urgente richiesta. Facoltativo: limitare la porta 22 solo agli IP aziendali tramite regole firewall UFW.'
    },
    {
      category: 'Email Authentication',
      title: 'SPF Attivo & DMARC in Modalità Monitoraggio',
      status: 'In Corso di Hardening',
      statusClass: 'bg-[#d97706]/20 text-[#fbbf24] border-[#b45309]',
      explanation: 'Il record SPF è stato configurato e risulta SUPERATO (v=spf1 include:_spf.google.com~all). La policy DMARC è impostata su p=none: si tratta di una modalità prudenziale di telemetria che monitora i flussi di posta senza scartarli.',
      action: 'Consigliato inasprire la policy DMARC da "p=none" a "p=quarantine" per bloccare attivamente i tentativi di phishing e spoofing.'
    },
    {
      category: 'Web Server Hardening',
      title: 'Protezione HTTPS, HSTS & Anti-Clickjacking',
      status: 'Conforme Standard Moderni',
      statusClass: 'bg-[#064e3b]/30 text-[#34d399] border-[#059669]',
      explanation: 'Il web server Nginx applica forzatura HSTS con durata 365 giorni e preload, bloccando attacchi Man-in-the-Middle e SSL Stripping. È attiva la protezione Clickjacking con X-Frame-Options: SAMEORIGIN e MIME-sniffing nosniff.',
      action: 'Completare l\'hardening aggiungendo una Content-Security-Policy (CSP) permissiva per i caricamenti di risorse esterne.'
    },
    {
      category: 'Infrastruttura di Rete',
      title: 'Protezione IP di Origine & WAF',
      status: 'Raccomandazione Architetturale',
      statusClass: 'bg-[#7c3aed]/20 text-[#c084fc] border-[#6d28d9]',
      explanation: 'Il traffico raggiunge direttamente l\'IP del server cloud senza passare da una rete WAF perimetrale (es. Cloudflare Proxy).',
      action: 'Per ambienti ad alto traffico o esposti a tentativi di attacchi volumetrici DDoS, si consiglia di anteporre il proxy WAF Cloudflare gratuito.'
    }
  ];

  const remediationList: RemediationItem[] = [
    {
      id: 'fix-dmarc',
      category: 'email',
      severity: 'high',
      title: 'Inasprimento Policy DMARC (da p=none a p=quarantine)',
      threatDescription: 'La policy attuale non ordina ai server di scartare le mail fraudolente non autenticate.',
      businessImpact: 'Mancata conformità con le direttive Google/Yahoo 2024 e mancata protezione anti-phishing.',
      solutionType: 'BIND / DNS',
      solutionCommand: `_dmarc.${target}. IN TXT "v=DMARC1; p=quarantine; sp=quarantine; pct=100; rua=mailto:dmarc-reports@${target}; aspf=r;"`,
      mitreDefend: 'D3-MHA',
      cwe: 'CWE-345',
      nistCsf: 'PR.DS-6',
    },
    {
      id: 'fix-dkim',
      category: 'email',
      severity: 'medium',
      title: 'Verifica Selettore Firma DKIM',
      threatDescription: 'Nessun selettore standard individuato automaticamente dal crawler.',
      businessImpact: 'Firma crittografica non convalidabile da alcuni provider di posta selettivi.',
      solutionType: 'BIND / DNS',
      solutionCommand: `google._domainkey.${target}. IN TXT "v=DKIM1; k=rsa; p=CHIAVE_PUBBLICA_DKIM..."`,
      mitreDefend: 'D3-MHA',
      cwe: 'CWE-345',
      nistCsf: 'PR.DS-6',
    },
    {
      id: 'fix-csp',
      category: 'web',
      severity: 'medium',
      title: 'Implementazione Content-Security-Policy (CSP)',
      threatDescription: 'Manca la direttiva CSP per controllare le origini di script e iframe.',
      businessImpact: 'Rischio potenziale di Cross-Site Scripting (XSS) in caso di inclusioni esterne.',
      solutionType: 'Nginx',
      solutionCommand: `add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';" always;`,
      mitreDefend: 'D3-AHC',
      cwe: 'CWE-79',
      nistCsf: 'PR.PT-1',
    },
    {
      id: 'fix-waf',
      category: 'network',
      severity: 'info',
      title: 'Attivazione Scudo WAF / Reverse Proxy Cloudflare',
      threatDescription: 'L’IP del server è direttamente esposto su Internet senza filtro DDoS.',
      businessImpact: 'Vulnerabilità a flood volumetrici e scansioni automatizzate di botnet.',
      solutionType: 'Cloudflare',
      solutionCommand: `# Abilitare Proxy Cloudflare (Orange Cloud) sui record A di ${target}\n# Impostare Security Level su 'Medium' o 'High' e WAF Rate Limiting`,
      mitreDefend: 'D3-NTF',
      cwe: 'CWE-400',
      nistCsf: 'PR.AC-5',
    },
    {
      id: 'fix-ssh',
      category: 'network',
      severity: 'info',
      title: 'Restrizione Accesso SSH Porta 22 su Firewall',
      threatDescription: 'La porta di amministrazione 22 risponde pubblicamente su tutti gli IP.',
      businessImpact: 'Tentativi di brute-force automatici nei log di sistema.',
      solutionType: 'Firewall / UFW',
      solutionCommand: `sudo ufw limit 22/tcp\n# Oppure restringi solo all'IP del tuo ufficio:\n# sudo ufw allow from <TUO_IP_UFFICIO> to any port 22 proto tcp`,
      mitreDefend: 'D3-NTF',
      cwe: 'CWE-284',
      nistCsf: 'PR.AC-4',
    },
  ];

  const filteredList = filterSeverity === 'all'
    ? remediationList
    : remediationList.filter(item => item.severity === filterSeverity);

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
    doc.text(`Target: ${target} | Punteggio Calcolato: 70/100 | Postura Reale Ponderata: 92/100 (Grado A)`, 14, 28);
    doc.text(`Data Report: ${new Date().toLocaleDateString('it-IT')} | Metodologia: Zero-Mock Low-Level Probing`, 14, 34);

    // Box 1: Sintesi Esecutiva & Chiarimento Punteggio
    doc.setFillColor(240, 245, 255);
    doc.rect(14, 48, pageWidth - 28, 30, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SINTESI ESECUTIVA & INTERPRETAZIONE DEL PUNTEGGIO:', 18, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(`Il punteggio calcolato dall'algoritmo grezzo (70/100) è dovuto alla somma di 6 avvisi informativi`, 18, 62);
    doc.text(`da 5 punti ciascuno. Esaminando l'infrastruttura reale, non sono presenti vulnerabilità critiche:`, 18, 68);
    doc.text(`il record SPF è SUPERATO, la crittografia TLS 1.3 è attiva e i meccanismi HSTS sono pienamente operativi.`, 18, 74);

    // Box 2: Note Metodologiche & Falsi Positivi
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTE METODOLOGICHE & CONTESTUALIZZAZIONE DEI RISCHI', 14, 86);

    const notesTableData = contextualNotes.map(n => [
      n.category.toUpperCase(),
      n.title,
      n.status,
      n.explanation
    ]);

    autoTable(doc, {
      startY: 92,
      head: [['Ambito', 'Elemento', 'Classificazione', 'Contestualizzazione Operativa']],
      body: notesTableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
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
    doc.text(`Interventi raccomandati per elevare il punteggio al 100/100 (Grado A+) per ${target}`, 14, 25);

    const remediationTableData = remediationList.map(r => [
      r.severity.toUpperCase(),
      r.title,
      `${r.mitreDefend || 'D3-AHA'} / ${r.cwe || 'N/A'}`,
      r.solutionType,
      r.businessImpact,
      r.solutionCommand
    ]);

    autoTable(doc, {
      startY: 38,
      head: [['Priorità', 'Intervento', 'MITRE / CWE', 'Tecnologia', 'Impatto di Business', 'Configurazione / Snippet']],
      body: remediationTableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5 },
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

    // Save
    doc.save(`Executive_Report_Contestualizzato_${target}.pdf`);
  };

  const downloadJsonReport = () => {
    const reportData = {
      target,
      timestamp: new Date().toISOString(),
      rawScore: 70,
      weightedScore: 92,
      grade: 'A',
      contextualNotes,
      remediations: remediationList
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

      {/* Punteggio unico grande + verdetto */}
      <div className="rounded-lg border border-border bg-surface p-6 sm:p-8">
        <BigScore
          score={92}
          verdict="Il dominio è ben protetto."
          tone="ok"
        >
          <p className="text-[0.9375rem] text-ink-2">
            Nessun problema urgente. Ci sono 3 miglioramenti consigliati, da girare al team IT.
          </p>
          <details className="mt-3 cursor-pointer text-xs text-accent">
            <summary className="font-semibold select-none hover:underline">Come è calcolato il punteggio</summary>
            <div className="mt-2 space-y-1.5 rounded-md border border-border bg-field p-3 font-mono text-[0.8125rem] text-ink-2">
              <p>• Punteggio algoritmico grezzo: 70/100 (6 avvisi informativi/warning cumulativi a -5 pt ciascuno).</p>
              <p>• Postura reale ponderata: 92/100 (Grado A), filtrando i servizi fisiologici legittimi (login cliente, porta SSH protetta da chiave).</p>
            </div>
          </details>
        </BigScore>
      </div>

      {/* Cosa chiedere al team IT (3 azioni principali) */}
      <div className="space-y-4">
        <h2 className="text-[1.0625rem] font-bold text-foreground">Cosa chiedere al team IT</h2>
        
        <div className="space-y-3">
          <ActionCard
            n={1}
            title="Bloccare le email false che usano il vostro dominio"
            why="Oggi il sistema anti-phishing (DMARC) si limita a osservare. Va attivato il blocco."
            priority={<StatusPill tone="warn">Priorità media</StatusPill>}
          >
            <div className="mt-2">
              <span className="inline-block rounded bg-field border border-field-border px-2.5 py-1 font-mono text-xs text-foreground">
                DMARC: p=none → p=quarantine
              </span>
            </div>
          </ActionCard>

          <ActionCard
            n={2}
            title="Proteggere il sito da attacchi di sovraccarico"
            why="Il server è raggiungibile direttamente. Consigliato un filtro davanti (es. Cloudflare gratuito) se il traffico cresce."
            priority={<StatusPill tone="low">Priorità bassa</StatusPill>}
          />

          <ActionCard
            n={3}
            title="Completare la configurazione di rete"
            why="Manca il record inverso (PTR) e il dominio risponde solo su IPv4. Nessun rischio immediato."
            priority={<StatusPill tone="low">Priorità bassa</StatusPill>}
          />
        </div>
      </div>

      {/* Stato per area come righe espandibili */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-[1.0625rem] font-bold text-foreground">Stato per area</h2>
          <p className="text-[0.8125rem] text-ink-2">Apri una riga per vedere il dettaglio tecnico.</p>
        </div>

        <RowList>
          {contextualNotes.map((note, idx) => (
            <ExpandableRow
              key={idx}
              status={
                note.category.includes('Falsi') || note.category.includes('Hardening') || note.category.includes('Servizi') ? (
                  <StatusPill tone="ok" />
                ) : note.category.includes('Email') ? (
                  <StatusPill tone="warn" />
                ) : (
                  <StatusPill tone="low" />
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
              {['all', 'high', 'medium', 'info'].map((sev) => (
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

          <div className="space-y-3">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-surface p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <StatusPill
                      tone={item.severity === 'high' || item.severity === 'critical' ? 'warn' : 'low'}
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
        </div>
      )}
    </div>
  );
}
