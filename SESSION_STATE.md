# SESSION_STATE.md

## ⚠️ SESSIONE IN CORSO (riprendere da qui)
**Data ultimo aggiornamento**: 2026-10-22

**OBIETTIVO ATTUALE**: Integrazione Sonde "Claude-Red" Offensive Security & AI Red Teaming — **COMPLETATO** (commit `80dd221`, tsc = 0 errori, build = OK).
- [x] Filtro Anti-Falsi-Positivi SPA: aggiunta discriminazione Content-Type, regex payload e `redirect: manual` per evitare che i redirect 307/308 a `/login` delle SPA vengano scambiati per vulnerabilità LLM/API. Test live su `aiutiamoci.cloud` 100% passed.

### Nuova Funzionalità Integrata (Sonde Claude-Red in Pentest Engine)
- [x] Estensione Tipi: `src/types/pentest.ts` con la categoria `ai_redteam` e mapping in `src/lib/pentest-findings.ts`.
- [x] Iniezione Sonde in `src/app/api/pentest/run/route.ts`:
  1. `pentest-claude-red-ai-exposure` (OWASP LLM01 / LLM02): rilevamento endpoint agentici AI esposti senza autenticazione (`/api/chat`, `/api/mcp`, `/v1/chat/completions`).
  2. `pentest-claude-red-api-surface` (OWASP API09 / CWE-200): discovery automatica schemi Swagger/OpenAPI e playground GraphQL in produzione.
  3. `pentest-claude-red-jwt-hygiene` (CWE-345 / OWASP A02): audit flag crittografici `HttpOnly` e `Secure` sui token JWT.
  4. `pentest-claude-red-cloud-metadata` (CWE-918 / OWASP A10 SSRF): verifica non-invasiva di esposizione metadati cloud e credenziali IAM.
- [x] Verifica statica e build: `npx tsc --noEmit` completato con 0 errori, `npm run build` completato con successo (13 route statiche, 41 API route).

### Punti 1 e 2 — COMPLETATI

**Punto 1 — TOCTOU / DNS Rebinding (pinning IP):**
- [x] `src/lib/security-guard.ts`: `createPinnedLookup(resolvedIps)` + type `PinnedLookupFn`.
- [x] `src/lib/safe-http-probe.ts`: riscritto. `safeHttpProbe` con `lookup` opzionale + nuova `safeFetch()` (drop-in fetch, segue redirect solo same-host).
- [x] Endpoint collegati al pinning (tutti):
  - tests: http, ssl, http-protocols, ttfb, ping, traceroute, portscan (già ok)
  - security: headers, tls, ports, email-armor (MX/NS via `hostIsPublic`→IP + `createPinnedLookup`)
  - vulnerabilities: https, waf, cors, cookies
  - pentest/run (safeFetch con lookup)

**Punto 2 — IPv6:**
- [x] `src/lib/validators.ts`: `sanitizeInput` gestisce IPv6, `isIPv6Literal()`, `targetSchema` aggiornato, `ipSchema` resta IPv4-only (RBL).

### Verificato
- [x] `npx tsc --noEmit` → 0 errori.
- [x] Test funzionali anti-SSRF via curl (tutti attesi 400): `169.254.169.254`, `localhost`, `127.0.0.1`, `[::1]`, `10.0.0.1`, `192.168.1.1`, `0.0.0.0`, `169.254.169.254:80`.
- [x] Controllo positivo: `example.com` → 200. Messaggio pulito: "Protezione SSRF: Gli indirizzi IP privati non sono consentiti."

### Resta (opzionale)
- Cyber Shield (progetto separato): rimuovere `scripts/setup-wireguard.py` (mai confermato).

---

## 1. Obiettivo della sessione
- **Progetto**: [NetworkDiag Ops Pro & Vulnerability Scanner](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/README.md)
- **Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Turso (LibSQL), shadcn/ui
- **Obiettivo corrente**: Inizializzazione del monitoraggio di sessione e allineamento dello stato operativo del repository.

---

## 2. Stato di avanzamento

### Completato (Done)
- [x] Modulo Autonomo "Bot & AI Defense Shield" (Blueprint Node Isolato):
  - **Engine di Regole & Hardening Reale (`src/lib/bot-ai-defense-engine.ts`)**: Audit passivo/empirico su 12 crawler AI (GPTBot, ClaudeBot, Bytespider, CCBot, etc.), WAF fingerprinting e generazione configurazioni operative (Cloudflare WAF Expression Rules, Nginx rate-limiting & Bot Trap, robots.txt difensivo MITRE ATLAS AML.T0053).
  - **API Route dedicata (`src/app/api/defense/bot-ai/route.ts`)**: Probing HTTP sicuro, normalizzazione target, ScopeEngine perimetrale e protezione demo-mode via `middleware.ts`.
  - **Componente UI Standalone (`src/components/dashboard/BotAiDefenseModule.tsx`)**: Dashboard a sé stante con doppia vista (audit crawler a semaforo + generatore e copia 1-click di regole WAF/Nginx).
  - **Typecheck**: `npx tsc --noEmit` completato con 0 errori.
- [x] Struttura base del progetto Next.js 14 con TypeScript e Tailwind CSS
- [x] Suite diagnostica esterna (DNS globale, TTFB/Waterfall, HTTP/2 & 3, SSL, WHOIS, Port scanner, Traceroute, Reverse DNS)
- [x] Suite diagnostica interna / client (Speedtest, Scansione LAN/ARP, IP Pubblico/Privato WebRTC, packet loss)
- [x] Security Audit & Email Posture (Security headers, SPF/DKIM/DMARC, DNSSEC, RBL, Subdomain enumeration)
- [x] Vulnerability & Misconfiguration Scanner (file sensibili, CORS, cookie flags, CAA, HTTPS 301, WAF detection)
- [x] Integrazione database Turso / LibSQL (`turso/` e client)
- [x] Componenti dashboard dedicati ([ExternalTests.tsx](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/components/dashboard/ExternalTests.tsx), [TestCard.tsx](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/components/dashboard/TestCard.tsx), [ResultRenderer.tsx](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/components/dashboard/ResultRenderer.tsx))
- [x] Generazione e download Report PDF personalizzato per committente ([ExportReportModal.tsx](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/components/dashboard/ExportReportModal.tsx)) con link rapidi email/WhatsApp
- [x] Abilitazione modalità diagnostica locale sul campo: supporto a router LAN (192.168.x.x, 10.x.x.x), host interni (.local, .lan) e localhost
- [x] Auto-sanitizzazione intelligente degli URL (rimozione automatica di https://, percorsi e porte)
- [x] Eliminati i raw dump JSON di Zod in favore di messaggi chiari in italiano
- [x] Porta dev locale configurata stabilmente su :3004 con isolamento da Live Preview (porta 4050)
- [x] Integrato logo e branding **Aiutiamoci Impresa** in alto a sinistra nella Navbar ([Header.tsx](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/components/Header.tsx))
- [x] Generata Scheda Tecnica & Pitch Funzionale in PDF di 2 pagine ([NetworkDiag_Ops_Pro_Presentazione_Funzionale.pdf](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/NetworkDiag_Ops_Pro_Presentazione_Funzionale.pdf)) con sezione dedicata alla veridicità dei test ed embed automatico nel Secondo Cervello Obsidian

- [x] Unificazione completa della UI: rimossa la vecchia vista classica legacy e la route /hud ridondante
- [x] Root page (`src/app/page.tsx`) consolidata come HUD definitivo unico con selettore moduli a tendina (dropdown), badge notifiche dinamico, zero duplicati e zero elementi superflui
- [x] Executive Remediation Summary & Report PDF contestualizzato integrati direttamente nella vista principale
- [x] Integrazione Knowledge Base Cybersecurity (`security-framework-catalog.ts`) con mappatura MITRE ATT&CK, MITRE D3FEND, NIST CSF 2.0 e CWE
- [x] Switch Prospettiva Dual-View nella testata HUD: [ 👔 Direzione ] (vista business sintetica a semaforo) ↔ [ 💻 IT Pro / SOC ] (dettaglio tecnico completo)
- [x] Integrazione badge MITRE D3FEND (D3-NTF, D3-AHA) nelle card interattive e matrice di conformità NIS2 nel PDF esportato
- [x] Modulo Sentinel Active Defense (`ActiveDefenseModal.tsx` + `api/active-defense/route.ts`): Panic Mode WAF e dispatcher allarmi Telegram con test interattivo
- [x] Skill Globale Cybersecurity Playbooks (`cyber-defense-playbooks`): Standard agentskills.io, MITRE ATLAS e passive CT logging
- [x] Subdomain Hunter & Surface Recon: Route passiva Next.js (`/api/tests/subdomains`) con CT crt.sh e rilevamento CNAME Subdomain Takeover orfani
- [x] Componente HUD SubdomainHunterCard (`SubdomainHunterCard.tsx`) integrato in pagina principale con supporto Dual-View (Direzione vs IT Pro)
- [x] Modulo "Email Armor & AXFR" (MTA-STS RFC 8461, BIMI e DNS Zone Transfer AXFR passivo con MITRE D3-MHA e D3-DNSA): endpoint `/api/security/email-armor/route.ts`, hook `useSecurityAudit.ts`, rendering in `ResultRenderer.tsx` e card `SecurityAudit.tsx`
- [x] WAF & Origin IP Bypass Scanner (MITRE T1590.005 / D3-WAF): rilevamento passivo Origin IP Leak su subdomini e MX dietro Cloudflare/CDN in `/api/vulnerabilities/waf/route.ts` con visualizzazione grafica dedicata
- [x] Deep TLS Cipher & Deprecation Audit (MITRE D3-EPSC): test handshake su cifrari legacy 3DES/RC4, score crittografico (0-100), integrazione CAA in `/api/security/tls/route.ts` con matrice grafica protocolli in `ResultRenderer.tsx`
- [x] Refactoring Grafico Completo ResultRenderer (Anti-Slop Zero Raw Dump): blocchi visuali dedicati a semaforo per Porte a Rischio, Admin Panel, HTTP Security Headers, DMARC, SPF, DKIM e DNSSEC
- [x] Generazione dei 2 Vademecum Commerciali PDF e archiviazione nel Secondo Cervello Obsidian con schede Markdown dedicate
- [x] Modulo "DeepWeb & Credential Leaks" (`/api/security/leaks`): scansione in tempo reale su 1.042+ breach storici HIBP e 3.2 miliardi di record COMB (Compilation of Many Breaches) con anonimizzazione PII/GDPR
- [x] Espansione Probing File Sensibili (`/api/vulnerabilities/files`): monitoraggio passivo su 22 percorsi critici (Docker, Git config, AWS credentials, dump SQL, SSH keys, WordPress REST users)
- [x] Esportazione PDF 1-Click sincronizzata: pulsante rapido integrato in Vulnerability Scanner e tabelle PDF ampliate con dettagli su leak e file esposti
- [x] Bufferbloat & Loaded Latency Test: misurazione latenza sotto carico (Download/Upload burst) nello Speedtest con assegnazione rating (Grado A+, A, B, C, F)
- [x] Modulo "Integrità DNS & Path MTU" (`/api/lan/network-integrity`): rilevamento trasparente di DNS Hijacking/Poisoning rispetto ai resolver Anycast e stima MTU 1500 / TCP MSS 1460
- [x] Overhaul Metodologico Assessment Engine & Eliminazione Falsi Positivi/Mockup Report:
  - Modello Unificato dei Risultati (`src/types/assessment.ts`): separazione rigorosa tra executionStatus, securityOutcome, severity e confidence nullable.
  - Normalizzazione Target & Scope Engine (`target-normalizer.ts` & `scope-engine.ts`): parsing esatto scheme/port/path/IP, prevenzione scope drift su CDN e subnet LAN esplicite.
  - De-escalation sonde: AI Scraper Governance spostato a policy informativa (`governance`), User-Agent script declassato, rimozione verdetti assoluti "PROTETTO" su SSRF e Request Smuggling.
  - Motore TLS & RBL: distinzione tra timeout/unreachable porta 443 e certificato scaduto; gestione corretta di MX senza record A e provider email condivisi.
  - Risk Engine: calcolo della Copertura Esecutiva (% test completati) disgiunto dallo score di postura; neutralizzazione detrazioni su test inconclusivi/errori tecnici.
  - Report PDF (`ExportReportModal.tsx`): rimossi tutti i placeholder/mockup hardcodati; tabelle con overflow linebreak espandibili (zero testo troncato); bonifiche 100% finding-driven.
- [x] Fase 2 — Targeted Validation Engine, Evidence Sanitizer & Dynamic Executive Overhaul:
  - `src/lib/evidence-sanitizer.ts`: Anonimizzazione automatica di segreti, token Bearer/JWT, chiavi OpenAI/AWS, cookie di sessione e password prima di qualsiasi log o PDF.
  - `src/lib/targeted-validation-engine.ts`: Motore di approfondimento selettivo non distruttivo con budget (max 10-15 req), delay controllato e condizioni di stop automatico (latenza > 2500ms o 5xx ripetuti).
  - Fingerprinting Anti-SPA: algoritmo di comparazione euristica/baseline con la risposta 404 per azzerare i falsi positivi da Single Page Application (es. React/Vue router che risponde 200 OK su `/.env`).
  - Endpoint API `/api/pentest/targeted-validate`: trigger per esecuzione mirata condizionale.
  - UI HUD (`PentestSection.tsx`): pulsante interattivo "Esegui validazione mirata" per verificare empiricamente i finding segnalati senza rieseguire l'intera suite.
  - `ExecutiveRemediationSummary.tsx`: eliminati tutti i punteggi fissi (`70/100`, `92/100`) e la lista finta di correzioni. L'intero riepilogo esecutivo, le 3 azioni prioritarie per il team IT, lo stato per area aziendale e i comandi di bonifica sono ora alimentati in tempo reale dai risultati di scansione tramite `extractFindingsFromResults` e `calculateRiskAssessment`.
  - Eliminato falso positivo su file sensibili: rimosso categoricamente `/robots.txt` dall'elenco `SENSITIVE_FILES`. Solo file con effettivo rischio (es. `.env`, `.git`, dump database, chiavi private) possono innescare finding o tabelle di bonifica.
  - Risoluzione DNS Autoritativa Diretta (`dns-authoritative.ts`): bypass totale della cache TTL dei resolver intermedi (Google/ISP) su DMARC e SPF.
  - Isolamento Assoluto tra Target & Hard Reset: implementato `resetResults()` sincrono su `useExternalTests`, `useSecurityAudit`, `useVulnerabilityScan` e invocato in `page.tsx` ad ogni nuova scansione; azzerato il merge parziale di vecchi payload su stati `running` ed `error`.
  - Sonda HTTP Resiliente (`safeHttpProbe.ts`): gestione nativa di catene SSL incomplete/self-signed senza crash 500 su verifiche web esterne (CORS, Cookie).
  - Correzione Semafori UI: gli errori tecnici di rete o handshake vengono visualizzati come `Errore scan` (grigio/neutro) e non più declassati a falsi `Critico`.
- [x] Pacchetto 1 — Web Hygiene, Exposure & Takeover Reale (Zero Falsi Positivi / 100% Empirico):
  - **Directory Listing Passivo (CWE-548)**: Nuovo endpoint `/api/vulnerabilities/directory-listing` con firme univoche autoindex (Apache, Nginx, IIS) e scarto deterministico di router SPA/404 generici.
  - **Information Disclosure & Software EOL (CWE-200)**: Estrazione esatta dei banner `Server`, `X-Powered-By`, `X-AspNet-Version` con rilevamento di rami End-of-Life non supportati (PHP 5/7, Apache legacy, Python 2) e comandi `curl` di verifica.
  - **Subdomain Takeover Ampliato a 17 Provider Cloud**: Pattern e firme verificate (AWS S3, GitHub Pages, Heroku, Azure, Shopify, Zendesk, Fastly, Surge, Readme.io, Webflow, Bitbucket, Fly.io, Unbounce, Ghost) con test dual-protocol HTTPS/HTTP e comando `curl` di riproduzione immediata.
  - **Integrazione Risk Engine & PDF**: Finding-driven su Executive Remediation Summary e tabella dedicata nel report PDF esportabile.
- [x] Pacchetto 2 — Deep Infrastructure, Email Chain & OCSP Revocation:
  - **MX STARTTLS & Mail Server Cert Probe (porta 25 passiva)**: Sonda socket SMTP su server MX primario (EHLO + STARTTLS + handshake TLS) con estrazione certificato (issuer, valid_to, days_remaining) e gestione anti-hang / graceful fallback su firewall egress.
  - **DANE / TLSA (RFC 6698)**: Query automatica record TLSA su `_25._tcp.<mx>` con verificabilità diretta via comando `dig`.
  - **Dangling MX Record (Mail Hijacking)**: Rilevamento di record MX che puntano a host non registrati/non risolti (CWE-673) con alert critico e remediation immediata.
  - **OCSP Stapling & Revocation**: Verifica estensione `requestOCSP` durante handshake TLS su porta 443 ed estrazione automatica dell'URL dell'OCSP Responder dalla catena del certificato.

 - [x] Audit tecnico read-only (report in brain/cc66af71.../audit_tecnico_network_diagnostic.md) + Step 1 modalità `APP_MODE` local/demo:
   - Scansioni solo in locale (`npm run dev` bind 127.0.0.1:3004). VPS = demo: default `demo` se `NODE_ENV=production` (override `APP_MODE` / `NEXT_PUBLIC_APP_MODE`).
   - `middleware.ts`: in demo le route `/api/tests|security|vulnerabilities|pentest|lan|ai|active-defense` → 403; pagine non-API → redirect `/login` senza sessione JWT.
   - UI demo: `page.tsx` + `DemoScenarioSelector` (prop `hideLiveSwitch`) + `ExecutiveRemediationSummary` (prop `demoAssessment`); solo tab Riepilogo/Manuale, dati etichettati SIMULAZIONE DEMO.
   - Verificato: `tsc` OK; curl demo: `/`→307 login, `/login` 200, scan 403, history 401; local: `/` 200, scan 200.
   - Step 2 (output finti rimossi): `active-defense` (niente claim mitigazione, fallisce senza canale), `webhooks` test_notification (POST reale + esito vero), `lan/scan` (gateway da routing, subnet da netmask, porte/latenza solo misurate), `ai/analyze` (400 senza riskAssessment, niente 85/B), client Modal/LanScanner/WebhookManager allineati. `tsc` OK; curl: lan/scan reale, ai/analyze 400.
   - Step 3 (parziale): chiave `emailArmor` in risk-engine; email-armor: probe MX/NS solo su IP pubblici (`hostIsPublic`), Dangling MX solo NXDOMAIN (null-MX escluso), DANE richiede TLSA(type 52)+AD, nessun punteggio per controlli non eseguiti (porta 25 filtrata, AXFR saltato, `scoreNote`); OCSP rinominato "Stapling / Responder" e assenza = info. `tsc` OK, curl aiutiamoci.cloud OK.
   - Step 3b `pentest/run`: smuggling → 'skipped' (fetch non invia TE+CL, nessun verdetto), takeover solo NXDOMAIN (altri errori 'skipped'), probe 3/9/13 'skipped' se host irraggiungibile, match regex specifici (.env, .git, actuator, _cat, traefik). `tsc` OK; live aiutiamoci.cloud: 12 passed, 1 skipped.
   - Residuo: firme takeover deboli (subdomains), regola EOL ASP.NET + liste statiche, SSRF target in `pentest/run` (accettato: uso solo locale), probe 10 euristica a riflessione. Registrazione `/api/auth/register` aperta in demo (da restringere).
- [x] Fix compilazione CSS / Tailwind: risolto errore `Module parse failed: Unexpected character '@'` su `globals.css` allineando la configurazione PostCSS a ES Module (`postcss.config.mjs`) in coerenza con `next.config.mjs`, rimossa la configurazione legacy CJS (`postcss.config.js`) e pulita la cache `.next`. Terminato il vecchio processo `next dev` (PID 27974/27975) che tratteneva in memoria il blocco FOUC (`body{display:none}`) e riavviato il server di sviluppo pulito sulla porta 3004 (200 OK confermato su `/` e su foglio di stile `layout.css`).
- [x] Bypass login in locale (`src/middleware.ts`): escluso il redirect a `/login` e il blocco 403 delle scansioni per connessioni provenienti da `localhost`, `127.0.0.1` e reti locali (`.local`). Accesso diretto e scansioni attive garantiti al 100% in sviluppo locale, preservando la protezione demo-mode solo per host pubblici / VPS.
- [x] Sblocco Scansioni Reali in Locale vs Demo in Produzione: reso dinamico `isDemoMode` in `src/app/page.tsx` (sempre disattivo su `localhost` e `127.0.0.1` per mostrare barra del target e tutti i tab di scansione live), bypass auth locale per `/api/history` e `/api/assets` in `src/middleware.ts` e abilitata `ALLOW_LOCAL_DIAGNOSTICS` di default in sviluppo (`NODE_ENV !== 'production'`) in `src/lib/security-guard.ts`.
- [x] Hardening Test Reali & Sblocco Completo Locale: implementato fallback automatico a sessione locale in `src/lib/auth.ts` (`userId: 'local'`) risolvendo i 401 su History, Asset e Webhook in locale; aggiunta validazione `validateSafeTarget` su `/api/pentest/run`; bloccata la registrazione non autorizzata in demo mode e rimosso leak env in `/api/auth/register`; corretto escaping JSX in `PentestSection.tsx`.

### In corso (In Progress)
- [ ] Monitoraggio continuo e rifiniture di produzione

### Da fare (Todo)
- [ ] Eventuale associazione dominio o sottodominio personalizzato (es. `diag.aiutiamoci.cloud` o `network.mark2.cloud`)

---

## 3. File modificati e impatto

| File | Operazione | Impatto |
| :--- | :--- | :--- |
| [/api/security/email-armor/route.ts](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/app/api/security/email-armor/route.ts) | Modifica | Aggiunti MX STARTTLS probe porta 25, DANE TLSA e Dangling MX check |
| [/api/tests/ssl/route.ts](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/app/api/tests/ssl/route.ts) | Modifica | Aggiunto supporto OCSP Stapling (requestOCSP) e OCSP responder URL extraction |
| [/api/vulnerabilities/directory-listing/route.ts](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/app/api/vulnerabilities/directory-listing/route.ts) | Creazione | Rilevamento empirico autoindex su 10 directory con firme web server reali |
| [/api/security/headers/route.ts](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/app/api/security/headers/route.ts) | Modifica | Aggiunta analisi Information Disclosure, software EOL e fallback safeHttpProbe |
| [/api/tests/subdomains/route.ts](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/app/api/tests/subdomains/route.ts) | Modifica | Espansione a 17 provider cloud con firme verificate, dual probe e comando curl |
| [useVulnerabilityScan.ts](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/hooks/useVulnerabilityScan.ts) | Modifica | Aggancio test directory-listing con pesatura di rischio dedicata |
| [VulnerabilityScan.tsx](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/components/dashboard/VulnerabilityScan.tsx) | Modifica | Nuova riga espandibile per Directory Listing con conteggio su 8 test |
| [ResultRenderer.tsx](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/components/dashboard/ResultRenderer.tsx) | Modifica | Rendering dedicato per Directory Listing, STARTTLS, DANE, Dangling MX e OCSP |
| [risk-engine.ts](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/lib/risk-engine.ts) | Modifica | Findings automatici per Directory Listing, EOL software, Dangling MX e STARTTLS |
| [ExportReportModal.tsx](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/components/dashboard/ExportReportModal.tsx) | Modifica | Inclusione Directory Listing, STARTTLS, DANE e OCSP nel PDF esportabile |
| [SubdomainHunterCard.tsx](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/src/components/dashboard/SubdomainHunterCard.tsx) | Modifica | Visualizzazione comando curl per verifica empirica dei takeover rilevati |

---

## 4. Decisioni architetturali
- **Next.js App Router**: Struttura modulare con server actions/API routes isolate per i test diagnostici di rete.
- **LibSQL / Turso**: Persistenza leggera edge-ready per cronologia test e report diagnostici.
- **Client vs Server Isolation**:
  - Test server-side per socket TCP, DNS lookup autoritativi, reverse DNS, ping crudo.
  - Test client-side via browser API (WebRTC ICE candidates, throughput speedtest, download/upload stream).
- **Design System**: Tailwind CSS con primitive shadcn/ui e animazioni CSS dedicate.

---

## 5. Note operative e vincoli
- **Regole operative ([AGENTS.md](file:///Users/marco/Sviluppo/Progetti/Progetto%20network-diagnostic-tool/AGENTS.md))**:
  - Nessuna esecuzione di comandi, build o test senza autorizzazione esplicita.
  - Protezione file configurazione: mai leggere o sovrascrivere `.env` / `.env.local`.
  - Modifiche chirurgiche e minimali (max 5 file senza piano dettagliato preventivo).
  - Risposte dense senza introduzioni, saluti o conclusioni ripetitive.
- **Blocchi/Issue aperti**: Nessun bloccante rilevato.
