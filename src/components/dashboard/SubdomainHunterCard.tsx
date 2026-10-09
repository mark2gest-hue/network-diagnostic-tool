'use client';

import React, { useState } from 'react';
import {
  Globe,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertTriangle,
  Server,
  Copy,
  Check,
  Layers,
} from 'lucide-react';

export interface SubdomainItem {
  subdomain: string;
  resolvedIps: string[];
  cname?: string;
  isTakeoverVulnerable: boolean;
  takeoverFingerprint?: string;
  status: 'active' | 'unresolved' | 'vulnerable';
}

export interface SubdomainHunterData {
  target: string;
  totalDiscovered: number;
  activeCount: number;
  vulnerableCount: number;
  subdomains: SubdomainItem[];
  mitreDefense?: {
    id: string;
    technique: string;
    nistCsf: string;
  };
  timestamp: number;
}

interface SubdomainHunterCardProps {
  target: string;
  perspectiveMode?: 'executive' | 'it-pro';
}

export function SubdomainHunterCard({ target, perspectiveMode = 'executive' }: SubdomainHunterCardProps) {
  const [data, setData] = useState<SubdomainHunterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHost, setCopiedHost] = useState<string | null>(null);
  const [filterVulnerableOnly, setFilterVulnerableOnly] = useState(false);

  const runRecon = async () => {
    if (!target) return;
    setLoading(true);
    setError(null);

    try {
      const clean = target.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      const res = await fetch(`/api/tests/subdomains?domain=${encodeURIComponent(clean)}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Impossibile completare la scansione passiva');
      } else {
        setData(json);
      }
    } catch {
      setError('Errore di connessione con il motore di telemetria passiva');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHost(text);
    setTimeout(() => setCopiedHost(null), 2000);
  };

  const displayedList = data?.subdomains.filter((item) => {
    if (filterVulnerableOnly) {
      return item.isTakeoverVulnerable || item.status === 'vulnerable';
    }
    return true;
  }) || [];

  return (
    <div className="bg-[#0b101c] border border-[#1d2b42] rounded-md p-4 space-y-4 shadow-xl">
      {/* Header HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#172236] pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              Subdomain Hunter & Surface Recon (CT Logs)
              <span className="text-[10px] bg-[#0284c7]/20 text-[#38bdf8] border border-[#0369a1] px-1.5 py-0.2 rounded font-mono font-normal">
                PASSIVO 100%
              </span>
            </h3>
          </div>
          <p className="text-[11px] text-[#94a3b8]">
            Analisi passiva dei log Certificate Transparency (crt.sh) e individuazione orfani CNAME Subdomain Takeover.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runRecon}
            disabled={loading}
            className="bg-[#00f0ff] hover:bg-[#38bdf8] text-black font-bold text-xs px-3.5 py-1.5 rounded flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.3)] whitespace-nowrap"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>{loading ? 'ANALISI CT LOG...' : 'AVVIA RECON'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-[#450a0a]/70 border border-[#b91c1c] p-2.5 rounded text-xs text-[#fca5a5] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Telemetry Stat Badges */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-[#070a12] border border-[#182338] p-2.5 rounded">
            <span className="text-[10px] text-[#64748b] block font-bold uppercase">Sottodomini Rilevati</span>
            <span className="text-base font-bold text-white font-mono">{data.totalDiscovered}</span>
          </div>

          <div className="bg-[#070a12] border border-[#182338] p-2.5 rounded">
            <span className="text-[10px] text-[#64748b] block font-bold uppercase">Host DNS Attivi</span>
            <span className="text-base font-bold text-[#10b981] font-mono">{data.activeCount}</span>
          </div>

          <div className="bg-[#070a12] border border-[#182338] p-2.5 rounded">
            <span className="text-[10px] text-[#64748b] block font-bold uppercase">Rischio Takeover CNAME</span>
            <span
              className={`text-base font-bold font-mono ${
                data.vulnerableCount > 0 ? 'text-[#ef4444]' : 'text-[#38bdf8]'
              }`}
            >
              {data.vulnerableCount > 0 ? `${data.vulnerableCount} CRITICO` : '0 (Sicuro)'}
            </span>
          </div>

          <div className="bg-[#070a12] border border-[#182338] p-2.5 rounded">
            <span className="text-[10px] text-[#64748b] block font-bold uppercase">Standard Difensivo</span>
            <span className="text-xs font-bold text-[#c084fc] font-mono">
              {data.mitreDefense?.id || 'D3-DNSA'}
            </span>
          </div>
        </div>
      )}

      {/* Perspective Info Banner */}
      {data && (
        <div
          className={`p-3 rounded border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
            perspectiveMode === 'executive'
              ? 'bg-[#06241b] border-[#047857] text-[#a7f3d0]'
              : 'bg-[#0f172a] border-[#1e3a8a] text-[#93c5fd]'
          }`}
        >
          <div className="flex items-center gap-2">
            {perspectiveMode === 'executive' ? (
              <ShieldCheck className="w-4 h-4 text-[#34d399] shrink-0" />
            ) : (
              <Server className="w-4 h-4 text-[#60a5fa] shrink-0" />
            )}
            <span>
              {perspectiveMode === 'executive'
                ? 'Valutazione Direzione: Mappatura del perimetro pubblico senza attività invasive o rischi legali. Nessun blocco IP del cliente.'
                : 'SOC View: Ispezione record A/CNAME orfani con matching su firme AWS S3, GitHub Pages, Heroku, Azure e Zendesk.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterVulnerableOnly((prev) => !prev)}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                filterVulnerableOnly
                  ? 'bg-[#ef4444] text-white border-[#b91c1c]'
                  : 'bg-[#1e293b] text-[#cbd5e1] border-[#334155] hover:text-white'
              }`}
            >
              {filterVulnerableOnly ? 'Mostra Tutti' : 'Solo Vulnerabili'}
            </button>
          </div>
        </div>
      )}

      {/* Discovered Subdomains List */}
      {data && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#64748b] px-1 font-mono">
            <span>FQDN / RECORD ESTERNO</span>
            <span>INDIRIZZI IP / CNAME</span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
            {displayedList.length === 0 ? (
              <div className="text-center py-6 text-[#64748b] bg-[#070a12] border border-[#182338] rounded">
                Nessun sottodominio corrisponde al filtro attivo.
              </div>
            ) : (
              displayedList.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    item.isTakeoverVulnerable
                      ? 'bg-[#450a0a]/40 border-[#b91c1c] text-white'
                      : item.status === 'active'
                      ? 'bg-[#070a12] border-[#182338] hover:border-[#2b3c5a]'
                      : 'bg-[#080d17]/50 border-[#141d2e] opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        item.isTakeoverVulnerable
                          ? 'bg-[#ef4444] animate-ping'
                          : item.status === 'active'
                          ? 'bg-[#10b981]'
                          : 'bg-[#64748b]'
                      }`}
                    />
                    <span className="font-bold text-white truncate">{item.subdomain}</span>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.subdomain)}
                      className="text-[#64748b] hover:text-[#00f0ff] p-0.5 transition-colors cursor-pointer"
                      title="Copia FQDN"
                    >
                      {copiedHost === item.subdomain ? (
                        <Check className="w-3 h-3 text-[#10b981]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {item.cname && (
                      <span className="bg-[#1e1b4b] text-[#a5b4fc] border border-[#312e81] px-1.5 py-0.5 rounded">
                        CNAME: {item.cname}
                      </span>
                    )}

                    {item.resolvedIps.length > 0 ? (
                      item.resolvedIps.map((ip, i) => (
                        <span key={i} className="bg-[#0f172a] text-[#38bdf8] border border-[#1e293b] px-1.5 py-0.5 rounded">
                          {ip}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#64748b] text-[10px]">Nessun IP A</span>
                    )}

                    {item.isTakeoverVulnerable && (
                      <span className="bg-[#ef4444] text-white font-bold px-2 py-0.5 rounded text-[10px] animate-pulse">
                        TAKEOVER POSSIBILE: {item.takeoverFingerprint}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Initial Empty State */}
      {!data && !loading && !error && (
        <div className="text-center py-8 text-[#64748b] bg-[#070a12]/60 border border-dashed border-[#182338] rounded space-y-2">
          <Globe className="w-8 h-8 mx-auto text-[#2b3c5a]" />
          <p className="text-xs text-[#94a3b8]">Nessuna ricognizione effettuata per {target}.</p>
          <p className="text-[10px] text-[#64748b]">
            Premi &quot;AVVIA RECON&quot; per interrogare passivamente i registri pubblici di Certificate Transparency.
          </p>
        </div>
      )}
    </div>
  );
}
