'use client';

import React, { useState, useEffect } from 'react';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  Loader2, 
  Download
} from 'lucide-react';
import { RowList, ExpandableRow, StatusPill, BigScore } from '@/components/ui/nd';
import { ResultRenderer } from './ResultRenderer';

interface SecurityAuditProps {
  target?: string;
}

export function SecurityAudit({ target: initialTarget = 'aiutiamoci.cloud' }: SecurityAuditProps) {
  const [target, setTarget] = useState(initialTarget);
  const { results, loading, overallScore, runAll, generatePDF } = useSecurityAudit();

  React.useEffect(() => {
    if (initialTarget) {
      setTarget(initialTarget);
    }
  }, [initialTarget]);
  
  const isRunning = Object.values(loading).some(l => l);

  const getPill = (test: any, isLoading: boolean) => {
    if (isLoading) return <StatusPill tone="pending">In corso</StatusPill>;
    if (!test || test.status === 'idle') return <StatusPill tone="pending">In attesa</StatusPill>;
    const s = String(test.status).toLowerCase();
    if (['pass', 'success', 'ok'].includes(s)) return <StatusPill tone="ok">Superato</StatusPill>;
    if (['warn', 'warning', 'attention'].includes(s)) return <StatusPill tone="warn">Attenzione</StatusPill>;
    return <StatusPill tone="crit">Critico</StatusPill>;
  };

  return (
    <div className="space-y-6">
      {/* Header & Target Input */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-[1.625rem] font-bold leading-tight text-foreground">
            Audit di sicurezza
          </h1>
          <p className="mt-1 text-[0.9375rem] text-ink-2">
            12 controlli su posta, DNS, sito web ed esposizione. Restituisce un punteggio da 0 a 100.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input 
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="es. aiutiamoci.cloud" 
            className="w-60 font-mono text-xs"
          />
          <Button 
            variant="default"
            onClick={() => runAll(target)} 
            disabled={!target.trim() || isRunning}
            className="text-xs"
          >
            {isRunning ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Play className="size-4 mr-2 fill-current" />}
            {isRunning ? 'Scansione in corso...' : 'Avvia audit (12)'}
          </Button>
        </div>
      </div>

      {/* Box Punteggio Audit: stato iniziale con punteggio —/100 e PDF disabilitato */}
      <div className="rounded-lg border border-border bg-surface p-6 flex flex-wrap items-center justify-between gap-6">
        <div className="flex-1">
          <BigScore
            score={overallScore}
            verdict={
              overallScore === null
                ? `Nessun audit eseguito per ${target}. Il punteggio e le azioni consigliate appariranno al termine.`
                : overallScore >= 80
                ? 'Postura di sicurezza eccellente'
                : overallScore >= 50
                ? 'Attenzione richiesta su alcuni parametri'
                : 'Criticità rilevate'
            }
            tone={overallScore === null ? 'neutral' : overallScore >= 80 ? 'ok' : overallScore >= 50 ? 'warn' : 'crit'}
          />
        </div>

        <Button 
          variant="outline" 
          onClick={() => generatePDF(target)}
          disabled={overallScore === null}
          className="text-xs shrink-0"
        >
          <Download className="size-4 mr-2" />
          Esporta PDF
        </Button>
      </div>

      {/* Gruppo 1: Posta elettronica */}
      <div className="space-y-3">
        <h2 className="text-[1.0625rem] font-bold text-foreground">
          Posta elettronica <span className="text-xs font-normal text-ink-3">· 5 controlli</span>
        </h2>
        <RowList>
          <ExpandableRow
            status={getPill(results.spf, loading.spf)}
            title="SPF – Sender Policy Framework"
            summary="Verifica quali server possono inviare posta per il dominio."
            action={
              <Button variant="outline" size="sm" onClick={() => runAll(target)} disabled={isRunning} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.spf && <ResultRenderer testId="spf" result={results.spf.result} />}
          </ExpandableRow>

          <ExpandableRow
            status={getPill(results.dkim, loading.dkim)}
            title="DKIM – firma crittografica"
            summary="Verifica le chiavi che autenticano la posta in uscita."
            action={
              <Button variant="outline" size="sm" onClick={() => runAll(target)} disabled={isRunning} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.dkim && <ResultRenderer testId="dkim" result={results.dkim.result} />}
          </ExpandableRow>

          <ExpandableRow
            status={getPill(results.dmarc, loading.dmarc)}
            title="DMARC – applicazione della policy"
            summary="Verifica la protezione contro spoofing e phishing."
            action={
              <Button variant="outline" size="sm" onClick={() => runAll(target)} disabled={isRunning} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.dmarc && <ResultRenderer testId="dmarc" result={results.dmarc.result} />}
          </ExpandableRow>

          <ExpandableRow
            status={getPill(results.emailArmor, loading.emailArmor)}
            title="Email Armor e AXFR"
            summary="MTA-STS (RFC 8461), BIMI e protezione dal trasferimento di zona DNS."
            action={
              <Button variant="outline" size="sm" onClick={() => runAll(target)} disabled={isRunning} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.emailArmor && <ResultRenderer testId="emailArmor" result={results.emailArmor.result} />}
          </ExpandableRow>

          <ExpandableRow
            status={getPill(results.blacklist, loading.blacklist)}
            title="Blacklist server di posta (RBL)"
            summary="Verifica la reputazione dei server mail nelle blacklist globali."
            action={
              <Button variant="outline" size="sm" onClick={() => runAll(target)} disabled={isRunning} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.blacklist && <ResultRenderer testId="rbl" result={results.blacklist.result} />}
          </ExpandableRow>
        </RowList>
      </div>

      {/* Gruppo 2: DNS */}
      <div className="space-y-3">
        <h2 className="text-[1.0625rem] font-bold text-foreground">
          DNS <span className="text-xs font-normal text-ink-3">· 2 controlli</span>
        </h2>
        <RowList>
          <ExpandableRow
            status={getPill(results.dnssec, loading.dnssec)}
            title="DNSSEC – validazione della zona"
            summary="Verifica firma e integrità crittografica della zona DNS."
            action={
              <Button variant="outline" size="sm" onClick={() => runAll(target)} disabled={isRunning} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.dnssec && <ResultRenderer testId="dnssec" result={results.dnssec.result} />}
          </ExpandableRow>

          <ExpandableRow
            status={getPill(results.subdomains, loading.subdomains)}
            title="Rischio subdomain takeover"
            summary="Cerca CNAME che puntano a servizi cloud dismessi."
            action={
              <Button variant="outline" size="sm" onClick={() => runAll(target)} disabled={isRunning} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.subdomains && <ResultRenderer testId="subdomains" result={results.subdomains.result} />}
          </ExpandableRow>
        </RowList>
      </div>

      {/* Gruppo 3: Sito web */}
      <div className="space-y-3">
        <h2 className="text-[1.0625rem] font-bold text-foreground">
          Sito web <span className="text-xs font-normal text-ink-3">· 3 controlli</span>
        </h2>
        <RowList>
          <ExpandableRow
            status={getPill(results.headers, loading.headers)}
            title="HTTP security headers"
            summary="Verifica HSTS, CSP, X-Frame-Options e CORS."
            action={
              <Button variant="outline" size="sm" onClick={() => runAll(target)} disabled={isRunning} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.headers && <ResultRenderer testId="http" result={results.headers.result} />}
          </ExpandableRow>

          <ExpandableRow
            status={getPill(results.tls, loading.tls)}
            title="Versioni e cifrari TLS"
            summary="Verifica il supporto a TLS 1.2 / 1.3 e a cifrari sicuri."
            action={
              <Button variant="outline" size="sm" onClick={() => runAll(target)} disabled={isRunning} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.tls && <ResultRenderer testId="ssl" result={results.tls.result} />}
          </ExpandableRow>

          <ExpandableRow
            status={getPill(results.admin, loading.admin)}
            title="Pannelli di amministrazione esposti"
            summary="Controlla percorsi noti come /admin e /wp-admin."
            action={
              <Button variant="outline" size="sm" onClick={() => runAll(target)} disabled={isRunning} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.admin && <ResultRenderer testId="admin" result={results.admin.result} />}
          </ExpandableRow>
        </RowList>
      </div>

      {/* Gruppo 4: Esposizione e Data Leaks */}
      <div className="space-y-3">
        <h2 className="text-[1.0625rem] font-bold text-foreground">
          Esposizione e credenziali <span className="text-xs font-normal text-ink-3">· 2 controlli</span>
        </h2>
        <RowList>
          <ExpandableRow
            status={getPill(results.ports, loading.ports)}
            title="Esposizione porte database e remote"
            summary="Verifica porte sensibili non protette da firewall (22, 3306, 5432)."
            action={
              <Button variant="outline" size="sm" onClick={() => runAll(target)} disabled={isRunning} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.ports && <ResultRenderer testId="portscan" result={results.ports.result} />}
          </ExpandableRow>

          <ExpandableRow
            status={getPill(results.leaks, loading.leaks)}
            title="DeepWeb e leak credenziali"
            summary="Controllo breach aziendali e credenziali esposte in dump pubblici."
            action={
              <Button variant="outline" size="sm" onClick={() => runAll(target)} disabled={isRunning} className="text-xs">
                Esegui
              </Button>
            }
          >
            {results.leaks && <ResultRenderer testId="leaks" result={results.leaks.result} />}
          </ExpandableRow>
        </RowList>
      </div>
    </div>
  );
}
