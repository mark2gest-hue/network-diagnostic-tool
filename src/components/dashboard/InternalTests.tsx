'use client';

import { useInternalTests } from '@/hooks/useInternalTests';
import { TestCard } from './TestCard';
import { Button } from '@/components/ui/button';
import { Play, Wifi, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ExportButton } from '../ExportButton';

export function InternalTests() {
  const { 
    results, 
    loading, 
    runPublicIp, 
    runLocalIp, 
    runDnsSpeed, 
    runLatency, 
    runWifi, 
    runPacketLoss, 
    runAll 
  } = useInternalTests();

  const activeCount = Object.values(loading).filter(Boolean).length;
  const finishedCount = Object.values(results).filter(r => r !== null).length;
  const totalTests = 6;
  const progress = (finishedCount / totalTests) * 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wifi className="text-emerald-500 w-5 h-5" />
            Internal / WiFi Tests
          </h2>
          <p className="text-sm text-zinc-500">Client-side diagnostics from your browser</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton externalResults={{}} internalResults={results} />
          <Button 
            onClick={runAll} 
            disabled={activeCount > 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-none min-w-[120px]"
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
          <div className="flex justify-between text-xs text-emerald-500 uppercase tracking-widest font-bold">
            <span>Esecuzione in corso...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-zinc-800" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TestCard 
          title="Public IP & ISP"
          description="Geolocalizzazione e dati provider"
          test={results.public_ip}
          loading={loading.public_ip}
          onRun={runPublicIp}
        />
        <TestCard 
          title="Local IP (WebRTC)"
          description="Indirizzo IP nella rete LAN"
          test={results.local_ip}
          loading={loading.local_ip}
          onRun={runLocalIp}
        />
        <TestCard 
          title="DNS Speed"
          description="Tempo di risoluzione dominio"
          test={results.dns_speed}
          loading={loading.dns_speed}
          onRun={runDnsSpeed}
        />
        <TestCard 
          title="Latency"
          description="Ping verso Cloudflare 1.1.1.1"
          test={results.latency}
          loading={loading.latency}
          onRun={runLatency}
        />
        <TestCard 
          title="WiFi Quality"
          description="Dati segnale e connessione"
          test={results.wifi}
          loading={loading.wifi}
          onRun={runWifi}
        />
        <TestCard 
          title="Packet Loss"
          description="Stima perdita pacchetti burst"
          test={results.packet_loss}
          loading={loading.packet_loss}
          onRun={runPacketLoss}
        />
      </div>
    </div>
  );
}
