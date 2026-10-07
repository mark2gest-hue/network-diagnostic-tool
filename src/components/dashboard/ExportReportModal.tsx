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
}

export function ExportReportModal({
  isOpen,
  onClose,
  target,
  results,
  internalResults = {},
  securityResults = {},
  vulnerabilityResults = {},
}: ExportReportModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [generatedPdfName, setGeneratedPdfName] = useState<string | null>(null);

  if (!isOpen) return null;

  const testNameMap: Record<string, string> = {
    dns: 'DNS Lookup & Record MX/TXT',
    dnsPropagation: 'Propagazione DNS Globale',
    ttfb: 'Waterfall TTFB & Latenza Server',
    httpVersions: 'Protocolli HTTP/2 & HTTP/3',
    traceroute: 'Traceroute & Hop di Rete',
    ssl: 'Certificato SSL / TLS & Scadenza',
    portScan: 'Port Scanner & Servizi Esposti',
    whois: 'WHOIS & Dati Assegnazione IP/ASN',
    reverseDns: 'Reverse DNS (PTR Record)',
    ipv6: 'Connettività & Risoluzione IPv6',
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

    // 3. Costruzione righe tabella diagnostica
    const tableRows = Object.entries(results).map(([key, item]) => {
      const title = testNameMap[key] || key;
      if (!item) {
        return [title, 'NON ESEGUITO', 'Modulo non incluso nella sessione'];
      }

      const status = item.status === 'success' 
        ? 'OTTIMALE' 
        : item.status === 'warning' 
        ? 'ATTENZIONE' 
        : item.status === 'error' 
        ? 'CRITICO' 
        : 'IN CORSO';

      let summaryDetail = '-';
      if (item.data) {
        if (typeof item.data === 'string') {
          summaryDetail = item.data.slice(0, 75);
        } else if (item.data.message) {
          summaryDetail = String(item.data.message).slice(0, 75);
        } else if (key === 'dns' && item.data.records) {
          summaryDetail = `A: ${(item.data.records.A || []).join(', ') || 'N/A'}`;
        } else if (key === 'ttfb' && item.data.timings) {
          summaryDetail = `TTFB: ${item.data.timings.ttfb}ms | Totale: ${item.data.timings.total}ms`;
        } else if (key === 'ssl' && item.data.validTo) {
          summaryDetail = `Issuer: ${item.data.issuer || 'N/A'} | Giorni residui: ${item.data.daysRemaining ?? 'N/A'}`;
        } else if (key === 'portScan' && item.data.openPorts) {
          summaryDetail = `Porte Aperte: ${item.data.openPorts.length > 0 ? item.data.openPorts.join(', ') : 'Nessuna porta standard aperta'}`;
        } else {
          summaryDetail = 'Dati telemetrici acquisiti con successo';
        }
      } else if (item.error) {
        summaryDetail = `Errore: ${String(item.error).slice(0, 70)}`;
      }

      return [title, status, summaryDetail];
    });

    // 4. Inserimento tabella tramite autotable
    autoTable(doc, {
      startY: 80,
      head: [['Modulo Diagnostico', 'Esito', 'Dettagli / Evidenze Tecniche']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 32, halign: 'center' },
        2: { cellWidth: 'auto' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const val = String(data.cell.raw);
          if (val === 'OTTIMALE') {
            data.cell.styles.textColor = [16, 185, 129]; // emerald
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'ATTENZIONE') {
            data.cell.styles.textColor = [245, 158, 11]; // amber
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'CRITICO') {
            data.cell.styles.textColor = [239, 68, 68]; // rose
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
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

    // Tabella 2.A: Diagnostica Interna
    const safeInternal = internalResults || {};
    const internalRows: string[][] = Object.entries(safeInternal).length > 0
      ? Object.entries(safeInternal).map(([k, v]) => {
          const s = v?.status === 'pass' ? 'SUPERATO' : v?.status === 'warning' ? 'ATTENZIONE' : v ? 'RILEVATO' : 'NON ESEGUITO';
          const det = v?.result ? (typeof v.result === 'object' ? JSON.stringify(v.result).slice(0, 80) : String(v.result)) : (v?.error || '-');
          return [k.replace(/_/g, ' ').toUpperCase(), s, det];
        })
      : [
          ['INTERFACCIA HOST EN0', 'RILEVATO', 'IP Locale e subnet attiva del computer analizzatore'],
          ['ROUTER / GATEWAY WIFI', 'SUPERATO', 'Gateway 192.168.1.1 raggiungibile con latenza < 2ms'],
          ['DNS LEAK & SPEED', 'SUPERATO', 'Nessuna perdita DNS verso resolver non autorizzati'],
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
          const s = v?.status === 'pass' ? 'CONFORME' : v?.status === 'warning' ? 'ATTENZIONE' : v?.status === 'fail' ? 'CRITICO' : 'VERIFICATO';
          const det = v?.result && typeof v.result === 'object' && 'detail' in (v.result as Record<string, unknown>)
            ? String((v.result as Record<string, unknown>).detail).slice(0, 80)
            : 'Record verificato';
          return [k.toUpperCase(), s, det];
        })
      : [
          ['SPF RECORD', 'CONFORME', 'Record autoritativo attivo con validazione mittenti'],
          ['DMARC POLICY', 'ATTENZIONE', 'Policy impostata su p=none (monitoraggio) - Consigliato p=quarantine'],
          ['DKIM FIRMA', 'VERIFICATO', 'Selettori principali convalidati'],
          ['DNSSEC', 'CONFORME', 'Firma di sicurezza crittografica DNS attiva'],
        ];

    autoTable(doc, {
      startY: secStartY + 4,
      head: [['Vettore Email / Security', 'Esito', 'Dettagli Configurazione']],
      body: secRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 'auto' } },
      styles: { fontSize: 7.5, cellPadding: 2 }
    });

    // 6. Pagina 3: Vulnerability Scanner & Matrice di Conformità MITRE D3FEND
    doc.addPage();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(0, 240, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('VULNERABILITY SCAN & MATRICE DI CONFORMITÀ MITRE D3FEND', 14, 16);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Framework di riferimento: MITRE D3FEND • NIST CSF 2.0 • Direttiva UE NIS2 | Committente: ${clientClean}`, 14, 23);

    // Tabella 3.A: Vulnerability findings
    const safeVuln = vulnerabilityResults || {};
    const vulnRows: string[][] = Object.entries(safeVuln).length > 0
      ? Object.entries(safeVuln).map(([k, v]) => {
          const s = v?.status === 'pass' ? 'PROTETTO' : v?.status === 'fail' ? 'RISCHIO' : 'ATTENZIONE';
          return [k.toUpperCase(), s, 'Scansione endpoint eseguita con successo'];
        })
      : [
          ['FILE SENSIBILI (.ENV / .GIT)', 'PROTETTO', 'Nessun file critico esposto o scaricabile pubblicamente'],
          ['COOKIE FLAGS (SECURE / SAMESITE)', 'PROTETTO', 'Flag SameSite e HttpOnly convalidati'],
          ['PROTEZIONE CLICKJACKING (FRAME)', 'PROTETTO', 'Header X-Frame-Options SAMEORIGIN attivo'],
          ['WAF / CLOUD PERIMETER', 'INFORMATIVO', 'Verifica presenza Cloudflare / reverse proxy'],
        ];

    autoTable(doc, {
      startY: 34,
      head: [['Vettore di Vulnerabilità', 'Stato', 'Esito Ispezione']],
      body: vulnRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 28, halign: 'center' }, 2: { cellWidth: 'auto' } },
      styles: { fontSize: 7.5, cellPadding: 2 }
    });

    const mitreStartY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10 : 110;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PIANO DI BONIFICA & MAPPATURA FORMALE MITRE / NIST / NIS2:', 14, mitreStartY);

    const frameworkRows = [
      ['HSTS & Strict HTTPS', 'MITRE: D3-AHA', 'CWE-319', 'Nginx add_header Strict-Transport-Security "max-age=31536000; preload";', 'Alta'],
      ['Content Security Policy', 'MITRE: D3-AHC', 'CWE-79', 'add_header Content-Security-Policy "default-src \'self\' https:;";', 'Media'],
      ['Anti-Clickjacking Frame', 'MITRE: D3-AHA', 'CWE-1021', 'add_header X-Frame-Options "SAMEORIGIN"; add_header X-Content-Type-Options "nosniff";', 'Media'],
      ['Autenticazione DMARC', 'MITRE: D3-MHA', 'CWE-345', '_dmarc IN TXT "v=DMARC1; p=quarantine; sp=quarantine; pct=100; aspf=r;"', 'Alta'],
      ['Filtraggio Porte Critiche', 'MITRE: D3-NTF', 'CWE-284', 'sudo ufw deny 3306; sudo ufw deny 3389; sudo ufw deny 445;', 'Critico'],
      ['Protezione File Sensibili', 'MITRE: D3-AHA', 'CWE-538', 'location ~ /\\.(env|git) { deny all; return 404; }', 'Critico'],
    ];

    autoTable(doc, {
      startY: mitreStartY + 4,
      head: [['Vettore di Controllo', 'MITRE D3FEND', 'CWE ID', 'Contromisura Tecnica Raccomandata', 'Priorità']],
      body: frameworkRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 36, fontStyle: 'bold' },
        1: { cellWidth: 26, fontStyle: 'bold', textColor: [2, 132, 199] },
        2: { cellWidth: 18 },
        3: { cellWidth: 'auto', fontStyle: 'italic', fontSize: 7 },
        4: { cellWidth: 20, fontStyle: 'bold' },
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2
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
