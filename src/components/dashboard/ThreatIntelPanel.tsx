'use client';

import React, { useEffect, useState } from 'react';
import {
  Database,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Callout, StatusPill } from '@/components/ui/nd';

interface ThreatIntelStatus {
  synced: boolean;
  catalogVersion: string | null;
  dateReleased: string | null;
  totalKev: number;
  osvCachedCount: number;
  sourceUrl: string;
  lastSyncedAt: string | null;
  isStale: boolean;
}

interface StackItemInput {
  ecosystem: string;
  name: string;
  version: string;
}

interface VulnResult {
  id: string;
  cveId: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
  published: string | null;
  fixedVersion: string | null;
  url: string;
  inCisaKev: boolean;
  knownRansomware: boolean;
  kevDueDate: string | null;
  kevRequiredAction: string | null;
}

interface StackCheckResultItem {
  ecosystem: string;
  name: string;
  version: string;
  cached: boolean;
  vulnerabilities: VulnResult[];
  criticalCount: number;
  kevMatchesCount: number;
}

interface StackCheckResponse {
  status: 'ok' | 'warning' | 'fail';
  checkedCount: number;
  totalVulnerabilities: number;
  criticalCount: number;
  kevMatchesCount: number;
  osvOffline: boolean;
  catalogStatus: ThreatIntelStatus;
  results: StackCheckResultItem[];
}

const PRESET_STACK: StackItemInput[] = [
  { ecosystem: 'npm', name: 'next', version: '14.2.35' },
  { ecosystem: 'Ubuntu:24.04:LTS', name: 'nginx', version: '1.24.0-2ubuntu7.19' },
  { ecosystem: 'npm', name: 'n8n', version: '2.8.4' },
  { ecosystem: 'Ubuntu:24.04:LTS', name: 'openssl', version: '3.0.13-0ubuntu3.16' },
];

type SeverityFilter = 'all' | 'kev' | 'critical' | 'high';

export function ThreatIntelPanel() {
  const [status, setStatus] = useState<ThreatIntelStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [mode, setMode] = useState<'stack' | 'packageJson'>('stack');
  const [items, setItems] = useState<StackItemInput[]>(PRESET_STACK);
  const [pkgJsonText, setPkgJsonText] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<StackCheckResponse | null>(null);
  const [sevFilter, setSevFilter] = useState<SeverityFilter>('all');

  const loadStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/threat-intel/sync', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as ThreatIntelStatus;
        setStatus(data);
      }
    } catch {
      // Silenzioso su load iniziale
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/threat-intel/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setSyncError(data.error || 'Sincronizzazione non riuscita');
      } else {
        setStatus(data as ThreatIntelStatus);
      }
    } catch {
      setSyncError('Errore di rete durante la sincronizzazione CISA KEV');
    } finally {
      setSyncing(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const payload =
        mode === 'stack'
          ? { items: items.filter((i) => i.ecosystem.trim() && i.name.trim() && i.version.trim()) }
          : { packageJson: pkgJsonText };

      const res = await fetch('/api/threat-intel/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckError(data.error || 'Errore durante la verifica CVE');
      } else {
        const typed = data as StackCheckResponse;
        setCheckResult(typed);
        if (typed.catalogStatus) setStatus(typed.catalogStatus);
      }
    } catch {
      setCheckError('Errore di connessione verso il motore CVE / OSV.dev');
    } finally {
      setChecking(false);
    }
  };

  const updateRow = (idx: number, field: keyof StackItemInput, val: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));
  };

  const addRow = () => {
    setItems((prev) => [...prev, { ecosystem: 'npm', name: '', version: '' }]);
  };

  const removeRow = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const formatSyncTime = (iso: string | null) => {
    if (!iso) return 'Mai sincronizzato';
    try {
      return new Date(iso).toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const allVulns = checkResult
    ? checkResult.results.flatMap((r) =>
        r.vulnerabilities.map((v) => ({ ...v, pkgLabel: `${r.ecosystem}:${r.name}@${r.version}` }))
      )
    : [];

  const filteredVulns = allVulns.filter((v) => {
    if (sevFilter === 'kev') return v.inCisaKev;
    if (sevFilter === 'critical') return v.severity === 'critical';
    if (sevFilter === 'high') return v.severity === 'high';
    return true;
  });

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-5">
      {/* Intestazione DB Firme */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Database className="size-4 text-accent" aria-hidden="true" />
            <h2 className="text-[1.0625rem] font-bold text-foreground">
              Database Firme CVE &amp; CISA KEV (OSV.dev)
            </h2>
            {statusLoading ? (
              <StatusPill tone="pending">Verifica DB…</StatusPill>
            ) : status?.synced ? (
              <StatusPill tone={status.isStale ? 'warn' : 'ok'}>
                v{status.catalogVersion} · {status.totalKev} KEV attive
              </StatusPill>
            ) : (
              <StatusPill tone="warn">Non sincronizzato</StatusPill>
            )}
          </div>
          <p className="text-xs text-ink-2">
            Ultimo aggiornamento: <span className="font-mono">{formatSyncTime(status?.lastSyncedAt ?? null)}</span>
            {status?.osvCachedCount ? ` · Cache OSV: ${status.osvCachedCount} pacchetti` : ''}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="text-xs"
        >
          <RefreshCw className={`size-3.5 mr-2 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {syncing ? 'Sincronizzazione KEV…' : 'Aggiorna Firme'}
        </Button>
      </div>

      {syncError && (
        <Callout tone="crit" title="Errore sincronizzazione firme">
          {syncError}
        </Callout>
      )}

      {!statusLoading && status && !status.synced && (
        <Callout tone="warn" title="Catalogo CISA KEV non presente in locale">
          Premi &quot;Aggiorna Firme&quot; per scaricare le vulnerabilità attivamente sfruttate (CISA KEV) e abilitare il cross-check istantaneo.
        </Callout>
      )}

      {/* Tab Modalità Check Stack */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border bg-field p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode('stack')}
            className={`rounded px-3 py-1.5 font-semibold transition-colors ${
              mode === 'stack' ? 'bg-accent text-accent-foreground' : 'text-ink-2 hover:text-foreground'
            }`}
          >
            Stack / Pacchetti
          </button>
          <button
            type="button"
            onClick={() => setMode('packageJson')}
            className={`rounded px-3 py-1.5 font-semibold transition-colors ${
              mode === 'packageJson' ? 'bg-accent text-accent-foreground' : 'text-ink-2 hover:text-foreground'
            }`}
          >
            Incolla package.json
          </button>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'stack' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setItems(PRESET_STACK)}
              className="text-xs"
            >
              Carica Preset Stack
            </Button>
          )}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleCheck}
            disabled={checking || (mode === 'stack' ? items.length === 0 : !pkgJsonText.trim())}
            className="text-xs"
          >
            {checking ? (
              <RefreshCw className="size-3.5 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-3.5 mr-2" aria-hidden="true" />
            )}
            {checking ? 'Verifica OSV + KEV…' : 'Verifica CVE'}
          </Button>
        </div>
      </div>

      {/* Input Stack o package.json */}
      {mode === 'stack' ? (
        <div className="space-y-2">
          {items.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <Input
                value={row.ecosystem}
                onChange={(e) => updateRow(idx, 'ecosystem', e.target.value)}
                placeholder="npm / Ubuntu:24.04:LTS"
                className="sm:col-span-4 font-mono text-xs"
              />
              <Input
                value={row.name}
                onChange={(e) => updateRow(idx, 'name', e.target.value)}
                placeholder="Pacchetto (es. next, nginx)"
                className="sm:col-span-4 font-mono text-xs"
              />
              <Input
                value={row.version}
                onChange={(e) => updateRow(idx, 'version', e.target.value)}
                placeholder="Versione (es. 14.2.35)"
                className="sm:col-span-3 font-mono text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRow(idx)}
                aria-label="Rimuovi riga"
                className="sm:col-span-1 text-ink-3 hover:text-crit"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={items.length >= 50}
            className="text-xs"
          >
            <Plus className="size-3.5 mr-1" aria-hidden="true" />
            Aggiungi pacchetto
          </Button>
        </div>
      ) : (
        <textarea
          value={pkgJsonText}
          onChange={(e) => setPkgJsonText(e.target.value)}
          placeholder='Incolla qui il contenuto di package.json ({ "dependencies": { "next": "14.2.35" } })'
          rows={5}
          className="w-full rounded-md border border-field-border bg-field p-3 font-mono text-xs text-foreground outline-none focus-visible:outline-2 focus-visible:outline-accent"
        />
      )}

      {checkError && (
        <Callout tone="crit" title="Verifica CVE non riuscita">
          {checkError}
        </Callout>
      )}

      {/* Risultati */}
      {checkResult && (
        <div className="space-y-3 pt-2 border-t border-border">
          {checkResult.osvOffline && (
            <Callout tone="warn" title="OSV.dev momentaneamente non raggiungibile">
              Mostrati solo eventuali risultati già presenti nella cache locale.
            </Callout>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-foreground">
                Analizzati {checkResult.checkedCount} pacchetti:
              </span>
              <Badge variant="outline" className="font-mono text-[11px]">
                {checkResult.totalVulnerabilities} CVE/OSV totali
              </Badge>
              {checkResult.kevMatchesCount > 0 && (
                <Badge variant="outline" className="bg-crit-bg text-crit border-crit/30 font-mono text-[11px]">
                  {checkResult.kevMatchesCount} CISA KEV (Exploit Attivo)
                </Badge>
              )}
              {checkResult.criticalCount > 0 && (
                <Badge variant="outline" className="bg-warn-bg text-warn border-warn/30 font-mono text-[11px]">
                  {checkResult.criticalCount} Critical
                </Badge>
              )}
            </div>

            {allVulns.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {(['all', 'kev', 'critical', 'high'] as SeverityFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSevFilter(f)}
                    className={`rounded-full px-2.5 py-0.5 font-semibold border ${
                      sevFilter === f
                        ? 'bg-accent-bg text-accent border-accent/40'
                        : 'bg-field text-ink-2 border-border hover:bg-hover'
                    }`}
                  >
                    {f === 'all' ? 'Tutti' : f === 'kev' ? 'CISA KEV' : f.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {allVulns.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-field p-3 text-xs text-ok">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              Nessuna vulnerabilità nota trovata su OSV.dev / CISA KEV per le versioni specificate.
            </div>
          ) : filteredVulns.length === 0 ? (
            <p className="text-xs text-ink-3">Nessuna vulnerabilità corrisponde al filtro selezionato.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredVulns.map((v, idx) => (
                <div
                  key={`${v.pkgLabel}-${v.id}-${idx}`}
                  className="rounded-md border border-border bg-field p-3 space-y-1.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ShieldAlert
                        className={`size-4 shrink-0 ${
                          v.inCisaKev || v.severity === 'critical' ? 'text-crit' : 'text-warn'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="font-mono font-bold text-foreground">
                        {v.cveId || v.id}
                      </span>
                      <span className="font-mono text-[11px] text-ink-2">{v.pkgLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {v.inCisaKev && (
                        <Badge variant="outline" className="bg-crit-bg text-crit border-crit/40 text-[10px] font-bold">
                          CISA KEV{v.knownRansomware ? ' · RANSOMWARE' : ''}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] font-mono uppercase">
                        {v.severity}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-ink-2 leading-relaxed">{v.summary}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-3">
                    <span>
                      {v.kevRequiredAction
                        ? `Azione KEV: ${v.kevRequiredAction}`
                        : v.fixedVersion
                        ? `Fix disponibile da versione: ${v.fixedVersion}`
                        : 'Verifica bollettino ufficiale per aggiornamento.'}
                    </span>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:underline font-semibold"
                    >
                      OSV / NVD
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
