'use client';

import { useState } from 'react';
import { useExternalTests } from '@/hooks/useExternalTests';
import { TestCard } from './TestCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Globe, Search, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ExportButton } from '../ExportButton';

export function ExternalTests() {
  const [target, setTarget] = useState('google.com');
  const { results, loading, runTest, runAll } = useExternalTests();

  const activeCount = Object.values(loading).filter(Boolean).length;
  const finishedCount = Object.values(results).filter(r => r !== null && r.status !== 'running').length;
  const totalTests = 6;
  const progress = (finishedCount / totalTests) * 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="text-blue-500 w-5 h-5" />
            External Network Tests
          </h2>
          <p className="text-sm text-zinc-500">Server-side diagnostics for DNS, SSL, and connectivity</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Dominio o IP"
              className="bg-zinc-900 border-zinc-800 pl-10 text-white focus:ring-blue-500"
            />
          </div>
          <ExportButton externalResults={results} internalResults={{}} />
          <Button 
            onClick={() => runAll(target)} 
            disabled={activeCount > 0}
            className="bg-blue-600 hover:bg-blue-700 text-white border-none min-w-[120px]"
          >
            {activeCount > 0 ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run All
          </Button>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-400 uppercase tracking-widest font-bold">
            <span>Esecuzione in corso...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-zinc-800" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TestCard 
          title="DNS Lookup"
          description="Risoluzione record A, AAAA, MX, TXT"
          test={results.dns}
          loading={loading.dns}
          onRun={() => runTest('dns', target)}
        />
        <TestCard 
          title="WHOIS Info"
          description="Dati registrar e scadenza dominio"
          test={results.whois}
          loading={loading.whois}
          onRun={() => runTest('whois', target)}
        />
        <TestCard 
          title="Ping / Latency"
          description="Latenza TCP (fall-back ICMP)"
          test={results.ping}
          loading={loading.ping}
          onRun={() => runTest('ping', target)}
        />
        <TestCard 
          title="Port Scan"
          description="Controllo porte infrastruttura comuni"
          test={results.portscan}
          loading={loading.portscan}
          onRun={() => runTest('portscan', target)}
        />
        <TestCard 
          title="SSL Certificate"
          description="Validità, scadenza e catena trust"
          test={results.ssl}
          loading={loading.ssl}
          onRun={() => runTest('ssl', target)}
        />
        <TestCard 
          title="HTTP Status"
          description="Codice stato e catena redirect"
          test={results.http}
          loading={loading.http}
          onRun={() => runTest('http', target)}
        />
      </div>
    </div>
  );
}
