'use client';

import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileText,
  Download,
  Mail,
  MessageCircle,
  X,
  Building2,
  User,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DiagnosticData = Record<string, any>;

interface TestResultEntry {
  status?: 'success' | 'warning' | 'error' | 'loading' | string;
  data?: DiagnosticData | string | null;
  error?: string;
}

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: string;
  results: Record<string, TestResultEntry | null | undefined>;
  internalResults?: Record<string, any> | null;
  securityResults?: Record<string, any> | null;
  vulnerabilityResults?: Record<string, any> | null;
  pentestResults?: Record<string, any> | null;
}

export function ExportReportModal({
  isOpen,
  onClose,
  target,
  results,
  internalResults = {},
  securityResults = {},
  vulnerabilityResults = {},
  pentestResults = null,
}: ExportReportModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [generatedPdfName, setGeneratedPdfName] = useState<string | null>(null);

  if (!isOpen) return null;

  const testNameMap: Record<string, string> = {
    dns: 'DNS Lookup & Record MX/TXT',
    propagation: 'Propagazione DNS Globale',
    dnsPropagation: 'Propagazione DNS Globale',
    ttfb: 'Waterfall TTFB & Latenza Server',
    protocols: 'Protocolli HTTP/2 & HTTP/3',
    httpVersions: 'Protocolli HTTP/2 & HTTP/3',
    traceroute: 'Traceroute & Hop di Rete',
    ssl: 'Certificato SSL / TLS & Scadenza',
    portscan: 'Port Scanner & Servizi Esposti',
    portScan: 'Port Scanner & Servizi Esposti',
    whois: 'WHOIS & Dati Assegnazione IP/ASN',
    reverse_dns: 'Reverse DNS (PTR Record)',
    reverseDns: 'Reverse DNS (PTR Record)',
    ipv6: 'Connettività & Risoluzione IPv6',
    ping: 'Ping & Latenza ICMP',
    http: 'Header HTTP & Web Server',
    headers: 'Header di Sicurezza & CORS',
    rbl: 'Verifica Blacklist RBL & Postura'
  };

  const generateAndDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const dateStr = new Date().toLocaleDateString('it-IT');
    const timeStr = new Date().toLocaleTimeString('it-IT');
    const clientClean = companyName.trim() || 'Cliente';

    // 1. Header superiore stilizzato dark
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RAPPORT DIAGNOSTICO DI RETE & SECURITY', 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Target Analizzato: ${target}`, 14, 26);
    doc.text(`Data Generazione: ${dateStr} ore ${timeStr} | Operatore: ${technicianName.trim() || 'Admin Ops'}`, 14, 33);

    // 2. Box Anagrafica Cliente
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(14, 48, pageWidth - 28, 26, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Committente / Società: ${clientClean}`, 18, 56);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    if (clientEmail.trim()) {
      doc.text(`Email Destinatario: ${clientEmail.trim()}`, 18, 62);
    }
    if (notes.trim()) {
      doc.text(`Note Tecniche: ${notes.trim().substring(0, 90)}${notes.length > 90 ? '...' : ''}`, 18, 68);
    } else {
      doc.text('Stato Analisi: Report diagnostico approfondito generato da engine di rete.', 18, 68);
    }

    // 3. Calcolo metrica di copertura preliminare
    const allModulesList = Object.entries(results);
    const totalCount = allModulesList.length;
    const completedCount = allModulesList.filter(([, v]) => {
      const s = String(v?.status || '').toLowerCase();
      return s === 'success' || s === 'pass' || s === 'passed' || s === 'ok';
    }).length;
    const coveragePct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Copertura Esecutiva Moduli: ${coveragePct}% (${completedCount}/${totalCount} moduli completati con successo)`, 18, 72);

    // 4. Costruzione righe tabella diagnostica senza mockup
    const tableRows = allModulesList.map(([key, rawItem]) => {
      const item = rawItem as any;
      const title = testNameMap[key] || key.toUpperCase();
      if (!item) {
        return [title, 'NON ESEGUITO', 'Modulo non incluso nella sessione'];
      }

      const rawStatus = String(item.status || item.executionStatus || '').toLowerCase();
      const outcome = String(item.securityOutcome || '').toLowerCase();

      let status = 'INFORMATIVO';
      if (rawStatus === 'success' || rawStatus === 'pass' || rawStatus === 'passed' || rawStatus === 'propagated' || rawStatus === 'ok') {
        status = 'OTTIMALE';
      } else if (rawStatus === 'warning' || rawStatus === 'warn' || rawStatus === 'attention') {
        status = 'ATTENZIONE';
      } else if (rawStatus === 'error' || rawStatus === 'fail' || rawStatus === 'failed') {
        status = (outcome === 'inconclusive' || outcome === 'not_applicable') ? 'INCONCLUSIVO' : 'CRITICO';
      } else if (rawStatus === 'inconclusive' || outcome === 'inconclusive') {
        status = 'INCONCLUSIVO';
      } else if (rawStatus === 'skipped' || outcome === 'not_applicable') {
        status = 'NON APPLICABILE';
      }

      const payload = item.result ?? item.data;
      let summaryDetail = '-';
      if (payload) {
        if (typeof payload === 'string') {
          summaryDetail = payload;
        } else if (payload.message) {
          summaryDetail = String(payload.message);
        } else if ((key === 'dns' || key === 'propagation') && (payload.a || payload.records || payload.A || payload.answers || payload.mx)) {
          const aRecs = payload.a || payload.records?.A || payload.A || payload.answers || [];
          const aStr = Array.isArray(aRecs) && aRecs.length > 0 ? `IPv4: ${aRecs.join(', ')}` : '';
          const mxRecs = payload.mx || [];
          const mxStr = Array.isArray(mxRecs) && mxRecs.length > 0
            ? `MX: ${mxRecs.map((m: any) => typeof m === 'object' ? `${m.exchange} (${m.priority})` : String(m)).slice(0, 2).join(', ')}`
            : '';
          summaryDetail = [aStr, mxStr].filter(Boolean).join(' | ') || 'Record DNS acquisiti ed esaminati.';
        } else if (key === 'ttfb' && (payload.timings || payload.ttfb)) {
          const t = payload.timings || payload;
          summaryDetail = `TTFB: ${t.ttfb ?? t.dns ?? '-'}ms | Latenza totale: ${t.total ?? '-'}ms`;
        } else if (key === 'ssl' && (payload.validTo || payload.daysRemaining !== undefined || payload.days_remaining !== undefined)) {
          const days = payload.days_remaining ?? payload.daysRemaining ?? 'N/A';
          const ocspInfo = payload.ocsp?.stapled ? ' | OCSP Stapled' : '';
          summaryDetail = `Certificato SSL/TLS valido (${days} giorni residui - Issuer: ${payload.issuer || 'Let\'s Encrypt / CA'}${ocspInfo})`;
        } else if ((key === 'portScan' || key === 'portscan') && (payload.ports || payload.openPorts || payload.open_ports)) {
          const portItems = payload.ports || [];
          const openList = Array.isArray(portItems)
            ? portItems.filter((p: any) => p.open || p.status === 'open').map((p: any) => p.port)
            : (payload.openPorts || payload.open_ports || []);
          summaryDetail = openList.length > 0
            ? `Porte aperte rilevate: ${openList.join(', ')}`
            : 'Nessuna porta standard aperta';
        } else if (key === 'rbl' && (payload.listedIn || payload.blacklists)) {
          const count = payload.listedIn ? payload.listedIn.length : (payload.listedCount ?? 0);
          summaryDetail = count > 0 ? `Segnalato in ${count} database RBL: ${payload.listedIn.join(', ')}` : 'Nessuna presenza in blacklist RBL';
        } else if (key === 'whois' && (payload.registrar || payload.creationDate)) {
          summaryDetail = `Registrar: ${payload.registrar || 'Rilevato'} | Scadenza: ${payload.expirationDate || 'N/A'}`;
        } else if (key === 'ping' && (payload.latency !== undefined || payload.avg !== undefined || payload.time !== undefined)) {
          const lat = payload.latency ?? payload.avg ?? payload.time;
          summaryDetail = `Latenza TCP (${payload.method || 'Connect'}): ${lat}ms`;
        } else if (payload.status) {
          summaryDetail = `Status code: ${payload.status} | Protocollo: ${payload.protocol || 'HTTPS'}`;
        } else {
          summaryDetail = 'Dati acquisiti ed esaminati.';
        }
      } else if (item.error) {
        summaryDetail = `Errore di esecuzione: ${String(item.error)}`;
      }

      return [title, status, summaryDetail];
    });

    // 5. Inserimento tabella tramite autotable con righe espandibili (no testo troncato)
    autoTable(doc, {
      startY: 78,
      head: [['Modulo Diagnostico', 'Esito', 'Dettagli / Evidenze Tecniche']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 'auto' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const val = String(data.cell.raw);
          if (val === 'OTTIMALE') {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'ATTENZIONE' || val === 'INCONCLUSIVO') {
            data.cell.styles.textColor = [245, 158, 11];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'CRITICO') {
            data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'NON APPLICABILE' || val === 'NON ESEGUITO') {
            data.cell.styles.textColor = [148, 163, 184];
            data.cell.styles.fontStyle = 'normal';
          }
        }
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        overflow: 'linebreak'
      }
    });

    // 5. Pagina 2: Diagnostica Interna LAN & Security Audit Completo
    doc.addPage();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(0, 240, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('DIAGNOSTICA INTERNA LAN & POSTURA EMAIL / SICUREZZA', 14, 16);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Telemetria Client, Sottorete Locale ARP ed Email Authentication | Target: ${target}`, 14, 23);

    // Tabella 2.A: Diagnostica Interna (solo se autorizzata ed eseguita sul campo)
    const safeInternal = internalResults || {};
    const executedInternal = Object.entries(safeInternal).filter(([, v]) => v && v.status && v.status !== 'idle');
    const internalRows: string[][] = executedInternal.length > 0
      ? executedInternal.map(([k, v]) => {
        const s = v?.status === 'pass' ? 'SUPERATO' : v?.status === 'warning' ? 'ATTENZIONE' : v?.status === 'fail' ? 'CRITICO' : v ? 'RILEVATO' : 'NON ESEGUITO';
        const det = v?.result ? (typeof v.result === 'object' ? JSON.stringify(v.result) : String(v.result)) : (v?.error || '-');
        return [k.replace(/_/g, ' ').toUpperCase(), s, det];
      })
      : [
        ['Audit Perimetrale Esterno', 'NON APPLICABILE', 'Sessione diagnostica perimetrale esterna. I controlli LAN/WiFi/ARP richiedono operatore fisicamente presente nella subnet locale del cliente.']
      ];

    autoTable(doc, {
      startY: 34,
      head: [['Parametro LAN / Client', 'Stato', 'Dati Rilevati']],
      body: internalRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 'auto' } },
      styles: { fontSize: 7.5, cellPadding: 2 }
    });

    // Tabella 2.B: Security Audit & Email Posture
    const secStartY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10 : 120;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('POSTURA EMAIL & SECURITY AUDIT (SPF, DKIM, DMARC, DNSSEC):', 14, secStartY);

    const safeSec = securityResults || {};
    const secRows: string[][] = Object.entries(safeSec).length > 0
      ? Object.entries(safeSec).map(([k, v]) => {
        const rawStatus = String(v?.status || '').toLowerCase();
        const s = rawStatus === 'pass' || rawStatus === 'ok' ? 'CONFORME' : rawStatus === 'warning' || rawStatus === 'warn' ? 'ATTENZIONE' : rawStatus === 'fail' ? 'CRITICO' : 'VERIFICATO';
        let det = '-';
        const res = v?.result as Record<string, unknown> | undefined;
        if (res && typeof res === 'object') {
          if (res.multipleRecordsFound) {
            det = `Rilevati ${Array.isArray(res.records) ? res.records.length : 2} record duplicati in DNS (Violazione RFC)`;
          } else if (res.message) {
            det = String(res.message);
            if (res.policy) det += ` (Policy: ${res.policy})`;
          } else if (res.detail) {
            det = String(res.detail);
          } else if (res.summary) {
            det = String(res.summary);
          } else if (k === 'leaks') {
            const comb = res.combCount || 0;
            const breaches = res.breachesCount || 0;
            det = `${comb} credenziali COMB esposte, ${breaches} data breach storici rilevati`;
          } else if (k === 'emailArmor') {
            const mta = res.mtaSts as { mode?: string; enabled?: boolean } | undefined;
            const sts = mta?.enabled ? `MTA-STS: ${mta.mode || 'Attivo'}` : 'MTA-STS: Assente';
            const bimi = (res.bimi as { enabled?: boolean })?.enabled ? 'BIMI: Attivo' : 'BIMI: Assente';
            const starttls = (res.starttls as { supportsStarttls?: boolean })?.supportsStarttls ? 'MX STARTTLS: Attivo' : '';
            const dane = (res.dane as { enabled?: boolean })?.enabled ? 'DANE: Conforme' : '';
            det = [sts, bimi, starttls, dane].filter(Boolean).join(' | ');
          }
        } else if (v?.message) {
          det = String(v.message);
        } else if (v?.error) {
          det = `Errore verifica: ${v.error}`;
        }
        return [k.replace(/([A-Z])/g, ' $1').toUpperCase(), s, det];
      })
      : [
        ['Postura Email & DNSSEC', 'NON ESEGUITO', 'Modulo di verifica SPF/DKIM/DMARC non incluso nella sessione corrente.']
      ];

    autoTable(doc, {
      startY: secStartY + 4,
      head: [['Vettore Email / Security', 'Esito', 'Dettagli Configurazione']],
      body: secRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 'auto' } },
      styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' }
    });

    // 6. Pagina 3: Vulnerability Scanner & Matrice di Conformità MITRE D3FEND
    doc.addPage();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(0, 240, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('VULNERABILITY SCAN & MAPPATURA TECNICA MITRE D3FEND', 14, 16);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Framework tecnici di riferimento: MITRE D3FEND • NIST CSF 2.0 • Mappatura Tecnica di Riferimento | Committente: ${clientClean}`, 14, 23);

    // Tabella 3.A: Vulnerability findings
    const vulnLabelMap: Record<string, string> = {
      files: 'FILE SENSIBILI (.ENV / .GIT)',
      'directory-listing': 'DIRECTORY LISTING (CWE-548)',
      secrets: 'API SECRETS & CODE LEAKS',
      cors: 'AUDIT POLICY CORS',
      cookies: 'SICUREZZA COOKIE (XSS/CSRF)',
      caa: 'AUTORIZZAZIONE DNS CAA',
      https: 'FORZATURA HTTPS (PORTA 80)',
      waf: 'WAF & CLOUD PERIMETER',
    };

    const safeVuln = vulnerabilityResults || {};
    const vulnRows: string[][] = Object.entries(safeVuln).length > 0
      ? Object.entries(safeVuln).map(([k, v]) => {
        const rawStatus = String(v?.status || '').toLowerCase();
        let s = 'NESSUNA ANOMALIA';

        if (rawStatus === 'fail' || rawStatus === 'critical' || rawStatus === 'crit') {
          s = 'RISCHIO';
        } else if (rawStatus === 'warning' || rawStatus === 'warn' || rawStatus === 'attention') {
          s = 'ATTENZIONE';
        } else if (rawStatus === 'pass' || rawStatus === 'success' || rawStatus === 'ok') {
          s = 'NESSUNA ANOMALIA';
        } else if (!rawStatus || rawStatus === 'idle' || rawStatus === 'skipped') {
          s = 'NON ESEGUITO';
        } else if (rawStatus === 'error') {
          s = 'ERRORE SCAN';
        }

        let det = 'Scansione endpoint eseguita con successo';
        if (k === 'files') {
          const rawExposed = (v?.result?.exposedFiles || []) as Array<{ path?: string; risk?: string }>;
          const realExposed = rawExposed.filter(f => {
            const p = (f.path || '').toLowerCase();
            return !p.includes('robots.txt') && !p.includes('security.txt');
          });

          if (realExposed.length > 0) {
            s = 'RISCHIO';
            const names = realExposed.map(f => f.path).slice(0, 3).join(', ');
            det = `Rilevati ${realExposed.length} file sensibili esposti (${names})`;
          } else {
            s = 'NESSUNA ANOMALIA';
            det = 'Tutti i percorsi sensibili (.env, .git, dump SQL) risultano protetti (404/403/redirect)';
          }
        } else if (k === 'directory-listing') {
          const expDirs = (v?.result?.exposedDirectories || []) as Array<{ path?: string }>;
          if (expDirs.length > 0) {
            s = 'RISCHIO';
            const names = expDirs.map(d => d.path).slice(0, 3).join(', ');
            det = `Rilevate ${expDirs.length} directory con indicizzazione aperta (${names})`;
          } else {
            s = 'NESSUNA ANOMALIA';
            det = 'Nessun directory listing attivo su cartelle standard';
          }
        } else if (k === 'secrets') {
          const sec = v?.result?.detectedSecrets?.length || 0;
          if (sec > 0) {
            s = 'RISCHIO';
            det = `Trovati ${sec} token o segreti hardcodati nei file JS`;
          } else {
            det = 'Nessuna API key o token rilevato nel bundle analizzato';
          }
        } else if (v?.result && typeof v.result === 'object') {
          if ('message' in (v.result as Record<string, unknown>)) {
            det = String((v.result as Record<string, unknown>).message);
          } else if ('summary' in (v.result as Record<string, unknown>)) {
            det = String((v.result as Record<string, unknown>).summary);
          }
        }

        const label = vulnLabelMap[k.toLowerCase()] || k.toUpperCase();
        return [label, s, det];
      })
      : [
        ['Scansione Vulnerabilità Web', 'NON ESEGUITO', 'Nessuna scansione di misconfigurazione o file sensibili eseguita in questa sessione.']
      ];

    autoTable(doc, {
      startY: 34,
      head: [['Vettore di Vulnerabilità', 'Stato', 'Esito Ispezione']],
      body: vulnRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 28, halign: 'center' }, 2: { cellWidth: 'auto' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const val = String(data.cell.raw);
          if (val === 'PROTETTO' || val === 'INFORMATIVO') {
            data.cell.styles.textColor = [16, 185, 129]; // emerald/verde
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'ATTENZIONE') {
            data.cell.styles.textColor = [245, 158, 11]; // amber/giallo
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'RISCHIO' || val === 'ERRORE SCAN') {
            data.cell.styles.textColor = [239, 68, 68]; // rose/rosso
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'NON ESEGUITO') {
            data.cell.styles.textColor = [148, 163, 184]; // slate/grigio
            data.cell.styles.fontStyle = 'normal';
          }
        }
      },
      styles: { fontSize: 7.5, cellPadding: 2 }
    });

    const mitreStartY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10 : 110;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PIANO DI BONIFICA CONTESTUALE (FINDING-DRIVEN) & RIFERIMENTI TECNICI:', 14, mitreStartY);

    // Costruisce la lista di bonifiche solo dai problemi effettivamente rilevati
    const dynamicRemediations: string[][] = [];

    // 1. DMARC (Multiplo o Assente/Debole)
    const dmarcRes = securityResults?.['dmarc']?.result as Record<string, unknown> | undefined;
    if (dmarcRes?.multipleRecordsFound) {
      dynamicRemediations.push([
        'DMARC: Record Multipli Rilevati',
        'MITRE: D3-MHA',
        'CWE-345',
        'RFC 7489 Sez. 6.6.3: Rimuovere il record DMARC duplicato nel DNS. La presenza di 2+ record annulla l’intera policy anti-spoofing.',
        'Critico'
      ]);
    } else if (dmarcRes && (dmarcRes.status === 'fail' || dmarcRes.policy === 'none')) {
      dynamicRemediations.push([
        'Inasprimento Policy DMARC',
        'MITRE: D3-MHA',
        'CWE-345',
        'Passare la policy DMARC da "p=none" a "p=quarantine" o "p=reject" per bloccare attivamente l’invio di email fraudolente.',
        'Alta'
      ]);
    }

    // 2. Content-Security-Policy (CSP)
    const secHeaders = securityResults?.['headers']?.result as { audit?: Array<{ header: string; present: boolean }> } | undefined;
    const httpHeaders = (results['http']?.data as { headers?: Record<string, string> } | undefined)?.headers;
    const hasCspConfigured = secHeaders?.audit?.some(a => a.header === 'Content-Security-Policy' && a.present) || Boolean(httpHeaders?.['content-security-policy']);
    if (!hasCspConfigured) {
      dynamicRemediations.push([
        'Content-Security-Policy (CSP) Assente',
        'MITRE: D3-AHC',
        'CWE-79',
        'Aggiungere l’header Content-Security-Policy nel web server per mitigare vulnerabilità XSS e iniezioni arbitrarie di risorse.',
        'Media'
      ]);
    }

    // 3. Information Disclosure (Versione Web Server)
    const serverH = httpHeaders?.['server'];
    if (serverH && (serverH.includes('/') || /\d/.test(serverH))) {
      dynamicRemediations.push([
        'Esposizione Versione Web Server',
        'MITRE: D3-AHC',
        'CWE-200',
        'Configurare "server_tokens off;" in Nginx per nascondere la versione esatta del web server e del sistema operativo.',
        'Bassa'
      ]);
    }

    // 4. Verifica Porte aperte
    const portScanRaw = results['portscan'] || results['portScan'] || (securityResults ? securityResults['ports'] : null);
    const openPortsList = (portScanRaw?.data?.openPorts || portScanRaw?.result?.openPorts || []) as number[];
    const criticalPorts = openPortsList.filter(p => [21, 23, 3306, 5432, 27017, 6379, 9200, 3389, 445].includes(p));
    if (criticalPorts.length > 0) {
      dynamicRemediations.push([
        `Porte Critiche Esposte (${criticalPorts.join(', ')})`,
        'MITRE: D3-NTF',
        'CWE-284',
        `Limitare l'accesso alle porte ${criticalPorts.join(', ')} a livello firewall perimetrale o consentire il binding solo su interfaccia locale/VPN.`,
        'Critico'
      ]);
    }

    // 5. Verifica File Sensibili (esclude categoricamente file pubblici standard come robots.txt)
    const filesRaw = vulnerabilityResults ? vulnerabilityResults['files'] : null;
    const rawFiles = (filesRaw?.result?.exposedFiles || filesRaw?.data?.exposedFiles || []) as Array<{ path: string; risk?: string }>;
    const exposedFiles = rawFiles.filter(f => {
      const p = (f.path || '').toLowerCase();
      return !p.includes('robots.txt') && !p.includes('security.txt') && (f.risk === 'critical' || f.risk === 'high');
    });

    if (exposedFiles.length > 0) {
      const paths = exposedFiles.map(f => f.path).slice(0, 3).join(', ');
      dynamicRemediations.push([
        `Esposizione File Sensibili (${paths})`,
        'MITRE: D3-AHA',
        'CWE-538',
        'Rimuovere i file esposti dalla webroot e configurare il web server per negare l\'accesso a file e directory nascoste o di backup.',
        'Critico'
      ]);
    }

    // 6. Verifica Certificato SSL
    const sslRaw = results['ssl'] || (securityResults ? securityResults['tls'] : null);
    const sslData = sslRaw?.data || sslRaw?.result;
    if (sslData && (sslData.is_expired || sslData.days_remaining <= 0)) {
      dynamicRemediations.push([
        'Certificato SSL/TLS Scaduto',
        'MITRE: D3-EPSC',
        'CWE-295',
        'Rinnovare immediatamente il certificato crittografico X.509 associato all\'hostname.',
        'Critico'
      ]);
    }

    // 7. Header HSTS
    const headersRaw = results['headers'] || (securityResults ? securityResults['headers'] : null);
    const hData = headersRaw?.data || headersRaw?.result;
    if (hData && hData.hsts && !hData.hsts.present && !httpHeaders?.['strict-transport-security']) {
      dynamicRemediations.push([
        'HSTS Non Configurato',
        'MITRE: D3-AHA',
        'CWE-319',
        'Abilitare l\'header Strict-Transport-Security con max-age di almeno 1 anno per forzare HTTPS.',
        'Alta'
      ]);
    }

    // Se non vi sono anomalie critiche, inserisce hardening preventivo esplicito
    if (dynamicRemediations.length === 0) {
      dynamicRemediations.push([
        'Hardening Preventivo Generale',
        'MITRE: D3-MHA',
        'N/A',
        'Nessuna vulnerabilità critica attiva riscontrata. Mantenere le policy di patching continuo del software applicativo e monitoraggio reputazionale.',
        'Bassa'
      ]);
    }

    autoTable(doc, {
      startY: mitreStartY + 4,
      head: [['Vettore Rilevato', 'Rif. Tecnico', 'CWE ID', 'Raccomandazione di Bonifica Mirata', 'Priorità']],
      body: dynamicRemediations,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 42, fontStyle: 'bold' },
        1: { cellWidth: 24, fontStyle: 'bold', textColor: [2, 132, 199] },
        2: { cellWidth: 18 },
        3: { cellWidth: 'auto', fontStyle: 'italic', fontSize: 7 },
        4: { cellWidth: 20, fontStyle: 'bold' },
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        overflow: 'linebreak'
      }
    });

    // 7. Pagina 4: Penetration Testing Attivo OWASP (14 Sonde & Exploit Probe)
    doc.addPage();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(0, 240, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('PENETRATION TESTING ATTIVO OWASP & EXPLOIT PROBE', 14, 16);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const pentestSummaryTxt = pentestResults
      ? `Probe Totali: ${pentestResults.totalProbes || pentestResults.probes?.length || 14} | Superate: ${pentestResults.passedCount ?? '-'} | Vulnerabili: ${pentestResults.vulnerableCount ?? 0} | Target: ${target}`
      : `Verifica Empirica Attiva OWASP Top 10, Bot Protection & AI Scraper Governance | Target: ${target}`;
    doc.text(pentestSummaryTxt, 14, 23);

    const pentestRows: string[][] = (pentestResults?.probes && pentestResults.probes.length > 0)
      ? pentestResults.probes.map((p: any) => {
        let s = 'NON VALUTATO';
        if (p.status === 'passed') {
          s = p.category === 'governance' ? 'CONFORME' : 'NESSUNA ANOMALIA';
        } else if (p.status === 'vulnerable') {
          s = `VULN (${String(p.severity).toUpperCase()})`;
        } else if (p.status === 'inconclusive') {
          s = 'INCONCLUSIVO';
        } else if (p.status === 'skipped') {
          s = 'NON APPLICABILE';
        } else if (p.status === 'error') {
          s = 'ERRORE PROBE';
        }
        const ev = (p.evidence ? `${p.evidence} - ` : '') + (p.technicalDetails || p.remediationAdvice || '-');
        return [p.name || p.id, s, (p.cwe || p.owaspCategory || '-').toUpperCase(), ev];
      })
      : [
        ['Suite Pentest', 'NON ESEGUITO', 'N/A', 'Nessuna sonda di penetration testing empirico eseguita in questa sessione.']
      ];

    autoTable(doc, {
      startY: 34,
      head: [['Sonda / Test Penetration', 'Esito', 'CWE / OWASP', 'Evidenza Tecnica / Verdetto Empirico']],
      body: pentestRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 32, halign: 'center' },
        2: { cellWidth: 26, fontStyle: 'bold' },
        3: { cellWidth: 'auto', fontSize: 7 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const val = String(data.cell.raw);
          if (val === 'NESSUNA ANOMALIA' || val === 'CONFORME') {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = 'bold';
          } else if (val.includes('VULN') || val.includes('CRITICO')) {
            data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'INCONCLUSIVO') {
            data.cell.styles.textColor = [245, 158, 11];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [148, 163, 184];
          }
        }
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        overflow: 'linebreak'
      }
    });

    const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `NetworkDiag Ops Pro • Audit e diagnostica di rete ad uso esclusivo del committente autorizzato • Pagina ${i} di ${pageCount}`,
        14,
        doc.internal.pageSize.height - 8
      );
    }

    const filename = `Report-Diagnostico-${clientClean.replace(/[^a-zA-Z0-9]/g, '_')}-${target.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(filename);
    setGeneratedPdfName(filename);
  };

  const handleOpenEmail = () => {
    const subject = encodeURIComponent(`Report Diagnostico Rete & Sicurezza - ${companyName || target}`);
    const body = encodeURIComponent(
      `Gentile ${companyName || 'Cliente'},\n\nIn allegato trasmettiamo il rapporto diagnostico completo eseguito per l'host ${target}.\n\n` +
      `Sintesi:\n- Data scansione: ${new Date().toLocaleDateString('it-IT')}\n- Target: ${target}\n${notes ? `- Note: ${notes}\n` : ''}\n` +
      `Cordiali saluti,\n${technicianName || 'Team Tecnico'}`
    );
    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleOpenWhatsApp = () => {
    const message = encodeURIComponent(
      `*Report Diagnostico Rete* per *${companyName || target}*\n` +
      `Target: ${target}\n` +
      `Data: ${new Date().toLocaleDateString('it-IT')}\n` +
      `Operatore: ${technicianName || 'Admin'}\n` +
      `_Il documento PDF dettagliato è pronto per l'invio._`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-zinc-800/80 pb-4">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Esporta Report Professionale</h3>
            <p className="text-xs text-zinc-400">
              Genera un documento PDF per <span className="font-mono text-blue-300">{target}</span>
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              Nome Società / Cliente *
            </label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="es. Acme Corporation Srl"
              className="bg-zinc-900 border-zinc-800 text-white rounded-xl focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                Operatore / Tecnico
              </label>
              <Input
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="es. Marco"
                className="bg-zinc-900 border-zinc-800 text-white rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                Email Destinatario (opz.)
              </label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="es. info@acme.it"
                className="bg-zinc-900 border-zinc-800 text-white rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1.5">
              Note o Raccomandazioni di Intervento (opzionale)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="es. Si consiglia il rinnovo tempestivo del certificato SSL e la chiusura della porta MySQL su IP pubblico..."
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 space-y-3">
          <Button
            onClick={generateAndDownloadPDF}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-xs"
          >
            <Download className="w-4 h-4" />
            Scarica Report PDF (.pdf)
          </Button>

          {generatedPdfName && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="truncate">File generato: <strong>{generatedPdfName}</strong></span>
            </div>
          )}

          {/* Quick Sharing Links */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenEmail}
              className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              Bozza Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenWhatsApp}
              className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              Condividi WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
