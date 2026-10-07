import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const htmlContent = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>NetworkDiag Ops Pro — Scheda Funzionale & Presentazione</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');
    
    @page {
      size: A4;
      margin: 10mm 12mm 10mm 12mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.4;
      font-size: 10.5px;
    }

    .page {
      page-break-after: always;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 275mm;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    /* Header & Branding */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 12px;
    }

    .brand-title {
      font-size: 19px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-badge {
      display: inline-block;
      background: #2563eb;
      color: #ffffff;
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 3px 7px;
      border-radius: 5px;
    }

    .brand-sub {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
      font-weight: 500;
    }

    .meta-box {
      text-align: right;
      font-size: 9px;
      color: #64748b;
    }

    .meta-box strong {
      color: #0f172a;
    }

    /* Section Styles */
    .section-title {
      font-size: 11.5px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-left: 3px solid #2563eb;
      padding-left: 7px;
    }

    .hero-card {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 12px;
    }

    .hero-card h1 {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: -0.3px;
      margin-bottom: 4px;
      color: #ffffff;
    }

    .hero-card p {
      font-size: 10px;
      color: #94a3b8;
      line-height: 1.45;
    }

    .hero-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 10px;
    }

    .hero-stat {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 7px;
      padding: 8px;
    }

    .hero-stat .stat-label {
      font-size: 8px;
      text-transform: uppercase;
      color: #94a3b8;
      font-weight: 700;
    }

    .hero-stat .stat-val {
      font-size: 12.5px;
      font-weight: 800;
      color: #38bdf8;
      margin-top: 2px;
    }

    /* Grid Layouts */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }

    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 9px;
    }

    .card-title {
      font-size: 10.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .card-desc {
      font-size: 9px;
      color: #475569;
      line-height: 1.35;
    }

    .badge-pill {
      display: inline-block;
      font-size: 7.5px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-emerald { background: #d1fae5; color: #065f46; }
    .badge-amber { background: #fef3c7; color: #92400e; }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 9px;
    }

    th, td {
      padding: 5.5px 7.5px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      font-size: 8px;
      letter-spacing: 0.5px;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    .code-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      background: #e2e8f0;
      padding: 1px 3px;
      border-radius: 3px;
      color: #0f172a;
    }

    /* Footer */
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8px;
      color: #94a3b8;
      margin-top: auto;
    }

    .highlight-box {
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
      padding: 7px 10px;
      border-radius: 0 7px 7px 0;
      font-size: 9px;
      color: #1e3a8a;
      margin-bottom: 8px;
    }

    .veracity-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-left: 3px solid #10b981;
      padding: 7px 10px;
      border-radius: 0 7px 7px 0;
      font-size: 9px;
      color: #065f46;
      margin-bottom: 10px;
    }

    ul.feature-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    ul.feature-list li {
      position: relative;
      padding-left: 11px;
      margin-bottom: 2.5px;
      font-size: 9px;
      color: #334155;
    }

    ul.feature-list li::before {
      content: "•";
      position: absolute;
      left: 2px;
      color: #2563eb;
      font-weight: bold;
      font-size: 11px;
      line-height: 1;
    }
  </style>
</head>
<body>

  <!-- ==================== PAGINA 1 ==================== -->
  <div class="page">
    <div>
      <div class="header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="background: #0f172a; padding: 6px; border-radius: 8px; border: 1px solid #334155; display: flex; align-items: center; justify-content: center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div>
            <div class="brand-title">
              NetworkDiag <span style="color: #2563eb;">Ops Pro</span>
              <span class="brand-badge" style="background: linear-gradient(135deg, #1e40af, #2563eb);">by Aiutiamoci Impresa</span>
            </div>
            <div class="brand-sub">Suite Enterprise EASM, Deep Diagnostics & Autonomous AI Remediation</div>
          </div>
        </div>
        <div class="meta-box">
          <div>Documento: <strong>Scheda Tecnica & Pitch</strong></div>
          <div>Versione: <strong>v2.4 Enterprise</strong></div>
          <div>Data: <strong>Ottobre 2026</strong></div>
        </div>
      </div>

      <!-- Hero Summary -->
      <div class="hero-card">
        <h1>Piattaforma Integrata di Monitoraggio & Sicurezza di Rete</h1>
        <p>
          NetworkDiag Ops Pro è la suite enterprise creata per identificare, quantificare e risolvere istantaneamente i rischi perimetrali, i rallentamenti e le falle di configurazione di server, siti web, cluster e reti locali aziendali.
        </p>
        <div class="hero-grid">
          <div class="hero-stat">
            <div class="stat-label">3 Pilastri Diagnostici</div>
            <div class="stat-val">Explainable Score</div>
          </div>
          <div class="hero-stat">
            <div class="stat-label">Copilot di Sicurezza</div>
            <div class="stat-val">AI Auto-Remediation</div>
          </div>
          <div class="hero-stat">
            <div class="stat-label">Reportistica Committente</div>
            <div class="stat-val">1-Click PDF Export</div>
          </div>
        </div>
      </div>

      <!-- I 3 Pilastri -->
      <div class="section-title">1. Motore di Calcolo "Explainable Risk Scoring" (Trasparente 0–100)</div>
      <div class="grid-3">
        <div class="card" style="border-top: 3px solid #3b82f6;">
          <div class="card-title">
            <span class="badge-pill badge-blue">Pilastro 1</span>
            Disponibilità & Speed (20%)
          </div>
          <div class="card-desc">
            Latenza DNS globale su 12 nodi Anycast, waterfall TTFB (Time to First Byte), protocolli HTTP/2 e HTTP/3 QUIC, routing TCP.
          </div>
        </div>
        <div class="card" style="border-top: 3px solid #8b5cf6;">
          <div class="card-title">
            <span class="badge-pill badge-purple">Pilastro 2</span>
            Configurazione (30%)
          </div>
          <div class="card-desc">
            Crittografia TLS 1.3, HSTS Preload (RFC 6797), posture email anti-spoofing (SPF, DKIM, DMARC), validità certificati SSL.
          </div>
        </div>
        <div class="card" style="border-top: 3px solid #ef4444;">
          <div class="card-title">
            <span class="badge-pill badge-red">Pilastro 3</span>
            Sicurezza & Falli (50%)
          </div>
          <div class="card-desc">
            Leak di file critici (.env, .git, SQL dump), porte database/amministrazione esposte su internet, policy CORS aperte, assenza WAF.
          </div>
        </div>
      </div>

      <!-- Modulo A & B Preview -->
      <div class="section-title">2. I 5 Moduli Operativi della Suite</div>
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Modulo</th>
            <th style="width: 38%;">Test Eseguiti & Metriche Chiave</th>
            <th style="width: 37%;">Valore Operativo per l'Azienda</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>External Diagnostics</strong></td>
            <td>DNS Anycast 12 nodi, TTFB Waterfall, HTTP/3, SSL Audit, Port Scan TCP, Traceroute, Reverse DNS, WHOIS.</td>
            <td>Mappa completa del perimetro esterno, latenza globale e salute dell'infrastruttura.</td>
          </tr>
          <tr>
            <td><strong>Security & Email Audit</strong></td>
            <td>SPF, DKIM, DMARC enforcement, DNSSEC validation, RBL Blacklist (30+ nodi), Subdomain Enumeration.</td>
            <td>Protegge la reputazione aziendale e blocca attacchi di phishing e spoofing del dominio.</td>
          </tr>
          <tr>
            <td><strong>Vulnerability Scanner</strong></td>
            <td>File sensibili (.env, .git, backup), CORS misconfiguration, Cookie Security (HttpOnly/Secure), WAF Detection.</td>
            <td>Rileva prima dei cyber-criminali le porte d'accesso e le configurazioni errate più sfruttate.</td>
          </tr>
          <tr>
            <td><strong>Internal / LAN & WiFi</strong></td>
            <td>Throughput Speedtest, LAN/ARP device scanner, WebRTC leak, Jitter e Packet Loss continuo.</td>
            <td>Diagnostica sul campo per router, stampanti, device IoT e switch nella rete locale.</td>
          </tr>
          <tr>
            <td><strong>Manuale & Knowledge</strong></td>
            <td>Documentazione integrata, remediation guide, glossario tecnico e standard di conformità.</td>
            <td>Formazione per il team interno e documentazione per l'accreditamento a bandi e audit.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div>NetworkDiag Ops Pro &bull; Confidential & Proprietary</div>
      <div>Pagina 1 di 2</div>
    </div>
  </div>

  <!-- ==================== PAGINA 2 ==================== -->
  <div class="page">
    <div>
      <div class="header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="background: #0f172a; padding: 6px; border-radius: 8px; border: 1px solid #334155; display: flex; align-items: center; justify-content: center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div>
            <div class="brand-title">
              NetworkDiag <span style="color: #2563eb;">Ops Pro</span>
              <span class="brand-badge" style="background: linear-gradient(135deg, #1e40af, #2563eb);">by Aiutiamoci Impresa</span>
            </div>
            <div class="brand-sub">Veridicità Tecnica dei Test a Basso Livello, AI Copilot & Modello Commerciale</div>
          </div>
        </div>
        <div class="meta-box">
          <div>Target: <strong>PMI, System Integrator, IT Manager</strong></div>
          <div>Infrastruttura: <strong>Next.js Edge & LibSQL Engine</strong></div>
        </div>
      </div>

      <!-- Veridicità Box -->
      <div class="veracity-box">
        <strong>🛡️ Assoluta Veridicità dei Test (Zero Dati Simulati o Mockati):</strong> Ogni test esegue connessioni di rete a basso livello reali (socket TCP nativi, query DNS autoritative, handshake TLS x509 e probe HTTP). Le metriche visualizzate sono esattamente ciò che un server esterno o un hacker vede dialogando con l'infrastruttura aziendale.
      </div>

      <!-- Tabella Veridicità Tecnica -->
      <div class="section-title">3. Dettaglio Tecnico di Esecuzione dei Test (Come Funzionano a Basso Livello)</div>
      <table>
        <thead>
          <tr>
            <th style="width: 22%;">Test Eseguito</th>
            <th style="width: 46%;">Meccanismo Tecnico Reale (Codice Eseguito)</th>
            <th style="width: 32%;">Evidenza Deterministica Ottenuta</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Port Scanner TCP</strong></td>
            <td>Apre veri socket TCP nativi (<span class="code-tag">net.Socket</span>) sulle porte (22, 80, 443, 3306, 5432, 8080) con timeout di 2000ms.</td>
            <td>Handshake a 3 vie completato (Porta Aperta) vs <span class="code-tag">ECONNREFUSED</span> o timeout (Chiusa/Firewall).</td>
          </tr>
          <tr>
            <td><strong>Certificato SSL/TLS</strong></td>
            <td>Esegue vero handshake TLS (<span class="code-tag">tls.connect</span>) su porta 443 e scarica il payload x509 (<span class="code-tag">getPeerCertificate</span>).</td>
            <td>Autorità reale (Let's Encrypt/DigiCert), data di scadenza esatta al secondo, fingerprint SHA-256 e bit chiave.</td>
          </tr>
          <tr>
            <td><strong>Propagazione DNS</strong></td>
            <td>Interroga 6 resolver Anycast mondiali indipendenti (<span class="code-tag">Cloudflare 1.1.1.1, Google 8.8.8.8, Quad9 9.9.9.9, OpenDNS</span>).</td>
            <td>Latenza effettiva in millisecondi per ciascun nodo e coerenza degli IP A/AAAA risolti.</td>
          </tr>
          <tr>
            <td><strong>Email Security (DMARC)</strong></td>
            <td>Query DNS di tipo <span class="code-tag">TXT</span> su <span class="code-tag">_dmarc.dominio.com</span> e parsing delle direttive RFC 7489.</td>
            <td>Validazione stringente della policy (<span class="code-tag">p=reject</span> vs <span class="code-tag">p=none</span>) o <span class="code-tag">NXDOMAIN</span> se non impostato.</td>
          </tr>
          <tr>
            <td><strong>Leak File Sensibili</strong></td>
            <td>Invia richieste HTTP <span class="code-tag">GET</span> reali agli endpoint sensibili (<span class="code-tag">/.env, /.git/config, /backup.sql</span>).</td>
            <td>Rilevamento immediato su <span class="code-tag">HTTP 200</span> con mime-type testuale vs <span class="code-tag">404/403</span> sicuro.</td>
          </tr>
          <tr>
            <td><strong>Blacklist RBL (30+ Nodi)</strong></td>
            <td>Query DNS inverse simultanee sui registri globali (Spamhaus, Barracuda, SORBS, SpamCop).</td>
            <td>Indice di compromissione/reputazione dell'IP del mail server aziendale.</td>
          </tr>
        </tbody>
      </table>

      <!-- Differenziatori Unici -->
      <div class="section-title">4. Differenziatori di Mercato & AI Remediation Copilot</div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title">
            <span class="badge-pill badge-emerald">Esclusiva</span>
            AI Remediation Copilot
          </div>
          <div class="card-desc">
            Non si limita a segnalare gli errori: analizza l'infrastruttura e genera lo script di risoluzione immediato (comandi <span class="code-tag">ufw/iptables</span>, configurazioni Nginx con <span class="code-tag">add_header HSTS</span> e record DNS esatti).
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span class="badge-pill badge-blue">Temporal</span>
            Scan History & Security Drift
          </div>
          <div class="card-desc">
            Tracciamento continuo delle scansioni storiche con confronto visivo tra oggi e 30 giorni fa. Evidenza istantanea di nuove porte aperte per errore e calcolo del Delta Score (+/- punti).
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">
            <span class="badge-pill badge-purple">Enterprise</span>
            Asset Inventory & Webhook Alerting
          </div>
          <div class="card-desc">
            Catalogazione degli asset aziendali con trigger automatici via Webhook su <strong>Telegram, Slack e Microsoft Teams</strong> in caso di degrado di sicurezza o regressione.
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span class="badge-pill badge-amber">Client Ready</span>
            Reportistica PDF Esecutiva
          </div>
          <div class="card-desc">
            Esportazione istantanea in <strong>Report PDF Esecutivo</strong> formattato con anagrafica cliente, summary, metriche e remediation, pronto per allegati a preventivi o audit.
          </div>
        </div>
      </div>

      <!-- Box Chiusura -->
      <div class="highlight-box">
        <strong>💡 Modello di Proposta per il Cliente:</strong> Esecuzione di una scansione pilota live (5 minuti) sul loro dominio aziendale per dimostrare la veridicità delle metriche e generare l'Executive Risk Report.
      </div>
    </div>

    <div class="footer">
      <div>NetworkDiag Ops Pro &bull; Proprietà Riservata &bull; Sviluppato per Ecosistema Mark2 & Partners</div>
      <div>Pagina 2 di 2</div>
    </div>
  </div>

</body>
</html>
`;

async function generatePDF() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  
  const downloadsPath = path.join(process.env.HOME || '/Users/marco', 'Downloads', 'NetworkDiag_Ops_Pro_Presentazione_Funzionale.pdf');
  const projectDocPath = path.join('/Users/marco/Sviluppo/Progetti/Progetto network-diagnostic-tool', 'NetworkDiag_Ops_Pro_Presentazione_Funzionale.pdf');
  
  await page.pdf({
    path: downloadsPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
  });
  
  fs.copyFileSync(downloadsPath, projectDocPath);

  await browser.close();
  console.log('PDF Generated successfully at:', downloadsPath);
}

generatePDF().catch(console.error);
