'use client';

import { useState } from 'react';
import { 
  BookOpen, 
  Download, 
  X, 
  Shield, 
  Globe, 
  Wifi, 
  Terminal,
  Server,
  Zap,
  Lock,
  FileCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function ManualModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'external' | 'lan' | 'vulnerabilities' | 'vps'>('external');

  const downloadPdfManual = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header / Copertina
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MANUALE OPERATIVO & GUIDA TECNICA', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Network Diagnostic & Vulnerability Operations Center | Versione Enterprise 2.0', 14, 28);
    doc.text(`Documento generato il: ${new Date().toLocaleDateString()} alle ${new Date().toLocaleTimeString()}`, 14, 35);

    // Sezione 1: Diagnostica Esterna
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Diagnostica di Rete Esterna (External Tests)', 14, 55);

    autoTable(doc, {
      startY: 60,
      head: [['Modulo Diagnostico', 'Parametri da Controllare', 'Soglie di Riferimento & Azioni']],
      body: [
        ['Propagazione DNS Globale', 'Risoluzione IP su 6 resolver mondiali (Google, Cloudflare, Quad9)', 'Tutti i resolver devono restituire gli stessi IP. Se parziale, attendere TTL.'],
        ['Waterfall TTFB & Latenza', 'DNS, TCP Connect, TLS Handshake, Time to First Byte', '<200ms Eccellente | 200-600ms Accettabile | >600ms Lento (ottimizzare backend).'],
        ['Protocolli HTTP/2 & HTTP/3', 'Negoziazione ALPN, supporto QUIC over UDP', 'Verificare HTTP/2 o HTTP/3 attivo su CDN/Nginx per multiplexing veloce.'],
        ['Traceroute Visivo', 'Sequenza hop intermedi e latenza per tratta', 'Identifica se colli di bottiglia o packet loss sono causati dall\'ISP o dall\'host.'],
        ['Certificato SSL / TLS', 'Validita crittografica, Issuer, Giorni residui', '>30 giorni residui. Rinnovare tempestivamente (es. Certbot Let\'s Encrypt).'],
        ['Port Scanner', 'Porte 21, 22, 25, 80, 443, 3306, 5432, 8080', 'Solo porte 80/443 aperte. DB (3306, 5432) e SSH (22) devono essere filtrati da firewall.']
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 8.5 }
    });

    // Sezione 2: Rete Locale & WiFi / Cavo
    const finalY1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 130;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Scansione Rete Locale (LAN / WiFi & Cavo Ethernet)', 14, finalY1 + 15);

    autoTable(doc, {
      startY: finalY1 + 20,
      head: [['Elemento Rilevato', 'Descrizione & Ruolo', 'Cosa Verificare']],
      body: [
        ['Scheda di Rete Attiva', 'Interfaccia usata (en0 = WiFi, en1/eth0 = Cavo)', 'Verifica l\'IP assegnato dal DHCP (es. 192.168.1.X).'],
        ['Gateway / Router', 'Indirizzo IP del modem/router (es. 192.168.1.1)', 'Pannello di gestione accessibile con Web UI. Impostare password robusta.'],
        ['Tabella ARP & Host Connessi', 'Mappa dei dispositivi attivi sulla subnet', 'Rileva dispositivi non autorizzati, smartphone, smart TV e nodi IoT.']
      ],
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] },
      styles: { fontSize: 8.5 }
    });

    // Pagina 2: Vulnerability Scanner & Hardening VPS
    doc.addPage();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Vulnerability Assessment & Hardening Server VPS', 14, 16);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text('Guida alle Falle di Sicurezza & Rimedi Applicativi', 14, 35);

    autoTable(doc, {
      startY: 40,
      head: [['Falla / Configurazione', 'Rischio di Sicurezza', 'Soluzione & Remediation']],
      body: [
        ['File Sensibili (.env, .git)', 'Critico: Leak credenziali DB, chiavi API e codice', 'Bloccare accesso su Nginx: location ~ /\\.(env|git) { deny all; }'],
        ['Cookie senza flag Secure', 'Medio: Intercettazione sessione su reti non protette', 'Impostare cookie: { secure: true, httpOnly: true, sameSite: "lax" }'],
        ['CORS Misconfiguration', 'Alto: Furto token di sessione da siti malevoli', 'Evitare Access-Control-Allow-Origin: * con Allow-Credentials: true.'],
        ['Record DNS CAA Mancante', 'Medio: Emissione certificati da qualsiasi CA', 'Aggiungere record DNS CAA: 0 issue "letsencrypt.org"'],
        ['Forzatura HTTPS (Port 80)', 'Medio: Traffico in chiaro non cifrato', 'Configurare redirect 301 permanente da HTTP a HTTPS.'],
        ['Assenza WAF / CDN', 'Informativo: Esposizione a DDoS e bot', 'Posizionare Cloudflare o AWS WAF a monte della VPS.']
      ],
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 8.5 }
    });

    const finalY2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 130;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Checklist Hardening Sistema Operativo VPS (Linux / Ubuntu)', 14, finalY2 + 12);

    autoTable(doc, {
      startY: finalY2 + 17,
      head: [['Comando / Azione', 'Configurazione Consigliata', 'Scopo']],
      body: [
        ['Firewall UFW', 'sudo ufw default deny incoming\nsudo ufw allow 80,443,22/tcp\nsudo ufw enable', 'Blocca tutte le porte non esplicitamente autorizzate.'],
        ['SSH Key-Only Auth', '/etc/ssh/sshd_config:\nPasswordAuthentication no\nPermitRootLogin no', 'Elimina il rischio di brute-force password su SSH.'],
        ['Fail2ban', 'sudo apt install fail2ban -y', 'Banna automaticamente IP malevoli dopo tentativi falliti.'],
        ['Patch Automatiche', 'sudo apt install unattended-upgrades', 'Installa patch di sicurezza del kernel in automatico.']
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8.5 }
    });

    // Salva il file PDF
    doc.save(`Manuale_Operativo_NetworkDiag_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs rounded-xl px-3.5 h-8 gap-1.5 transition-all"
      >
        <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
        <span>Manuale & Guida</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Manuale Operativo & Guida alle Configurazioni
                  </h2>
                  <p className="text-[11px] sm:text-xs text-zinc-400">
                    Cosa verificare, interpretazione delle metriche e checklist di hardening.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={downloadPdfManual}
                  size="sm"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl px-3 h-8 sm:h-9"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Scarica PDF
                </Button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex gap-2 p-2.5 bg-zinc-900/90 border-b border-zinc-800/80 overflow-x-auto text-xs shrink-0">
              <button
                onClick={() => setActiveTab('external')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'external' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                1. Diagnostica Esterna
              </button>
              <button
                onClick={() => setActiveTab('lan')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'lan' ? 'bg-emerald-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                2. Rete Locale (WiFi & Cavo)
              </button>
              <button
                onClick={() => setActiveTab('vulnerabilities')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'vulnerabilities' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                3. Vulnerability Scanner
              </button>
              <button
                onClick={() => setActiveTab('vps')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'vps' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                4. Hardening VPS Linux
              </button>
            </div>

            {/* Content Area in 2-Column Horizontal Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {activeTab === 'external' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                      <Globe className="w-4 h-4" />
                      <h4>Propagazione DNS Globale (6 Resolver)</h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Interroga in parallelo Google (8.8.8.8), Cloudflare (1.1.1.1), Quad9, OpenDNS, AdGuard e Level3.
                    </p>
                    <span className="text-[11px] text-zinc-400 block bg-zinc-950/70 p-2 rounded-lg border border-zinc-900">
                      <strong>Cosa guardare:</strong> Tutti i 6 resolver devono restituire gli stessi IP. Se parziale, attendi che il TTL scada.
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                      <Zap className="w-4 h-4" />
                      <h4>Waterfall TTFB & Latenza Frazionata</h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Scompone in millisecondi DNS, TCP Connect, TLS Handshake e il tempo di calcolo backend (TTFB).
                    </p>
                    <span className="text-[11px] text-zinc-400 block bg-zinc-950/70 p-2 rounded-lg border border-zinc-900">
                      <strong>Soglie:</strong> &lt;200ms Ottimo &bull; 200-600ms Accettabile &bull; &gt;600ms Lento (ottimizzare DB o caching).
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-1.5">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                      <Server className="w-4 h-4" />
                      <h4>Protocolli Moderni: HTTP/2 & HTTP/3 (QUIC)</h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Verifica multiplexing su ALPN e trasporto ad alte prestazioni HTTP/3 su UDP/QUIC.
                    </p>
                    <span className="text-[11px] text-zinc-400 block bg-zinc-950/70 p-2 rounded-lg border border-zinc-900">
                      <strong>Consiglio:</strong> Abilita HTTP/2 o HTTP/3 su Nginx/Cloudflare per massimizzare la velocita di caricamento.
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <Lock className="w-4 h-4" />
                      <h4>Certificato SSL & Port Scanner</h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Validita crittografica, giorni residui e scansione porte esposte (80, 443, 22, 3306, 5432).
                    </p>
                    <span className="text-[11px] text-zinc-400 block bg-zinc-950/70 p-2 rounded-lg border border-zinc-900">
                      <strong>Regola d&apos;oro:</strong> Solo porte 80/443 aperte. SSH e Database devono essere schermati da firewall.
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'lan' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <Wifi className="w-4 h-4" />
                      <h4>Individuazione Scheda (WiFi o Cavo Ethernet)</h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Il motore seleziona automaticamente la scheda attiva (WiFi `en0` o Cavo Ethernet `en1`/`eth0`).
                    </p>
                    <span className="text-[11px] text-zinc-400 block bg-zinc-950/70 p-2 rounded-lg border border-zinc-900">
                      <strong>Dati mostrati:</strong> Tuo IP locale (es. 192.168.1.7), Subnet (/24) e MAC address della scheda.
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-1.5">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                      <Server className="w-4 h-4" />
                      <h4>Router / Gateway & Pagina di Gestione</h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Individua l&apos;IP del router (es. 192.168.1.1) e fornisce il link diretto per aprire la Web UI del modem.
                    </p>
                    <span className="text-[11px] text-zinc-400 block bg-zinc-950/70 p-2 rounded-lg border border-zinc-900">
                      <strong>Sicurezza:</strong> Assicurati di aver cambiato la password predefinita admin del router WiFi.
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                      <Globe className="w-4 h-4" />
                      <h4>Tabella ARP & Mappa Dispositivi Connessi</h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Scansiona la subnet locale scoprendo tutti gli host attivi (PC, smartphone, Smart TV, dispositivi IoT).
                    </p>
                    <span className="text-[11px] text-zinc-400 block bg-zinc-950/70 p-2 rounded-lg border border-zinc-900">
                      <strong>Cosa guardare:</strong> Rileva eventuali dispositivi sconosciuti o non autorizzati connessi al tuo WiFi.
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                      <Download className="w-4 h-4" />
                      <h4>Esportazione Inventario CSV per Excel</h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Con un click sul pulsante &quot;Esporta CSV&quot; puoi scaricare l&apos;inventario completo di tutti i nodi della LAN.
                    </p>
                    <span className="text-[11px] text-zinc-400 block bg-zinc-950/70 p-2 rounded-lg border border-zinc-900">
                      <strong>Formato:</strong> File `.csv` compatibile con Microsoft Excel, Apple Numbers e Google Sheets.
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'vulnerabilities' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-1.5">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                      <Shield className="w-4 h-4" />
                      <h4>File Sensibili Esposti (.env, .git/HEAD)</h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Rischio Critico: Leak delle password del database e delle chiavi segrete JWT.
                    </p>
                    <span className="text-[11px] text-zinc-300 block bg-zinc-950/80 p-2 rounded-lg border border-zinc-900 font-mono">
                      Soluzione Nginx: location ~ /\.(env|git) &#123; deny all; &#125;
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <Lock className="w-4 h-4" />
                      <h4>Sicurezza Cookie (HttpOnly, Secure, SameSite)</h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      I cookie di sessione senza HttpOnly sono leggibili da script XSS; senza Secure viaggiano in chiaro su HTTP.
                    </p>
                    <span className="text-[11px] text-zinc-400 block bg-zinc-950/70 p-2 rounded-lg border border-zinc-900">
                      <strong>Configurazione:</strong> Imposta `secure: true`, `httpOnly: true` e `sameSite: &quot;lax&quot;`.
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-1.5">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                      <FileCode className="w-4 h-4" />
                      <h4>Autorizzazione DNS CAA (RFC 6844)</h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Senza record CAA, qualsiasi Authority pubblica valida puo rilasciare certificati SSL a nome del tuo dominio.
                    </p>
                    <span className="text-[11px] text-zinc-400 block bg-zinc-950/70 p-2 rounded-lg border border-zinc-900 font-mono">
                      Record DNS consigliato: 0 issue &quot;letsencrypt.org&quot;
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                      <Zap className="w-4 h-4" />
                      <h4>Forzatura HTTPS 301 & Scudo WAF</h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Tutto il traffico sulla porta 80 deve reindirizzare automaticamente a HTTPS con codice di stato 301 permanente.
                    </p>
                    <span className="text-[11px] text-zinc-400 block bg-zinc-950/70 p-2 rounded-lg border border-zinc-900">
                      <strong>Protezione WAF:</strong> Posizionare Cloudflare o AWS WAF per mitigare bot e DDoS.
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'vps' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                      <Terminal className="w-4 h-4" />
                      <h4>1. Firewall UFW (Policy Deny Incoming)</h4>
                    </div>
                    <pre className="bg-zinc-950 p-2.5 rounded-xl text-zinc-300 font-mono text-[11px] overflow-x-auto border border-zinc-900">
{`sudo ufw default deny incoming
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable`}
                    </pre>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-2">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                      <Lock className="w-4 h-4" />
                      <h4>2. SSH Hardening (/etc/ssh/sshd_config)</h4>
                    </div>
                    <pre className="bg-zinc-950 p-2.5 rounded-xl text-zinc-300 font-mono text-[11px] overflow-x-auto border border-zinc-900">
{`PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes`}
                    </pre>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <Shield className="w-4 h-4" />
                      <h4>3. Protezione Brute-Force (Fail2ban)</h4>
                    </div>
                    <pre className="bg-zinc-950 p-2.5 rounded-xl text-zinc-300 font-mono text-[11px] overflow-x-auto border border-zinc-900">
{`sudo apt install fail2ban -y
sudo systemctl enable --now fail2ban`}
                    </pre>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <Zap className="w-4 h-4" />
                      <h4>4. Aggiornamenti Automatici Kernel</h4>
                    </div>
                    <pre className="bg-zinc-950 p-2.5 rounded-xl text-zinc-300 font-mono text-[11px] overflow-x-auto border border-zinc-900">
{`sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure unattended-upgrades`}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-500 shrink-0">
              <span>Network Diagnostic Ops Pro &bull; Manuale Ufficiale</span>
              <Button
                onClick={downloadPdfManual}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold h-8"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Scarica PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
