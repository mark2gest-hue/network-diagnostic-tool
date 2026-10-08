import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDirDownloads = '/Users/marco/Downloads';
const outDirObsidian = '/Users/marco/Library/Mobile Documents/iCloud~md~obsidian/Documents/KnowledgeBase/01_Progetti';

const htmlTemplate = (title, badge, accentColor, accentDark, content) => `
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

  @page {
    size: A4;
    margin: 16mm 15mm 16mm 15mm;
    @bottom-right {
      content: counter(page);
    }
  }

  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.5;
    font-size: 10pt;
    margin: 0;
    padding: 0;
  }

  .header {
    border-bottom: 2px solid ${accentColor};
    padding-bottom: 12px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .header-left h1 {
    font-size: 18pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 3px 0;
    letter-spacing: -0.5px;
  }
  .header-left p {
    font-size: 9.5pt;
    color: #64748b;
    margin: 0;
    font-weight: 500;
  }
  .header-badge {
    background: ${accentColor}18;
    color: ${accentDark};
    border: 1px solid ${accentColor}40;
    padding: 5px 12px;
    border-radius: 9999px;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .section-title {
    font-size: 11.5pt;
    font-weight: 800;
    color: #0f172a;
    border-left: 4px solid ${accentColor};
    padding-left: 9px;
    margin-top: 18px;
    margin-bottom: 8px;
    letter-spacing: -0.2px;
    page-break-after: avoid;
  }

  .lead-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 14px;
    font-size: 9.5pt;
    color: #334155;
    line-height: 1.48;
  }
  .lead-box strong { color: #0f172a; }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }

  .card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    page-break-inside: avoid;
  }
  .card-title {
    font-size: 9.8pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .card-title .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${accentColor};
    display: inline-block;
  }
  .card p {
    font-size: 8.8pt;
    color: #475569;
    margin: 0;
    line-height: 1.42;
  }

  .modalita-box {
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 9px;
    background: #fdfdfd;
    page-break-inside: avoid;
  }
  .modalita-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .modalita-title {
    font-weight: 800;
    font-size: 10pt;
    color: #0f172a;
  }
  .modalita-tag {
    font-size: 7.5pt;
    font-weight: 700;
    background: #f1f5f9;
    color: #475569;
    padding: 2px 7px;
    border-radius: 5px;
    text-transform: uppercase;
  }
  .modalita-desc {
    font-size: 8.8pt;
    color: #334155;
    margin: 0 0 5px 0;
    line-height: 1.42;
  }
  .modalita-target {
    font-size: 8.4pt;
    color: #64748b;
    border-top: 1px dashed #e2e8f0;
    padding-top: 4px;
    margin: 0;
  }
  .modalita-target strong { color: #1e293b; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6px;
    margin-bottom: 12px;
    font-size: 8.8pt;
    page-break-inside: avoid;
  }
  th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    padding: 7px 9px;
    text-align: left;
    font-size: 8.4pt;
    letter-spacing: 0.2px;
  }
  th:first-child { border-top-left-radius: 5px; }
  th:last-child { border-top-right-radius: 5px; }
  td {
    padding: 6px 9px;
    border-bottom: 1px solid #e2e8f0;
    color: #334155;
  }
  tr:nth-child(even) td { background: #f8fafc; }

  .tip-box {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    padding: 9px 12px;
    border-radius: 6px;
    margin-top: 12px;
    font-size: 8.8pt;
    color: #1e40af;
    page-break-inside: avoid;
  }
  .tip-box strong { color: #1e3a8a; }

  .footer {
    margin-top: 20px;
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
    display: flex;
    justify-content: space-between;
    font-size: 7.5pt;
    color: #94a3b8;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${title}</h1>
      <p>Guida Strategica alla Proposta di Valore & Modelli di Commercializzazione B2B</p>
    </div>
    <div class="header-badge">${badge}</div>
  </div>

  ${content}

  <div class="footer">
    <span>Documento Riservato ad Uso Commerciale — Ecosistema Mark 2.0 / Aiutiamoci</span>
    <span>Versione Aggiornata — Ottobre 2026</span>
  </div>
</body>
</html>
`;

// ==========================================
// CONTENUTO PDF 1: PIATTAFORMA FORMAZIONE AI
// ==========================================
const contentFormazione = `
  <div class="lead-box">
    <strong>Sintesi Esecutiva per il Venditore:</strong> Questo software risponde alla più grande urgenza delle aziende medio-grandi nel 2026: 
    <strong>l'adozione pratica dell'Intelligenza Artificiale nei processi quotidiani</strong>. Non è un corso teorico registrato su video, 
    ma un <strong>Campus Interattivo completo</strong> con Tutor AI 24/7 e 12 microtool operativi che automatizzano il lavoro d'ufficio fin dal primo giorno, 
    con la possibilità per il cliente di trasformarlo nella propria <strong>Academy Aziendale Privata</strong> blindata sui propri documenti interni.
  </div>

  <div class="section-title">1. Cosa Risolve nell'Azienda (I Punti di Dolore del Cliente)</div>
  <div class="grid-3">
    <div class="card">
      <div class="card-title"><span class="dot"></span>Zero Teoria Astratta</div>
      <p>I dipendenti non devono imparare concetti matematici, ma comandi pratici per velocizzare preventivi, email, analisi documenti e gestione ordini.</p>
    </div>
    <div class="card">
      <div class="card-title"><span class="dot"></span>Freno Riservatezza & GDPR</div>
      <p>I vertici aziendali vietano ChatGPT pubblico per paura di fughe di dati. La nostra piattaforma opera in ambiente sicuro senza addestramento di terzi.</p>
    </div>
    <div class="card">
      <div class="card-title"><span class="dot"></span>Onboarding Lento Nuovi Assunti</div>
      <p>Trasmettere il "sapere aziendale" costa centinaia di ore. L'Academy interna risponde automaticamente su mansionari, procedure e listini.</p>
    </div>
  </div>

  <div class="section-title">2. L'Architettura del Software: Cosa C'è Dentro</div>
  <div class="grid-2">
    <div class="card">
      <div class="card-title"><span class="dot"></span>Campus & Percorsi Formativi Dinamici</div>
      <p>Moduli strutturati per reparto aziendale (Amministrazione, Vendite, Risorse Umane, Marketing, Direzione). Ogni modulo ha quiz pratici ed esercizi guidati.</p>
    </div>
    <div class="card">
      <div class="card-title"><span class="dot"></span>Tutor AI Interattivo 24/7 (Socratico)</div>
      <p>Un coach virtuale dedicato che affianca ogni singolo collaboratore, risponde a dubbi operativi, corregge compiti ed elimina il blocco della pagina bianca.</p>
    </div>
    <div class="card">
      <div class="card-title"><span class="dot"></span>Hub di 12 Microtool da Ufficio (ROI Immediato)</div>
      <p>Assistenti integrati già pronti: estrazione fatture/scontrini in Excel, mediatore contratti e referti, preventivi blindati, solleciti di pagamento a 3 livelli, scanner bandi e fondi a fondo perduto, studio video reel e speech-to-text WhatsApp.</p>
    </div>
    <div class="card">
      <div class="card-title"><span class="dot"></span>Modulo "Corporate Academy Interna" (Enterprise)</div>
      <p>L'azienda carica i propri PDF interni (manuali di produzione, procedure ISO, cataloghi, policy interne). L'AI Tutor diventa l'esperto aziendale interno che guida il personale solo sulle regole della specifica azienda.</p>
    </div>
  </div>

  <div class="section-title">3. Le 3 Modalità di Vendita (Come Proporla sul Mercato)</div>

  <div class="modalita-box">
    <div class="modalita-header">
      <span class="modalita-title">Opzione A — Cloud SaaS a Pacchetto Corsisti (Avvio Rapido)</span>
      <span class="modalita-tag">Low-Friction</span>
    </div>
    <p class="modalita-desc">
      L'azienda acquista l'accesso alla piattaforma ospitata sui nostri server per un gruppo definito di collaboratori (es. 10, 25 o 50 utenze). Include tutti i corsi base/avanzati, l'AI Tutor e i microtool operativi. Ideale per partire subito senza richiedere nulla al reparto IT.
    </p>
    <p class="modalita-target"><strong>A chi proporla:</strong> Aziende che vogliono formare un team pilota (es. reparto commerciale o segreteria) prima di estendere il piano.</p>
  </div>

  <div class="modalita-box">
    <div class="modalita-header">
      <span class="modalita-title">Opzione B — Abbonamento Corporate Annuale (All-Inclusive Aziendale)</span>
      <span class="modalita-tag">Ricorrente B2B</span>
    </div>
    <p class="modalita-desc">
      Contratto annuale per l'intera forza lavoro con accessi illimitati, aggiornamento continuo dei contenuti con le ultime novità AI di mercato, report trimestrale di avanzamento per la Direzione HR e supporto dedicato.
    </p>
    <p class="modalita-target"><strong>A chi proporla:</strong> Direttori Risorse Umane (HR) e Direttori Generali che necessitano di un piano di welfare formativo continuo e tracciabile.</p>
  </div>

  <div class="modalita-box">
    <div class="modalita-header">
      <span class="modalita-title">Opzione C — Proprietà Totale & Academy Dedicata White-Label (On-Premise / Cloud Isolato)</span>
      <span class="modalita-tag">Enterprise Sovrana</span>
    </div>
    <p class="modalita-desc">
      Cessione d'istanza esclusiva personalizzata al 100% con logo, colori e dominio cliente (es. <em>academy.nomeazienda.it</em>). Include l'ingegnerizzazione del motore RAG interno sui documenti segreti dell'azienda, database isolato e garanzia di proprietà dell'infrastruttura.
    </p>
    <p class="modalita-target"><strong>A chi proporla:</strong> Grandi aziende strutturate (100-500 dipendenti) con documentazione riservata che non può transitare su piattaforme terze.</p>
  </div>

  <div class="section-title">4. Chi è il Decision Maker in Azienda (Chi Firma il Contratto)</div>
  <table>
    <thead>
      <tr>
        <th>Figura Aziendale</th>
        <th>Cosa gli Interessa</th>
        <th>La Frase Chiave per il Venditore</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Direttore HR / Personale</strong></td>
        <td>Onboarding veloce, upskilling del personale, tracciamento</td>
        <td>"Riduci dell'80% il tempo di affiancamento dei nuovi assunti grazie al tutor addestrato sui vostri manuali."</td>
      </tr>
      <tr>
        <td><strong>Titolare / Amministratore Delegato</strong></td>
        <td>Aumento produttività, stop a tempo perso su compiti ripetitivi</td>
        <td>"Invece di mandare le persone a corsi teorici inutili, diamo loro strumenti pratici che dimezzano il tempo di ufficio da lunedì."</td>
      </tr>
      <tr>
        <td><strong>Direttore Amministrativo / CFO</strong></td>
        <td>ROI immediato, fatture/preventivi veloci, zero costi hardware</td>
        <td>"Il costo si ripaga nel primo mese solo con il tempo risparmiato dall'amministrazione nella gestione documenti e solleciti."</td>
      </tr>
    </tbody>
  </table>

  <div class="tip-box">
    <strong>💡 Consiglio Tattico per il Venditore:</strong> Non vendere mai "un corso online". Vendere una <strong>"Infrastruttura di Adozione AI per l'Ufficio"</strong>. 
    L'argomento imbattibile è: <em>"L'AI non sostituisce le vostre persone, ma chi sa usare questi strumenti supera del 300% chi lavora ancora con i vecchi metodi manuali."</em>
  </div>
`;

// ==========================================
// CONTENUTO PDF 2: DIAGNOSTIC TOOL & CYBERSECURITY
// ==========================================
const contentDiagnostic = `
  <div class="lead-box">
    <strong>Sintesi Esecutiva per il Venditore:</strong> Nel 2026 la cybersecurity non è più un problema solo tecnico: 
    è una <strong>responsabilità legale e patrimoniale diretta degli amministratori (Direttiva Europea NIS2)</strong> e la condizione obbligatoria per farsi risarcire 
    dalle assicurazioni Cyber Risk. Questo software è una <strong>suite diagnostica perimetrale passiva</strong> che evidenzia in 30 secondi tutte le falle esterne dell'azienda 
    (email, porte esposte, file riservati, server visibili) e genera all'istante la <strong>Perizia Tecnica Ufficiale in PDF</strong>.
  </div>

  <div class="section-title">1. Perché le Aziende Medio/Grandi Comprano Oggi (Le 3 Leve di Paura & Valore)</div>
  <div class="grid-3">
    <div class="card">
      <div class="card-title"><span class="dot"></span>Direttiva NIS2 Obbligatoria</div>
      <p>Sanzioni fino a 10 milioni di euro o 2% del fatturato, con responsabilità personale e civile per gli amministratori in caso di omissione di controlli.</p>
    </div>
    <div class="card">
      <div class="card-title"><span class="dot"></span>Frode dell'IBAN / Mail Spoofing</div>
      <p>La truffa più diffusa nelle PMI: un'email fornitore contraffatta porta al bonifico su conti falsi. Il nostro tool blinda il trasporto email (MTA-STS/DMARC).</p>
    </div>
    <div class="card">
      <div class="card-title"><span class="dot"></span>Polizze Assicurative Cyber Risk</div>
      <p>Le compagnie rifiutano il risarcimento del danno se l'azienda non dimostra la bonifica periodica delle vulnerabilità e delle porte aperte.</p>
    </div>
  </div>

  <div class="section-title">2. Cosa Fa il Software (Spiegato Semplice, Senza Gergo Incomprensibile)</div>
  <div class="grid-2">
    <div class="card">
      <div class="card-title"><span class="dot"></span>Esecuzione 100% Passiva (Zero Rischi Legali)</div>
      <p>Ispeziona l'azienda dall'esterno esattamente come farebbe un attaccante, senza toccare i server interni, senza rischiare rallentamenti e senza bisogno di complesse manleve di pentest.</p>
    </div>
    <div class="card">
      <div class="card-title"><span class="dot"></span>Armatura Email & Anti-Phishing (Email Armor)</div>
      <p>Verifica non solo l'identità del mittente (SPF/DKIM/DMARC), ma attiva gli standard moderni di trasporto crittografato (MTA-STS e BIMI con logo verificato) e blocca i furti di zone DNS (AXFR).</p>
    </div>
    <div class="card">
      <div class="card-title"><span class="dot"></span>Rilevamento Porte Esposte & Server Nascosti</div>
      <p>Trova le porte sensibili lasciate aperte (database MySQL/Postgres, accesso SSH) e scopre se l'IP reale della fabbrica o dell'ufficio trapela su internet scavalcando la protezione del Cloudflare/WAF (Origin IP Leak).</p>
    </div>
    <div class="card">
      <div class="card-title"><span class="dot"></span>Scanner File Sensibili & Chiavi Segrete</div>
      <p>Intercetta all'istante se sviluppatori o webmaster hanno lasciato online file di configurazione con password (.env, .git, backup di database, token API Google/OpenAI/Stripe).</p>
    </div>
    <div class="card">
      <div class="card-title"><span class="dot"></span>Doppia Vista Unica: "Direzione" vs "IT Pro"</div>
      <p>In modalità Direzione mostra semafori chiari, percentuale di rischio e conformità NIS2. In modalità IT Pro fornisce i comandi esatti da copiare nel terminale per risolvere il problema in 10 minuti.</p>
    </div>
    <div class="card">
      <div class="card-title"><span class="dot"></span>Perizia Tecnica Esportabile in 1 Clic (PDF)</div>
      <p>Genera istantaneamente il documento peritale completo con timbro professionale, perfetto da presentare ai revisori legali, al CDA o al broker assicurativo.</p>
    </div>
  </div>

  <div class="section-title">3. Le 3 Modalità di Vendita (Come Proporla sul Mercato)</div>

  <div class="modalita-box">
    <div class="modalita-header">
      <span class="modalita-title">Opzione A — Check-up Perimetrale Spot & Certificato di Conformità (One-Shot)</span>
      <span class="modalita-tag">Punto d'Ingresso</span>
    </div>
    <p class="modalita-desc">
      Intervento singolo peritale: scansione completa dell'infrastruttura pubblica del cliente, rilascio del Report Esecutivo di 10 pagine, colloquio di restituzione tecnica con il loro responsabile IT e rilascio dell'attestato di conformità tecnica.
    </p>
    <p class="modalita-target"><strong>A chi proporla:</strong> Aziende che affrontano l'adeguamento normativo NIS2 annuale o il rinnovo della polizza assicurativa.</p>
  </div>

  <div class="modalita-box">
    <div class="modalita-header">
      <span class="modalita-title">Opzione B — Sorveglianza Continua 24/7 & Alerting Automatico (Canone Ricorrente)</span>
      <span class="modalita-tag">Continuità & Protezione</span>
    </div>
    <p class="modalita-desc">
      Monitoraggio notturno silenzioso automatico su tutti i domini, filiali e portali aziendali. In caso di improvviso calo del punteggio (es. un certificato in scadenza, una nuova porta aperta, un file .env caricato per errore), il sistema invia subito un allarme all'IT via Email o Telegram.
    </p>
    <p class="modalita-target"><strong>A chi proporla:</strong> Direttori Generali che non vogliono brutte sorprese e cercano una sentinella attiva tutto l'anno.</p>
  </div>

  <div class="modalita-box">
    <div class="modalita-header">
      <span class="modalita-title">Opzione C — Proprietà Dedicata & Appliance "Plug & Play" (On-Premise Sovrana)</span>
      <span class="modalita-tag">Proprietà Totale</span>
    </div>
    <p class="modalita-desc">
      L'azienda vuole la proprietà assoluta senza dipendere da fornitori esterni. Può essere fornita come <strong>Mini-PC Hardware compatto pre-configurato</strong> (basta inserire la spina della corrente e il cavo di rete nel router aziendale per accedere via browser) oppure installata su una VPS Cloud privata intestata direttamente alla Partita IVA del cliente. Zero dati escono dalla loro infrastruttura.
    </p>
    <p class="modalita-target"><strong>A chi proporla:</strong> Aziende medio-grandi con reparti IT interni, studi legali o aziende manifatturiere che esigono sovranità totale del dato.</p>
  </div>

  <div class="section-title">4. Chi è il Decision Maker in Azienda (Chi Firma il Contratto)</div>
  <table>
    <thead>
      <tr>
        <th>Figura Aziendale</th>
        <th>Cosa gli Interessa</th>
        <th>La Frase Chiave per il Venditore</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Amministratore Delegato / Titolare</strong></td>
        <td>Evitare danni reputazionali, fermo fabbrica e sanzioni penali/civili</td>
        <td>"La NIS2 vi chiama in causa personalmente: questo report vi dà la copertura formale che avete adottato tutte le misure necessarie."</td>
      </tr>
      <tr>
        <td><strong>Direttore Finanziario / CFO</strong></td>
        <td>Prevenire frodi su bonifici/fatture, ridurre il premio polizza cyber</td>
        <td>"Blindare il trasporto email evita la classica truffa del falso cambio IBAN che costa in media oltre 80.000 € alle medie imprese."</td>
      </tr>
      <tr>
        <td><strong>Responsabile IT / CISO</strong></td>
        <td>Avere uno strumento che gli risolve il lavoro e certifica il perimetro</td>
        <td>"Non siamo qui per criticare il vostro lavoro, ma per darvi il referto pronto e i comandi di fix già pronti per proteggervi prima dell'audit."</td>
      </tr>
    </tbody>
  </table>

  <div class="tip-box">
    <strong>💡 Il Segreto della Vendita: Il Metodo "Cavallo di Troia":</strong> Non chiedere mai un appuntamento per "parlare di sicurezza". 
    Fai inserire prima il dominio nel nostro tool, stampa l'estratto preliminare con i semafori rossi/gialli e presentalo direttamente: 
    <em>"Dottore, abbiamo rilevato queste 3 criticità aperte sul vostro sito: chiunque su internet può vederle. Vi lascio il referto per mettervi al riparo."</em> 
    Sarà il cliente a chiedervi subito: <em>"Cosa possiamo fare per risolverlo?"</em>
  </div>
`;

async function generatePdfs() {
  console.log('Avvio generazione PDF...');
  const browser = await chromium.launch({ headless: true });

  // 1. PDF Formazione AI
  const page1 = await browser.newPage();
  const html1 = htmlTemplate(
    'Piattaforma Formazione AI & Corporate Academy',
    'Vademecum Commerciale',
    '#6366f1',
    '#4338ca',
    contentFormazione
  );
  await page1.setContent(html1, { waitUntil: 'networkidle' });
  const file1Name = 'Vademecum_Commerciale_Piattaforma_Formazione_AI.pdf';
  const file1PathDownloads = path.join(outDirDownloads, file1Name);
  const file1PathObsidian = path.join(outDirObsidian, file1Name);
  
  await page1.pdf({
    path: file1PathDownloads,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '14mm', right: '14mm' }
  });
  fs.copyFileSync(file1PathDownloads, file1PathObsidian);
  console.log('Generato:', file1PathDownloads);

  // 2. PDF Diagnostic Tool
  const page2 = await browser.newPage();
  const html2 = htmlTemplate(
    'NetworkDiag Ops Pro & Cybersecurity Perimetrale',
    'Vademecum Commerciale',
    '#0284c7',
    '#0369a1',
    contentDiagnostic
  );
  await page2.setContent(html2, { waitUntil: 'networkidle' });
  const file2Name = 'Vademecum_Commerciale_NetworkDiag_Cybersecurity.pdf';
  const file2PathDownloads = path.join(outDirDownloads, file2Name);
  const file2PathObsidian = path.join(outDirObsidian, file2Name);

  await page2.pdf({
    path: file2PathDownloads,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '14mm', right: '14mm' }
  });
  fs.copyFileSync(file2PathDownloads, file2PathObsidian);
  console.log('Generato:', file2PathDownloads);

  await browser.close();
  console.log('Generazione completata con successo!');
}

generatePdfs().catch(console.error);
