# ⚡ NetworkDiag Ops Pro & Vulnerability Scanner

> Suite avanzata di **diagnostica di rete, analisi infrastrutturale, vulnerability assessment, discovery LAN/WiFi e manuale operativo con export PDF**, costruita con Next.js 14, Tailwind CSS, TypeScript e Turso (LibSQL).

---

## 🌟 Panoramica delle Funzionalità

La piattaforma è suddivisa in **5 sezioni operative principali**:

### 1. 🌐 External Network Diagnostics Suite (12 Moduli)
Analisi server-side profonda verso qualsiasi host, dominio o indirizzo IP pubblico:
- **Propagazione DNS Globale**: Risoluzione parallela su 6 resolver mondiali (Google, Cloudflare, Quad9, OpenDNS, AdGuard, Level3).
- **Waterfall TTFB & Latenza Frazionata**: Scomposizione in millisecondi precisi di DNS Lookup, TCP Handshake, TLS Negotiation e Server Response (TTFB).
- **Protocolli HTTP/2 & HTTP/3 (QUIC)**: Negoziazione ALPN e rilevamento protocolli ad alte prestazioni su UDP.
- **Reverse DNS (PTR Lookup)**: Risoluzione inversa host da indirizzi IPv4/IPv6 pubblici.
- **Traceroute Visivo**: Tracciamento dei singoli nodi (hop) e latenza di tratta.
- **IPv6 & Dual-Stack**: Verifica supporto AAAA e conformità RFC 8305 (Happy Eyeballs).
- **DNS Lookup Completo**: Risoluzione record `A`, `AAAA`, `MX`, `TXT` con parsing formattato.
- **Ping / Latenza Socket**: Misura precisa del tempo di risposta TCP su socket 443/80.
- **Port Scanner**: Verifica disponibilità porte critiche (21, 22, 25, 80, 443, 3306, 5432, 8080).
- **Certificato SSL/TLS**: Validità crittografica, Issuer, Subject e contatore giorni alla scadenza.
- **WHOIS & Domain**: Dati registrar, nameservers e data di scadenza del dominio.
- **HTTP & Response Time**: Codici di stato HTTP e tempi di caricamento.

---

### 2. 📶 Internal Client Diagnostics & Speedtest
Strumenti di misurazione eseguiti direttamente dal browser e dalla scheda di rete:
- **Speedtest Throughput Reale**: Misurazione live di Download (Mbps), Upload (Mbps), Ping e Jitter con tachimetro circolare animato.
- **Scansione LAN & Mappa WiFi/Cavo Ethernet**: Rilevamento automatico dell'interfaccia attiva (WiFi o Cavo Ethernet), IP locale, Gateway del router e scansione ARP automatica per mappare tutti i dispositivi collegati alla rete locale (con export CSV).
- **IP Pubblico & ASN**: Geolocalizzazione IP, provider e organizzazione autonoma.
- **IP Privato WebRTC**: Rilevamento IP locale nella LAN via WebRTC SDP candidate.
- **Velocità Risoluzione DNS**: Benchmark di fetch verso nodi edge CDN.
- **Qualità Connessione & RTT**: Stima banda downlink e latenza di rete.
- **Perdita Pacchetti**: Calcolo percentuale packet loss su raffica di richieste sequenziali.

---

### 3. 🛡️ Security Audit & Email Posture
Audit approfondito della sicurezza del dominio e della postura email:
- **Security Headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- **Email Authentication**: Validazione record SPF, DKIM e DMARC (`p=reject/quarantine`).
- **DNSSEC**: Verifica crittografica della catena di autenticazione DNS.
- **Blacklist / RBL Check**: Controllo reputazione IP su Spamhaus, Sorbs, SpamCop e Barracuda.
- **Subdomain Enumeration**: Individuazione di host e sottodomini comuni esposti.
- **Admin Panel Exposure**: Rilevamento di pannelli di controllo e login raggiungibili.

---

### 4. 🚨 Vulnerability & Misconfiguration Scanner
Rilevamento proattivo di falle applicative e perimetrali con Risk Meter (0-100):
- **File Sensibili & Backup**: Rilevamento di `.env`, `.git/HEAD`, `backup.sql`, `dump.sql`, `security.txt`.
- **CORS Misconfiguration**: Controllo di origin reflection con credenziali attive (`Access-Control-Allow-Credentials: true`).
- **Cookie Security Audit**: Verifica della presenza dei flag `HttpOnly`, `Secure` e `SameSite`.
- **DNS CAA Authorization**: Verifica delle Certificate Authority autorizzate ad emettere certificati (RFC 6844).
- **Forzatura HTTPS 301**: Controllo del redirect automatico e permanente su porta 80.
- **WAF & CDN Shield**: Identificazione firme di Cloudflare, AWS CloudFront/WAF, Akamai, Fastly, Sucuri.

---

### 5. 📖 Manuale Operativo & Guida Tecnica PDF
Documentazione operativa integrata direttamente nell'applicazione:
- **Capitolo 1**: Diagnostica Esterna (Metriche, soglie di performance TTFB e ALPN).
- **Capitolo 2**: Rete Locale (Individuazione scheda WiFi/Ethernet, Gateway e tabella ARP).
- **Capitolo 3**: Vulnerability Assessment (Istruzioni di remediation per `.env`, cookie e CORS).
- **Capitolo 4**: Hardening Server VPS Linux (Regole Firewall UFW, SSH Key-only, Fail2ban e patch).
- **Generatore PDF**: Download istantaneo del manuale tecnico formattato in formato PDF.

---

## 🗄️ Database & Autenticazione (Turso LibSQL)

Il backend utilizza **Turso (LibSQL)** per garantire elevate prestazioni all'edge e compatibilità serverless:
- Autenticazione con password hashate tramite `bcryptjs` e token JWT di sessione (`jose`).
- Tabelle auto-configurate (`users`, `test_history`) con storico salvato e consultabile tramite il **History Drawer**.
- Supporto per esecuzione come **Ospite** (senza account) o come **Utente Registrato** con sincronizzazione cloud.

---

## 🚀 Setup & Installazione Locale

### 1. Clona il repository
```bash
git clone https://github.com/mark2gest-hue/network-diagnostic-tool.git
cd network-diagnostic-tool
```

### 2. Installa le dipendenze
```bash
npm install
```

### 3. Configura le variabili d'ambiente (`.env.local`)
```env
TURSO_DATABASE_URL=libsql://tuo-db.aws-eu-west-1.turso.io
TURSO_AUTH_TOKEN=tuo_token_turso
JWT_SECRET=tuo_jwt_secret_generato
```

### 4. Avvia in sviluppo o produzione
```bash
# Sviluppo
npm run dev

# Produzione
npm run build
npm start
```
Apri **[http://localhost:3000](http://localhost:3000)** nel tuo browser.

---

## 📄 Esportazione Report
- **PDF Manual & Executive Summary**: Genera documenti tecnici pronti per audit IT e clienti.
- **CSV LAN Inventory**: Esporta l'elenco completo dei dispositivi connessi al WiFi/Ethernet con un click per Microsoft Excel o Google Sheets.
- **JSON Test Dumps**: Esportazione strutturata di tutti i payload diagnostici.

---

## 🛠️ Stack Tecnologico
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons, jsPDF, jspdf-autotable.
- **Backend**: Node.js Serverless Routes, Native DNS Promises, Child Process Socket Probes.
- **Database**: Turso LibSQL Client (`@libsql/client`).
- **Sicurezza**: Jose (JWT), Bcryptjs, Zod Schema Validation.
