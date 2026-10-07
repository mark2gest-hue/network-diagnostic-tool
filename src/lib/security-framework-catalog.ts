export interface SecurityFrameworkMapping {
  cwe?: string;
  cweTitle?: string;
  mitreAttack?: string;
  mitreAttackTitle?: string;
  mitreDefend?: string;
  mitreDefendTitle?: string;
  nistCsf?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  executiveSummary: string;
  itRemediationTitle: string;
  remediationSnippet: string;
  remediationType: 'Nginx' | 'Apache' | 'Cloudflare / DNS' | 'Linux Firewall / UFW' | 'Email DNS';
}

export const SECURITY_FRAMEWORK_CATALOG: Record<string, SecurityFrameworkMapping> = {
  hsts_missing: {
    cwe: 'CWE-319',
    cweTitle: 'Cleartext Transmission of Sensitive Information',
    mitreAttack: 'T1557',
    mitreAttackTitle: 'Adversary-in-the-Middle',
    mitreDefend: 'D3-AHA',
    mitreDefendTitle: 'Application Hardening (Strict HTTPS)',
    nistCsf: 'PR.DS-2',
    severity: 'high',
    executiveSummary: 'Le connessioni al sito possono essere degradate a HTTP non cifrato da malintenzionati sulla stessa rete Wi-Fi.',
    itRemediationTitle: 'Forzatura HSTS con Preload (365 giorni)',
    remediationSnippet: `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;`,
    remediationType: 'Nginx',
  },
  csp_missing: {
    cwe: 'CWE-79',
    cweTitle: 'Improper Neutralization of Input (Cross-Site Scripting)',
    mitreAttack: 'T1059.007',
    mitreAttackTitle: 'JavaScript Execution in Browser',
    mitreDefend: 'D3-AHC',
    mitreDefendTitle: 'Content Security Restriction',
    nistCsf: 'PR.PT-1',
    severity: 'medium',
    executiveSummary: 'Il browser non blocca il caricamento di script non autorizzati o font/immagini da domini terzi sospetti.',
    itRemediationTitle: 'Configurazione Base Content-Security-Policy (CSP)',
    remediationSnippet: `add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https: data:; connect-src 'self' https:;" always;`,
    remediationType: 'Nginx',
  },
  x_frame_options_missing: {
    cwe: 'CWE-1021',
    cweTitle: 'Improper Restriction of Rendered UI Layers (Clickjacking)',
    mitreAttack: 'T1204.001',
    mitreAttackTitle: 'User Execution: Malicious Link',
    mitreDefend: 'D3-AHA',
    mitreDefendTitle: 'Framing Control & UI Hardening',
    nistCsf: 'PR.IP-1',
    severity: 'medium',
    executiveSummary: 'Pagine del sito potrebbero essere incorporate in iframe invisibili su siti terzi per ingannare i clic degli utenti (Clickjacking).',
    itRemediationTitle: 'Blocco incorporamento iframe non autorizzato',
    remediationSnippet: `add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;`,
    remediationType: 'Nginx',
  },
  dmarc_missing_or_none: {
    cwe: 'CWE-345',
    cweTitle: 'Insufficient Verification of Data Authenticity',
    mitreAttack: 'T1566.002',
    mitreAttackTitle: 'Spearphishing Link / Spoofing',
    mitreDefend: 'D3-MHA',
    mitreDefendTitle: 'Message Hardening & Sender Verification',
    nistCsf: 'PR.DS-6',
    severity: 'high',
    executiveSummary: 'Chiunque su Internet può inviare email spacciandosi per il vostro dominio aziendale senza che i destinatari le scartino.',
    itRemediationTitle: 'Record DMARC con Policy Quarantine',
    remediationSnippet: `_dmarc.dominio.com. IN TXT "v=DMARC1; p=quarantine; sp=quarantine; pct=100; rua=mailto:dmarc-reports@dominio.com; aspf=r;"`,
    remediationType: 'Email DNS',
  },
  spf_missing: {
    cwe: 'CWE-345',
    cweTitle: 'Insufficient Verification of Data Authenticity',
    mitreAttack: 'T1566',
    mitreAttackTitle: 'Phishing & Email Spoofing',
    mitreDefend: 'D3-MHA',
    mitreDefendTitle: 'Sender Policy Framework Validation',
    nistCsf: 'PR.DS-6',
    severity: 'high',
    executiveSummary: 'I server di posta internazionali non sanno quali indirizzi IP sono autorizzati a inviare le vostre email commerciali.',
    itRemediationTitle: 'Record SPF autoritativo',
    remediationSnippet: `dominio.com. IN TXT "v=spf1 include:_spf.google.com ~all"`,
    remediationType: 'Email DNS',
  },
  exposed_database_port: {
    cwe: 'CWE-200',
    cweTitle: 'Exposure of Sensitive Information to an Unauthorized Actor',
    mitreAttack: 'T1046',
    mitreAttackTitle: 'Network Service Discovery & Scanning',
    mitreDefend: 'D3-NTF',
    mitreDefendTitle: 'Network Traffic Filtering & Port Isolation',
    nistCsf: 'PR.AC-5',
    severity: 'critical',
    executiveSummary: 'Il database aziendale (porta 3306/5432) è visibile a chiunque su Internet ed esposto a tentativi continui di intrusione.',
    itRemediationTitle: 'Blocco porta DB su firewall UFW/iptables (solo localhost o VPN)',
    remediationSnippet: `sudo ufw deny 3306
sudo ufw deny 5432
# Consenti solo dall'IP della sede / backend:
# sudo ufw allow from <IP_BACKEND> to any port 3306`,
    remediationType: 'Linux Firewall / UFW',
  },
  exposed_rdp_smb: {
    cwe: 'CWE-284',
    cweTitle: 'Improper Access Control',
    mitreAttack: 'T1021.001',
    mitreAttackTitle: 'Remote Desktop Protocol / SMB Brute Force',
    mitreDefend: 'D3-NTF',
    mitreDefendTitle: 'Network Traffic Filtering',
    nistCsf: 'PR.AC-4',
    severity: 'critical',
    executiveSummary: 'Porte per Desktop Remoto (3389) o condivisione file (445) sono esposte pubblicamente: principale vettore di attacchi Ransomware.',
    itRemediationTitle: 'Isolamento immediato porte RDP / SMB',
    remediationSnippet: `sudo ufw deny 3389
sudo ufw deny 445`,
    remediationType: 'Linux Firewall / UFW',
  },
  sensitive_files_exposed: {
    cwe: 'CWE-538',
    cweTitle: 'Insertion of Sensitive Information into Externally-Accessible Directory',
    mitreAttack: 'T1552.001',
    mitreAttackTitle: 'Credentials in Files (.env, .git, config)',
    mitreDefend: 'D3-AHA',
    mitreDefendTitle: 'File Access Hardening & Location Deny',
    nistCsf: 'PR.DS-1',
    severity: 'critical',
    executiveSummary: 'File di configurazione contenenti password, token API o repository git sono scaricabili liberamente dal web.',
    itRemediationTitle: 'Blocco Nginx dei file nascosti e file .env/.git',
    remediationSnippet: `location ~ /\\.(env|git|svn|ht|DS_Store) {
    deny all;
    return 404;
}`,
    remediationType: 'Nginx',
  },
};
