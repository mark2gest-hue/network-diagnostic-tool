'use client';

import { useState } from 'react';
import { 
  BookOpen, 
  Download, 
  X, 
  Shield, 
  Globe, 
  Wifi, 
  Terminal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function ManualModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'external' | 'lan' | 'vulnerabilities' | 'vps' | 'turso'>('external');

  const downloadPdfManual = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header / Copertina
    doc.setFillColor(15, 23, 42); // Dark Slate #0f172a
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Manuale Operativo & Guida alle Configurazioni
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Documentazione completa su cosa verificare, interpretazione delle metriche e hardening VPS.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={downloadPdfManual}
                  size="sm"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl px-3.5 h-9"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Scarica PDF
                </Button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-3 bg-zinc-900/80 border-b border-zinc-800 overflow-x-auto text-xs">
              <button
                onClick={() => setActiveTab('external')}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'external' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                1. Diagnostica Esterna
              </button>
              <button
                onClick={() => setActiveTab('lan')}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'lan' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                2. Rete Locale & WiFi/Cavo
              </button>
              <button
                onClick={() => setActiveTab('vulnerabilities')}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'vulnerabilities' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                3. Vulnerability Scanner
              </button>
              <button
                onClick={() => setActiveTab('vps')}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'vps' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                4. Hardening VPS Linux
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-zinc-300 leading-relaxed">
              {activeTab === 'external' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    Cosa verificare nella Diagnostica Esterna:
                  </h3>
                  <ul className="space-y-3 text-xs">
                    <li className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <strong className="text-blue-300 block mb-1">Propagazione DNS Globale (6 Resolver):</strong>
                      Verifica che Google (8.8.8.8), Cloudflare (1.1.1.1), Quad9 e gli altri restituiscano esattamente gli stessi indirizzi IP. Se vedi discrepanze, il cambio record è ancora in fase di propagazione TTL.
                    </li>
                    <li className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <strong className="text-cyan-300 block mb-1">Waterfall TTFB (Time to First Byte):</strong>
                      Misura il tempo impiegato dal backend del server per elaborare la risposta. Sotto i 200ms è ottimale; sopra i 600ms indica che il database o il codice dell&apos;applicazione necessitano di caching o ottimizzazione.
                    </li>
                    <li className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <strong className="text-purple-300 block mb-1">HTTP/2 e HTTP/3 (QUIC):</strong>
                      Permettono il multiplexing delle risorse su una singola connessione senza blocchi head-of-line. Abilitarli su Nginx/Cloudflare migliora i punteggi Google PageSpeed.
                    </li>
                    <li className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <strong className="text-emerald-300 block mb-1">Certificato SSL e Port Scanner:</strong>
                      Il certificato deve avere almeno 30 giorni di validità residua. Nel port scanner solo le porte 80 e 443 devono essere accessibili pubblicamente.
                    </li>
                  </ul>
                </div>
              )}

              {activeTab === 'lan' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    Cosa verificare nella Rete Locale (WiFi & Cavo Ethernet):
                  </h3>
                  <ul className="space-y-3 text-xs">
                    <li className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <strong className="text-emerald-300 block mb-1">Individuazione Scheda di Rete:</strong>
                      Il motore seleziona in automatico la scheda attiva con cui il computer è connesso (interfaccia WiFi `en0` o Cavo Ethernet `en1`/`eth0`).
                    </li>
                    <li className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <strong className="text-blue-300 block mb-1">Mappatura Dispositivi (ARP Discovery):</strong>
                      La tabella mostra tutti gli IP attivi nella subnet (es. 192.168.1.1 - 192.168.1.254), con il MAC address del produttore hardware e l&apos;identificazione del Router/Gateway.
                    </li>
                    <li className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <strong className="text-purple-300 block mb-1">Esportazione Inventario CSV:</strong>
                      Puoi cliccare su &quot;Esporta CSV&quot; per scaricare il file formattato e importarlo in Excel per report di audit della rete aziendale o domestica.
                    </li>
                  </ul>
                </div>
              )}

              {activeTab === 'vulnerabilities' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-400" />
                    Guida al Vulnerability Scanner & Correzioni:
                  </h3>
                  <ul className="space-y-3 text-xs">
                    <li className="p-3 rounded-xl bg-red-950/20 border border-red-500/30">
                      <strong className="text-red-300 block mb-1">File Sensibili Esposti (.env, .git):</strong>
                      Blocca subito su Nginx inserendo: <code className="text-amber-300 font-mono">location ~ /\.(env|git) &#123; deny all; &#125;</code> per evitare il furto di credenziali del database.
                    </li>
                    <li className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <strong className="text-amber-300 block mb-1">Sicurezza Cookie (HttpOnly, Secure, SameSite):</strong>
                      I cookie di sessione devono contenere sempre <code className="text-zinc-200 font-mono">HttpOnly</code> (impedisce a script XSS di leggerli) e <code className="text-zinc-200 font-mono">Secure</code> (inviati solo via HTTPS).
                    </li>
                    <li className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                      <strong className="text-purple-300 block mb-1">Record DNS CAA (RFC 6844):</strong>
                      Aggiungi un record CAA presso il registrar del dominio (es. <code className="text-zinc-200 font-mono">0 issue &quot;letsencrypt.org&quot;</code>) per vietare l&apos;emissione di certificati SSL da CA non autorizzate.
                    </li>
                  </ul>
                </div>
              )}

              {activeTab === 'vps' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-purple-400" />
                    Hardening Server VPS (Checklist di Sicurezza Linux):
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                      <span className="font-bold text-zinc-100 block">1. Configura il Firewall UFW:</span>
                      <pre className="bg-zinc-950 p-2 rounded text-zinc-300 font-mono text-[11px]">
{`sudo ufw default deny incoming
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable`}
                      </pre>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                      <span className="font-bold text-zinc-100 block">2. Disabilita Login Password su SSH (/etc/ssh/sshd_config):</span>
                      <pre className="bg-zinc-950 p-2 rounded text-zinc-300 font-mono text-[11px]">
{`PasswordAuthentication no
PermitRootLogin no`}
                      </pre>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                      <span className="font-bold text-zinc-100 block">3. Installa Fail2ban per bloccare attacchi Brute-Force:</span>
                      <pre className="bg-zinc-950 p-2 rounded text-zinc-300 font-mono text-[11px]">
{`sudo apt install fail2ban -y
sudo systemctl enable --now fail2ban`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-500">
              <span>Network Diagnostic Ops Pro &bull; Manuale Ufficiale</span>
              <Button
                onClick={downloadPdfManual}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Scarica Manuale Completo in PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
