'use client';

import { useInternalTests } from '@/hooks/useInternalTests';
import { TestCard } from './TestCard';
import { LanScanner } from './LanScanner';
import { SpeedtestWidget } from './SpeedtestWidget';
import { Button } from '@/components/ui/button';
import { Play, Wifi, RefreshCw, Globe, Network, Zap, Activity, Radio } from 'lucide-react';
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
  const finishedCount = Object.values(results).filter(r => r !== null && r.status !== 'running').length;
  const totalTests = 6;
  const progress = (finishedCount / totalTests) * 100;

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between pb-6 border-b border-zinc-800/80">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <Wifi className="w-5 h-5" />
            </div>
            Internal Client Diagnostics & Speedtest
          </h2>
          <p className="text-sm text-zinc-400">
            Diagnostica in tempo reale eseguita direttamente dal tuo browser verso la rete locale e i nodi edge.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton externalResults={{}} internalResults={results} />
          <Button 
            onClick={runAll} 
            disabled={activeCount > 0}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold px-5 py-5 rounded-xl shadow-lg shadow-emerald-600/25 border border-emerald-400/20 transition-all min-w-[140px]"
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

      {/* Speedtest Live Gauge Widget */}
      <SpeedtestWidget />

      {/* Progress Bar */}
      {activeCount > 0 && (
        <div className="space-y-2 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 animate-in fade-in">
          <div className="flex justify-between text-xs text-emerald-400 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Esecuzione test client in corso...
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-zinc-900" />
        </div>
      )}

      {/* Test Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <TestCard 
          title="IP Pubblico & ISP"
          description="Geolocalizzazione, ASN e dati provider"
          icon={Globe}
          test={results.public_ip}
          loading={loading.public_ip}
          onRun={runPublicIp}
        />
        <TestCard 
          title="IP Locale (WebRTC)"
          description="Indirizzo IP privato nella rete LAN locale"
          icon={Network}
          test={results.local_ip}
          loading={loading.local_ip}
          onRun={runLocalIp}
        />
        <TestCard 
          title="Velocità Risoluzione DNS"
          description="Tempo di fetch benchmark verso edge CDN"
          icon={Zap}
          test={results.dns_speed}
          loading={loading.dns_speed}
          onRun={runDnsSpeed}
        />
        <TestCard 
          title="Latenza Cloudflare"
          description="Ping HTTP verso Cloudflare 1.1.1.1"
          icon={Activity}
          test={results.latency}
          loading={loading.latency}
          onRun={runLatency}
        />
        <TestCard 
          title="Qualità Connessione & RTT"
          description="Stima banda downlink e latenza di rete"
          icon={Wifi}
          test={results.wifi}
          loading={loading.wifi}
          onRun={runWifi}
        />
        <TestCard 
          title="Perdita Pacchetti (Burst)"
          description="Stima perdita pacchetti su 10 richieste sequenziali"
          icon={Radio}
          test={results.packet_loss}
          loading={loading.packet_loss}
          onRun={runPacketLoss}
        />
      </div>

      {/* Embedded Live WiFi & LAN Subnet Scanner */}
      <div className="pt-4 border-t border-zinc-800/80">
        <LanScanner />
      </div>
    </div>
  );
}
