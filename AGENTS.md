# Regole operative del progetto

- **Analizza prima di modificare**: Esamina con attenzione il codice, il contesto e le dipendenze prima di apportare qualsiasi modifica.
- **Minimizza i file modificati**: Non cambiare più file del necessario; limita il raggio di modifica al minimo indispensabile.
- **Edits mirati**: Non riscrivere file interi; applica modifiche chirurgiche e localizzate.
- **Migrazioni SQL per modifiche allo schema**: Non modificare lo schema del database senza una migrazione SQL dedicata.
- **Nessuna dipendenza ingiustificata**: Non aggiungere nuove dipendenze senza una valida e chiara motivazione.
- **Quality check continuo**: Esegui typecheck, lint e test dopo l'implementazione di ogni feature.
- **Protezione configurazioni (.env)**: Non toccare né sovrascrivere mai i file `.env`.
- **Pianificazione esplicita**: Prima di modificare più di 5 file, presenta sempre un piano dettagliato per approvazione.
- **Retrocompatibilità**: Mantieni sempre la retrocompatibilità con le API esistenti.
- **Consultazione Preventiva Skills**: Prima di implementare nuove funzionalità, automazioni o architetture, verifica sempre se esiste una Skill pertinente (nella cartella Proton Drive: https://drive.proton.me/urls/XF6PZNAD84#yrottI5pvplQ o nel pool di skills) e applicane le linee guida.
