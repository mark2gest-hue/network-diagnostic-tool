'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Bot,
  Cpu,
  Lock,
  Copy,
  Check,
  RefreshCw,
  FileCode,
  Globe,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import type { BotAiAuditResult } from '@/lib/bot-ai-defense-engine';

interface BotAiDefenseModuleProps {
  initialTarget?: string;
  isDirectionView?: boolean;
}

export const BotAiDefenseModule: React.FC<BotAiDefenseModuleProps> = ({
  initialTarget = '',
  isDirectionView = false,
}) => {
  const [target, setTarget] = useState(initialTarget);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BotAiAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'audit' | 'rules'>('audit');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const runAudit = async () => {
    if (!target.trim()) {
      setError('Inserisci un dominio valido da analizzare');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/defense/bot-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore durante l\'esecuzione dell\'audit');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Errore di connessione o scansione fallita');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 text-neutral-100 shadow-2xl transition-all">
      {/* Header Modulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-neutral-800/80 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white">Bot & AI Defense Shield</h2>
              <span className="text-[10px] font-mono uppercase bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
                Modulo Autonomo
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Audit passivo empirico e generatore configurazioni WAF / Rate-limit contro AI scraper e botnet.
            </p>
          </div>
        </div>

        {/* Form target rapido */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="es. aziendacliente.it"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runAudit()}
            className="px-3 py-1.5 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono w-48 sm:w-60"
          />
          <button
            onClick={runAudit}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow"
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {loading ? 'Scansione...' : 'Verifica Difesa'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Risultato Audit */}
      {result && (
        <div className="mt-6 space-y-6">
          {/* Barra Score & Indicatori Chiave */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                Postura Difensiva Bot & AI
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className={`text-3xl font-extrabold ${
                    result.postureScore >= 75
                      ? 'text-emerald-400'
                      : result.postureScore >= 50
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {result.postureScore}/100
                </span>
                <span className="text-xs text-neutral-400">
                  {result.postureScore >= 75 ? 'Robusta' : result.postureScore >= 50 ? 'Media' : 'Critica'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                WAF / Cloud Shield
              </span>
              <div className="flex items-center gap-2 mt-2">
                {result.wafDetected ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/50">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {result.wafProvider || 'WAF Rilevato'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-800/50">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Nessun WAF Esterno
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                Crawler AI Bloccati
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-white">
                  {result.robotsTxt.crawlerChecks.filter((c) => c.isBlockedByRobotsTxt).length}
                </span>
                <span className="text-xs text-neutral-400">
                  su {result.robotsTxt.crawlerChecks.length} monitorati
                </span>
              </div>
            </div>
          </div>

          {/* Toggle Vista Tab */}
          <div className="flex border-b border-neutral-800">
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'audit'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              Verifica Empirica Crawler & Headers
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === 'rules'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              Generatore Regole WAF & Nginx
            </button>
          </div>

          {/* TAB 1: VERIFICA EMPIRICA */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-neutral-800 overflow-hidden">
                <div className="bg-neutral-900/80 px-4 py-2.5 border-b border-neutral-800 flex justify-between items-center">
                  <span className="text-xs font-semibold text-neutral-300">
                    Matrice di Rilevamento Crawler AI (MITRE ATLAS AML.T0053)
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400">
                    Fonte: {result.robotsTxt.url}
                  </span>
                </div>
                <div className="divide-y divide-neutral-800/60 max-h-72 overflow-y-auto">
                  {result.robotsTxt.crawlerChecks.map((crawler) => (
                    <div
                      key={crawler.userAgentToken}
                      className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-neutral-900/40"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{crawler.crawlerName}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          User-Agent: {crawler.userAgentToken} • {crawler.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-neutral-500 hidden sm:inline">
                          {crawler.mitreAtlasTag}
                        </span>
                        {crawler.isBlockedByRobotsTxt ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/40">
                            <Check className="h-3 w-3" /> Bloccato
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-red-400 bg-red-950/30 px-2 py-0.5 rounded border border-red-800/40">
                            <AlertTriangle className="h-3 w-3" /> Esposto
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raccomandazioni Sintetiche */}
              {result.recommendations.length > 0 && (
                <div className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-800">
                  <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                    Azioni di Hardening Consigliate
                  </h4>
                  <ul className="space-y-1.5 text-xs text-neutral-300 list-disc list-inside">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GENERATORE REGOLE HARDENING */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              {/* Cloudflare WAF */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Cloudflare WAF Custom Rule (Expression Editor)
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(result.hardeningSnippets.cloudflareWafRule, 'cf')
                    }
                    className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white bg-neutral-800 px-2 py-1 rounded border border-neutral-700 transition"
                  >
                    {copiedKey === 'cf' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedKey === 'cf' ? 'Copiato' : 'Copia Regola'}
                  </button>
                </div>
                <pre className="p-3 rounded bg-black/60 border border-neutral-800 text-[11px] font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                  {result.hardeningSnippets.cloudflareWafRule}
                </pre>
              </div>

              {/* Nginx + Rate Limit */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-sky-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Nginx Reverse Proxy & Rate Limiting Config
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(result.hardeningSnippets.nginxRateLimitSnippet, 'nginx')
                    }
                    className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white bg-neutral-800 px-2 py-1 rounded border border-neutral-700 transition"
                  >
                    {copiedKey === 'nginx' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedKey === 'nginx' ? 'Copiato' : 'Copia Config'}
                  </button>
                </div>
                <pre className="p-3 rounded bg-black/60 border border-neutral-800 text-[11px] font-mono text-sky-300 overflow-x-auto whitespace-pre-wrap">
                  {result.hardeningSnippets.nginxRateLimitSnippet}
                </pre>
              </div>

              {/* Defensive Robots.txt */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      robots.txt Hardening Standard (OWASP / MITRE ATLAS)
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(result.hardeningSnippets.defensiveRobotsTxt, 'robots')
                    }
                    className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white bg-neutral-800 px-2 py-1 rounded border border-neutral-700 transition"
                  >
                    {copiedKey === 'robots' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedKey === 'robots' ? 'Copiato' : 'Copia robots.txt'}
                  </button>
                </div>
                <pre className="p-3 rounded bg-black/60 border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto whitespace-pre-wrap max-h-56">
                  {result.hardeningSnippets.defensiveRobotsTxt}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
