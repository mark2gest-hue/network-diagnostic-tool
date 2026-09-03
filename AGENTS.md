# Regole operative del progetto

- **Analizza prima di modificare**: Esamina con attenzione il codice, il contesto e le dipendenze prima di apportare qualsiasi modifica.
- **Minimizza i file modificati**: Non cambiare più file del necessario; limita il raggio di modifica al minimo indispensabile.
- **Edits mirati**: Non riscrivere file interi; applica modifiche chirurgiche e localizzate.
- **Migrazioni SQL per modifiche allo schema**: Non modificare lo schema del database senza una migrazione SQL dedicata.
- **Nessuna dipendenza ingiustificata**: Non aggiungere nuove dipendenze senza una valida e chiara motivazione.
- **Quality check continuo**: Dopo l'implementazione di una feature, proponi typecheck, lint e test; eseguili solo dopo autorizzazione esplicita.
- **Protezione configurazioni (.env)**: Non toccare né sovrascrivere mai i file `.env`.
- **Pianificazione esplicita**: Prima di modificare più di 5 file, presenta sempre un piano dettagliato per approvazione.
- **Retrocompatibilità**: Mantieni sempre la retrocompatibilità con le API esistenti.
- **Consultazione preventiva skills**: Prima di implementare nuove funzionalità, automazioni o architetture, verifica le skill locali disponibili nel progetto o globali. Se una skill esterna è necessaria ma non accessibile, dichiaralo e chiedi all'utente di fornire le istruzioni rilevanti.

## Risposte dense

- Inizia direttamente dalla risposta, dal codice, dal diff o dal piano.
- Non usare saluti, introduzioni generiche, conclusioni ripetitive, auto-valutazioni o sign-off.
- Usa frasi brevi e bullet list piatte.
- Evita di ripetere la richiesta o vincoli già presenti.
- Per richieste semplici, mantieni la risposta entro 120 parole.
- Per richieste tecniche normali, mantieni la risposta entro 350 parole.
- Espandi oltre questi limiti solo se servono codice, test, sicurezza, rollback o istruzioni operative.

## Operazioni sensibili

- Prima di modificare file, elenca file coinvolti, piano e impatto.
- Non eseguire comandi, test, build, query, migrazioni o operazioni Git senza autorizzazione esplicita.
- Non fare commit, push, merge o deploy senza conferma esplicita.
- Non modificare direttamente `main`.
- Per auth, RLS, service role, profili, trigger, storage, webhook, PII o produzione, indica sempre fatti verificati, assunzioni, rischi, prerequisiti, rollback e test minimi.
- Non trattare la UI nascosta come autorizzazione.
- Non trattare un utente `authenticated` come team member.
- Verifica sempre membership/ownership lato server prima di operazioni sensibili.
- Non leggere, stampare o modificare `.env`, `.env.local`, password, token, chiavi API, cookie, URL privati o dati personali.

## Skill di progetto

Le skill sono gestite a livello globale in:
- `~/.gemini/config/skills/project-core`
- `~/.copilot/agents/project-core`


# Infrastruttura di Produzione (Oracle Cloud VPS)
- **Host VPS**: `130.110.10.77` (Ubuntu 24.04 LTS arm64)
- **SSH Key**: `/Users/marco/Downloads/ssh-key-2026-08-21.key` (User: `ubuntu`)
- **Cartella App su Server**: `/var/www/gestionale/`
- **Gestore Processi**: PM2 (`pm2 restart gestionale`)
- **Web Server & SSL**: Nginx con certificati SSL Let's Encrypt per `vlr-resorts.com`, `www.vlr-resorts.com`, `gestionale.vlr-resorts.com`
- **Comando Deploy Rapido**: `npm run build && rsync -avz -e "ssh -i /Users/marco/Downloads/ssh-key-2026-08-21.key -o StrictHostKeyChecking=no" dist ubuntu@130.110.10.77:/var/www/gestionale/ && ssh -i /Users/marco/Downloads/ssh-key-2026-08-21.key -o StrictHostKeyChecking=no ubuntu@130.110.10.77 "pm2 restart gestionale"`
