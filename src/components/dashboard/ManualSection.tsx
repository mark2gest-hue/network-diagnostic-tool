'use client';

import { useState } from 'react';
import { 
  BookOpen, 
  Download, 
  Shield, 
  Globe, 
  Wifi, 
  Terminal,
  Server,
  Zap,
  Lock,
  FileCode,
  AlertOctagon,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function ManualSection() {
  const [activeTab, setActiveTab] = useState<'external' | 'lan' | 'vulnerabilities' | 'vps'>('external');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCommand = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

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
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between pb-6 border-b border-zinc-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Manuale Operativo & Documentazione Tecnica
            </h2>
          </div>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Guida passo-passo per comprendere tutte le metriche diagnostiche, risolvere le vulnerabilità rilevate e applicare l&apos;hardening su server VPS.
          </p>
        </div>

        <Button
          onClick={downloadPdfManual}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl px-5 py-5 shadow-lg shadow-emerald-600/25 border border-emerald-400/20 transition-all flex items-center gap-2"
        >
          <Download className="w-4 h-4 mr-1.5" />
          Scarica Manuale Completo in PDF
        </Button>
      </div>

      {/* 4 Topic Selector Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('external')}
          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            activeTab === 'external'
              ? 'bg-blue-950/40 border-blue-500/50 shadow-lg shadow-blue-600/15'
              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <Globe className={`w-5 h-5 ${activeTab === 'external' ? 'text-blue-400' : 'text-zinc-500'}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              activeTab === 'external' ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-800 text-zinc-500'
            }`}>
              Capitolo 1
            </span>
          </div>
          <div className="mt-3">
            <span className={`font-bold text-sm block ${activeTab === 'external' ? 'text-white' : 'text-zinc-300'}`}>
              Diagnostica Esterna
            </span>
            <span className="text-[11px] text-zinc-400">DNS, TTFB, HTTP/3, SSL</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('lan')}
          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            activeTab === 'lan'
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-600/15'
              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <Wifi className={`w-5 h-5 ${activeTab === 'lan' ? 'text-emerald-400' : 'text-zinc-500'}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              activeTab === 'lan' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
            }`}>
              Capitolo 2
            </span>
          </div>
          <div className="mt-3">
            <span className={`font-bold text-sm block ${activeTab === 'lan' ? 'text-white' : 'text-zinc-300'}`}>
              Rete Locale (WiFi & Cavo)
            </span>
            <span className="text-[11px] text-zinc-400">Tabella ARP, Gateway, CSV</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('vulnerabilities')}
          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            activeTab === 'vulnerabilities'
              ? 'bg-red-950/40 border-red-500/50 shadow-lg shadow-red-600/15'
              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <Shield className={`w-5 h-5 ${activeTab === 'vulnerabilities' ? 'text-red-400' : 'text-zinc-500'}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              activeTab === 'vulnerabilities' ? 'bg-red-500/20 text-red-300' : 'bg-zinc-800 text-zinc-500'
            }`}>
              Capitolo 3
            </span>
          </div>
          <div className="mt-3">
            <span className={`font-bold text-sm block ${activeTab === 'vulnerabilities' ? 'text-white' : 'text-zinc-300'}`}>
              Vulnerability Scanner
            </span>
            <span className="text-[11px] text-zinc-400">.env, Cookie, CORS, CAA</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('vps')}
          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            activeTab === 'vps'
              ? 'bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-600/15'
              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <Terminal className={`w-5 h-5 ${activeTab === 'vps' ? 'text-purple-400' : 'text-zinc-500'}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              activeTab === 'vps' ? 'bg-purple-500/20 text-purple-300' : 'bg-zinc-800 text-zinc-500'
            }`}>
              Capitolo 4
            </span>
          </div>
          <div className="mt-3">
            <span className={`font-bold text-sm block ${activeTab === 'vps' ? 'text-white' : 'text-zinc-300'}`}>
              Hardening VPS Linux
            </span>
            <span className="text-[11px] text-zinc-400">UFW, SSH Keys, Fail2ban</span>
          </div>
        </button>
      </div>

      {/* Chapter Content in 2-Column Cards */}
      <div className="space-y-4 pt-2">
        {activeTab === 'external' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Globe className="w-4 h-4" />
                <h3>1. Propagazione DNS Globale (6 Resolver)</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Interroga simultaneamente i principali resolver mondiali (Google DNS 8.8.8.8, Cloudflare 1.1.1.1, Quad9, OpenDNS, AdGuard e Level3).
              </p>
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                <strong className="text-blue-300 block font-mono text-[11px]">COSA VERIFICARE:</strong>
                <p className="text-zinc-400">Tutti i 6 resolver devono restituire gli stessi indirizzi IP. Se alcuni mostrano ancora il vecchio IP, significa che i record sono ancora in fase di propagazione TTL.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Zap className="w-4 h-4" />
                <h3>2. Waterfall TTFB (Time to First Byte)</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Scompone in millisecondi precisi ogni fase di connessione: risoluzione DNS, TCP handshake, crittografia TLS e tempo di elaborazione del server (TTFB).
              </p>
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                <strong className="text-cyan-300 block font-mono text-[11px]">SOGLIE DI PERFORMANCE:</strong>
                <p className="text-zinc-400">&lt; 200 ms: Ottimale &bull; 200-600 ms: Accettabile &bull; &gt; 600 ms: Lento (necessario caching Redis o ottimizzazione query DB).</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Server className="w-4 h-4" />
                <h3>3. Negoziazione HTTP/2 & HTTP/3 (QUIC)</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Verifica il supporto ai moderni protocolli di trasporto web tramite ALPN e datagrammi UDP/QUIC.
              </p>
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                <strong className="text-purple-300 block font-mono text-[11px]">BEST PRACTICE:</strong>
                <p className="text-zinc-400">Abilita HTTP/2 o HTTP/3 su Nginx/Cloudflare per eliminare il blocco head-of-line e caricare gli asset in parallelo.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Lock className="w-4 h-4" />
                <h3>4. Certificato SSL & Port Scanner</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Controlla la scadenza del certificato TLS e scansiona le porte pubbliche aperte (80, 443, 22, 3306, 5432).
              </p>
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                <strong className="text-emerald-300 block font-mono text-[11px]">REGOLA DI SICUREZZA:</strong>
                <p className="text-zinc-400">Solo le porte 80 e 443 devono essere aperte al mondo. Database e pannelli di controllo devono essere chiusi dal firewall.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lan' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Wifi className="w-4 h-4" />
                <h3>1. Scheda di Rete (WiFi o Cavo Ethernet)</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Il motore rileva automaticamente l&apos;interfaccia di rete primaria usata dal computer (`en0` = WiFi, `en1`/`eth0` = Cavo Ethernet).
              </p>
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                <strong className="text-emerald-300 block font-mono text-[11px]">COSA MOSTRA:</strong>
                <p className="text-zinc-400">Indirizzo IP locale assegnato dal DHCP (es. 192.168.1.5), maschera di sottorete (/24) e MAC address hardware.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Server className="w-4 h-4" />
                <h3>2. Gateway del Router & Web UI</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Individua l&apos;indirizzo IP del modem/router di casa o dell&apos;ufficio (es. 192.168.1.1 o 192.168.0.1) e genera il link di accesso diretto.
              </p>
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                <strong className="text-purple-300 block font-mono text-[11px]">AZIONI CONSIGLIATE:</strong>
                <p className="text-zinc-400">Verifica di aver disabilitato l&apos;accesso remoto WAN e modificato la password di default admin/admin.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Globe className="w-4 h-4" />
                <h3>3. Tabella ARP & Mappa Dispositivi Connessi</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Esegue la scansione degli host attivi sulla subnet locale, mostrando tutti i dispositivi collegati via cavo o WiFi.
              </p>
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                <strong className="text-blue-300 block font-mono text-[11px]">AUDIT DI RETE:</strong>
                <p className="text-zinc-400">Consente di individuare immediatamente smartphone, Smart TV, telecamere IP o intrusi connessi alla tua rete.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Download className="w-4 h-4" />
                <h3>4. Esportazione Inventario CSV per Excel</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Permette di salvare l&apos;elenco completo degli host scansionati con IP, MAC, ruolo e stato operativo in un file CSV.
              </p>
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                <strong className="text-cyan-300 block font-mono text-[11px]">UTILIZZO:</strong>
                <p className="text-zinc-400">Apribile con Microsoft Excel o Apple Numbers per archiviare inventari di rete aziendali o domestici.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vulnerabilities' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <AlertOctagon className="w-4 h-4" />
                <h3>1. File Sensibili Esposti (.env, .git/HEAD)</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Rischio Critico: Leak delle password del database, token JWT, chiavi di cifratura o sorgenti del repository.
              </p>
              <div className="bg-zinc-950/90 p-3 rounded-xl border border-zinc-800 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Soluzione per Nginx:</span>
                  <button 
                    onClick={() => copyCommand('location ~ /\\.(env|git) {\n  deny all;\n  return 404;\n}', 1)}
                    className="text-xs text-red-400 hover:text-white flex items-center gap-1 font-sans"
                  >
                    {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedIndex === 1 ? 'Copiato' : 'Copia'}
                  </button>
                </div>
                <pre className="text-red-300 text-[10px] overflow-x-auto">
{`location ~ /\\.(env|git) {
  deny all;
  return 404;
}`}
                </pre>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Lock className="w-4 h-4" />
                <h3>2. Flag di Sicurezza Cookie (HttpOnly, Secure)</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                I cookie di autenticazione privi di HttpOnly possono essere sottratti tramite attacchi XSS; privi di Secure viaggiano in chiaro.
              </p>
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                <strong className="text-amber-300 block font-mono text-[11px]">IMPOSTAZIONE CONSIGLIATA:</strong>
                <p className="text-zinc-400">`Set-Cookie: token=...; Secure; HttpOnly; SameSite=Lax; Path=/;`</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <FileCode className="w-4 h-4" />
                <h3>3. Autorizzazione DNS CAA (RFC 6844)</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Specifica quali Certificate Authority (CA) sono legalmente autorizzate a emettere certificati SSL per il tuo dominio.
              </p>
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                <strong className="text-purple-300 block font-mono text-[11px]">RECORD DNS DA INSERIRE:</strong>
                <p className="text-zinc-400 font-mono text-[11px]">`tuodominio.com. IN CAA 0 issue &quot;letsencrypt.org&quot;`</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Zap className="w-4 h-4" />
                <h3>4. Forzatura HTTPS & Protezione WAF</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Tutto il traffico sulla porta 80 deve reindirizzare a 443 con codice 301. La presenza di un WAF/CDN protegge la VPS da attacchi DDoS.
              </p>
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                <strong className="text-blue-300 block font-mono text-[11px]">RACCOMANDAZIONE:</strong>
                <p className="text-zinc-400">Attiva Cloudflare Proxy (nuvoletta arancione) per nascondere l&apos;IP reale della tua VPS.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vps' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between text-purple-400 font-bold text-sm">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  <h3>1. Firewall UFW (Blocco Ingressi Non Autorizzati)</h3>
                </div>
                <button 
                  onClick={() => copyCommand('sudo ufw default deny incoming\nsudo ufw allow 80/tcp\nsudo ufw allow 443/tcp\nsudo ufw allow 22/tcp\nsudo ufw enable', 2)}
                  className="text-xs text-purple-400 hover:text-white flex items-center gap-1 font-sans"
                >
                  {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedIndex === 2 ? 'Copiato' : 'Copia'}
                </button>
              </div>
              <pre className="bg-zinc-950 p-3 rounded-xl text-zinc-300 font-mono text-[11px] overflow-x-auto border border-zinc-900">
{`sudo ufw default deny incoming
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable`}
              </pre>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between text-blue-400 font-bold text-sm">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <h3>2. SSH Hardening (/etc/ssh/sshd_config)</h3>
                </div>
                <button 
                  onClick={() => copyCommand('PasswordAuthentication no\nPermitRootLogin no\nPubkeyAuthentication yes', 3)}
                  className="text-xs text-blue-400 hover:text-white flex items-center gap-1 font-sans"
                >
                  {copiedIndex === 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedIndex === 3 ? 'Copiato' : 'Copia'}
                </button>
              </div>
              <pre className="bg-zinc-950 p-3 rounded-xl text-zinc-300 font-mono text-[11px] overflow-x-auto border border-zinc-900">
{`PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes`}
              </pre>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between text-emerald-400 font-bold text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <h3>3. Protezione Brute-Force (Fail2ban)</h3>
                </div>
                <button 
                  onClick={() => copyCommand('sudo apt install fail2ban -y\nsudo systemctl enable --now fail2ban', 4)}
                  className="text-xs text-emerald-400 hover:text-white flex items-center gap-1 font-sans"
                >
                  {copiedIndex === 4 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedIndex === 4 ? 'Copiato' : 'Copia'}
                </button>
              </div>
              <pre className="bg-zinc-950 p-3 rounded-xl text-zinc-300 font-mono text-[11px] overflow-x-auto border border-zinc-900">
{`sudo apt install fail2ban -y
sudo systemctl enable --now fail2ban`}
              </pre>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between text-amber-400 font-bold text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <h3>4. Patch Automatiche di Sicurezza (Kernel)</h3>
                </div>
                <button 
                  onClick={() => copyCommand('sudo apt install unattended-upgrades -y\nsudo dpkg-reconfigure --priority=low unattended-upgrades', 5)}
                  className="text-xs text-amber-400 hover:text-white flex items-center gap-1 font-sans"
                >
                  {copiedIndex === 5 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedIndex === 5 ? 'Copiato' : 'Copia'}
                </button>
              </div>
              <pre className="bg-zinc-950 p-3 rounded-xl text-zinc-300 font-mono text-[11px] overflow-x-auto border border-zinc-900">
{`sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
