'use client';

import { useState } from 'react';
import { useExternalTests } from '@/hooks/useExternalTests';
import { TestCard } from './TestCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Globe, Search, RefreshCw, Server, Lock, Activity, Hash, ArrowUpRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ExportButton } from '../ExportButton';

const PRESET_DOMAINS = ['google.com', 'cloudflare.com', 'github.com', 'microsoft.com'];

export function ExternalTests() {
  const [target, setTarget] = useState('google.com');
  const { results, loading, runTest, runAll } = useExternalTests();

  const activeCount = Object.values(loading).filter(Boolean).length;
  const finishedCount = Object.values(results).filter(r => r !== null && r.status !== 'running').length;
  const totalTests = 6;
  const progress = (finishedCount / totalTests) * 100;

  return (
    <div className="space-y-6">
      {/* Target Search & Controls Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center justify-between pb-6 border-b border-zinc-800/80">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Globe className="w-5 h-5" />
            </div>
            External Network Diagnostics
          </h2>
          <p className="text-sm text-zinc-400">
            Analisi server-side profonda di risoluzione DNS, crittografia SSL, disponibilità porte e latenza.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative min-w-[260px] sm:min-w-[300px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Inserisci dominio o IPv4..."
              className="bg-zinc-900/90 border-zinc-700/70 pl-10 pr-4 py-5 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 rounded-xl shadow-inner"
            />
          </div>
          <div className="flex gap-2">
            <ExportButton externalResults={results} internalResults={{}} />
            <Button 
              onClick={() => runAll(target)} 
              disabled={activeCount > 0 || !target.trim()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-5 py-5 rounded-xl shadow-lg shadow-blue-600/25 border border-blue-400/20 transition-all"
            >
              {activeCount > 0 ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4 fill-current" />
              )}
              {activeCount > 0 ? 'Esecuzione...' : 'Esegui Tutti'}
            </Button>
          </div>
        </div>
      </div>

      {/* Target Quick Preset Chips */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
        <span className="font-semibold text-zinc-500">Preset rapidi:</span>
        {PRESET_DOMAINS.map((preset) => (
          <button
            key={preset}
            onClick={() => setTarget(preset)}
            className={`px-3 py-1 rounded-full border transition-all font-mono ${
              target === preset
                ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-sm'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      {activeCount > 0 && (
        <div className="space-y-2 p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 animate-in fade-in">
          <div className="flex justify-between text-xs text-blue-400 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Analisi diagnostica in corso su <span className="font-mono text-white">{target}</span>...
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-zinc-900" />
        </div>
      )}

      {/* Test Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <TestCard 
          title="DNS Lookup"
          description="Risoluzione record A, AAAA, MX, TXT"
          icon={Server}
          test={results.dns}
          loading={loading.dns}
          onRun={() => runTest('dns', target)}
        />
        <TestCard 
          title="Ping / Latenza"
          description="Tempo di risposta TCP socket 443/80"
          icon={Activity}
          test={results.ping}
          loading={loading.ping}
          onRun={() => runTest('ping', target)}
        />
        <TestCard 
          title="Port Scanner"
          description="Scansione porte critiche infrastruttura"
          icon={Hash}
          test={results.portscan}
          loading={loading.portscan}
          onRun={() => runTest('portscan', target)}
        />
        <TestCard 
          title="Certificato SSL / TLS"
          description="Validità crittografica, issuer e scadenza"
          icon={Lock}
          test={results.ssl}
          loading={loading.ssl}
          onRun={() => runTest('ssl', target)}
        />
        <TestCard 
          title="WHOIS & Domain"
          description="Dati registrar, name servers e scadenze"
          icon={Globe}
          test={results.whois}
          loading={loading.whois}
          onRun={() => runTest('whois', target)}
        />
        <TestCard 
          title="HTTP & Headers"
          description="Codice di stato HTTP e tempi di caricamento"
          icon={ArrowUpRight}
          test={results.http}
          loading={loading.http}
          onRun={() => runTest('http', target)}
        />
      </div>
    </div>
  );
}
