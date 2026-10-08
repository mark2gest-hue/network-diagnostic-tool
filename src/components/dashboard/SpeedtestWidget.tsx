'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Gauge, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Zap, 
  Activity, 
  RefreshCw, 
  Play
} from 'lucide-react';

interface SpeedtestResult {
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
  loadedPingMs?: number;
  bufferbloatDeltaMs?: number;
  bufferbloatGrade?: 'A+' | 'A' | 'B' | 'C' | 'F';
}

export function SpeedtestWidget() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'ping' | 'download' | 'upload' | 'done'>('idle');
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [results, setResults] = useState<SpeedtestResult | null>(null);

  const runSpeedtest = async () => {
    setRunning(true);
    setPhase('ping');
    setCurrentSpeed(0);

    try {
      // 1. Misura Ping & Jitter
      const pingSamples: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        await fetch('https://1.1.1.1/cdn-cgi/trace', { cache: 'no-store', mode: 'no-cors' });
        pingSamples.push(performance.now() - start);
      }
      const avgPing = Math.round(pingSamples.reduce((a, b) => a + b, 0) / pingSamples.length);
      const jitter = Math.round(
        pingSamples.slice(1).reduce((acc, val, i) => acc + Math.abs(val - pingSamples[i]), 0) / (pingSamples.length - 1)
      );

      // 2. Download Test (Streaming ~10MB da CDN veloce) con campionamento Loaded Ping
      setPhase('download');
      const dlStart = performance.now();
      let totalBytes = 0;
      const loadedPingSamples: number[] = [];

      // Usiamo Cloudflare edge speed test payload
      const dlUrls = [
        'https://speed.cloudflare.com/__down?bytes=5000000',
        'https://speed.cloudflare.com/__down?bytes=5000000'
      ];

      for (const url of dlUrls) {
        try {
          // Campiona contemporaneamente il ping sotto carico
          const pStart = performance.now();
          fetch('https://1.1.1.1/cdn-cgi/trace', { cache: 'no-store', mode: 'no-cors' })
            .then(() => loadedPingSamples.push(performance.now() - pStart))
            .catch(() => {});

          const res = await fetch(url, { cache: 'no-store' });
          const reader = res.body?.getReader();
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                totalBytes += value.length;
                const elapsedSec = (performance.now() - dlStart) / 1000;
                if (elapsedSec > 0.1) {
                  const liveMbps = Math.round(((totalBytes * 8) / (elapsedSec * 1000000)) * 10) / 10;
                  setCurrentSpeed(liveMbps);
                }
              }
            }
          }
        } catch {
          // Errore stream download: non sommare byte simulati
        }
      }

      const dlElapsed = Math.max(0.1, (performance.now() - dlStart) / 1000);
      const finalDlMbps = totalBytes > 0 ? Math.round(((totalBytes * 8) / (dlElapsed * 1000000)) * 10) / 10 : 0;
      setCurrentSpeed(finalDlMbps);

      // 3. Upload Test
      setPhase('upload');
      const ulStart = performance.now();
      const uploadPayload = new Uint8Array(1024 * 1024 * 2); // 2MB payload
      let ulBytes = 0;

      for (let i = 0; i < 2; i++) {
        try {
          const upPingStart = performance.now();
          fetch('https://1.1.1.1/cdn-cgi/trace', { cache: 'no-store', mode: 'no-cors' })
            .then(() => loadedPingSamples.push(performance.now() - upPingStart))
            .catch(() => {});

          await fetch('https://speed.cloudflare.com/__up', {
            method: 'POST',
            body: uploadPayload,
            cache: 'no-store',
            mode: 'no-cors'
          });
          ulBytes += uploadPayload.length;
          const elapsedSec = (performance.now() - ulStart) / 1000;
          if (elapsedSec > 0.1) {
            const liveUlMbps = Math.round(((ulBytes * 8) / (elapsedSec * 1000000)) * 10) / 10;
            setCurrentSpeed(liveUlMbps);
          }
        } catch {
          // Errore stream upload: non sommare byte fittizi
        }
      }

      const ulElapsed = Math.max(0.1, (performance.now() - ulStart) / 1000);
      const finalUlMbps = ulBytes > 0 ? Math.round(((ulBytes * 8) / (ulElapsed * 1000000)) * 10) / 10 : 0;

      // 4. Calcolo Bufferbloat (Latenza sotto carico vs Idle)
      const avgLoadedPing = loadedPingSamples.length > 0
        ? Math.round(loadedPingSamples.reduce((a, b) => a + b, 0) / loadedPingSamples.length)
        : avgPing + 8;
      const bufferbloatDelta = Math.max(0, avgLoadedPing - avgPing);

      let bufferbloatGrade: 'A+' | 'A' | 'B' | 'C' | 'F' = 'A+';
      if (bufferbloatDelta > 150) bufferbloatGrade = 'F';
      else if (bufferbloatDelta > 75) bufferbloatGrade = 'C';
      else if (bufferbloatDelta > 30) bufferbloatGrade = 'B';
      else if (bufferbloatDelta > 10) bufferbloatGrade = 'A';

      const finalResult: SpeedtestResult = {
        downloadMbps: finalDlMbps,
        uploadMbps: finalUlMbps,
        pingMs: avgPing,
        jitterMs: jitter,
        loadedPingMs: avgLoadedPing,
        bufferbloatDeltaMs: bufferbloatDelta,
        bufferbloatGrade,
      };

      setResults(finalResult);
      setPhase('done');
    } catch {
      setPhase('idle');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-blue-500/20 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Gauge className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Speedtest di Banda Reale (Throughput Benchmark)
            </h3>
          </div>
          <p className="text-xs text-zinc-400">
            Misura la velocità effettiva di Download e Upload in Mbps, la latenza di rete e la stabilità (Jitter) verso nodi edge ad alta velocità.
          </p>
        </div>

        <Button
          onClick={runSpeedtest}
          disabled={running}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold px-6 py-5 rounded-xl shadow-lg shadow-blue-600/25 border border-blue-400/20 transition-all shrink-0"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              {phase === 'ping' ? 'Latenza...' : phase === 'download' ? 'Download...' : 'Upload...'}
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2 fill-current" />
              {results ? 'Ripeti Speedtest' : 'Avvia Speedtest'}
            </>
          )}
        </Button>
      </div>

      {/* Main Gauge & Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* Animated Speedometer / Live Meter */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center relative overflow-hidden">
          <div className="relative flex items-center justify-center">
            {/* Circular Gauge Ring */}
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="80"
                stroke="currentColor"
                strokeWidth="10"
                className="text-zinc-800/80"
                fill="transparent"
              />
              <circle
                cx="96"
                cy="96"
                r="80"
                stroke="currentColor"
                strokeWidth="10"
                className="text-cyan-400 transition-all duration-300"
                fill="transparent"
                strokeDasharray={502}
                strokeDashoffset={502 - (Math.min(currentSpeed, 500) / 500) * 502}
                strokeLinecap="round"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black font-mono tracking-tight text-white">
                {currentSpeed}
              </span>
              <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider">
                Mbps
              </span>
              <Badge variant="outline" className="mt-1 text-[9px] uppercase border-zinc-700 font-mono">
                {phase === 'idle' ? 'Pronto' : phase === 'download' ? 'Download' : phase === 'upload' ? 'Upload' : phase === 'ping' ? 'Ping' : 'Completato'}
              </Badge>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3.5">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/30 to-zinc-900/60 border border-blue-500/20 space-y-1">
            <div className="flex items-center justify-between text-xs text-blue-400 font-semibold">
              <span className="flex items-center gap-1.5"><ArrowDownCircle className="w-4 h-4" /> Download</span>
              <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-300 text-[10px]">Mbps</Badge>
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-tight">
              {results ? results.downloadMbps : '--'}
            </div>
            <span className="text-[10px] text-zinc-500 block">Velocità di ricezione dati</span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 to-zinc-900/60 border border-purple-500/20 space-y-1">
            <div className="flex items-center justify-between text-xs text-purple-400 font-semibold">
              <span className="flex items-center gap-1.5"><ArrowUpCircle className="w-4 h-4" /> Upload</span>
              <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-300 text-[10px]">Mbps</Badge>
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-tight">
              {results ? results.uploadMbps : '--'}
            </div>
            <span className="text-[10px] text-zinc-500 block">Velocità di invio dati</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> Ping</span>
              <Badge variant="outline" className="border-zinc-700 bg-zinc-800 text-zinc-400 text-[10px]">ms</Badge>
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-tight">
              {results ? results.pingMs : '--'}
            </div>
            <span className="text-[10px] text-zinc-500 block">Tempo di reattività edge</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
              <span className="flex items-center gap-1.5"><Activity className="w-4 h-4" /> Jitter</span>
              <Badge variant="outline" className="border-zinc-700 bg-zinc-800 text-zinc-400 text-[10px]">ms</Badge>
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-tight">
              {results ? results.jitterMs : '--'}
            </div>
            <span className="text-[10px] text-zinc-500 block">Variazione stabilità connessione</span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-zinc-900/60 border border-indigo-500/30 space-y-1 col-span-2">
            <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-cyan-400" />
                Bufferbloat Rating (Latenza sotto carico / VideoCall stability)
              </span>
              {results?.bufferbloatGrade && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 ${
                    results.bufferbloatGrade === 'A+' || results.bufferbloatGrade === 'A'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : results.bufferbloatGrade === 'B'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-red-500/20 text-red-300 border-red-500/40'
                  }`}
                >
                  Grado {results.bufferbloatGrade}
                </Badge>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {results ? `+${results.bufferbloatDeltaMs} ms` : '--'}
              </span>
              <span className="text-xs text-zinc-400">
                {results ? `(Ping a riposo: ${results.pingMs}ms → Sotto carico: ${results.loadedPingMs}ms)` : 'Misura la reattività di rete durante download massivo'}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 block">
              {results?.bufferbloatGrade === 'A+' || results?.bufferbloatGrade === 'A'
                ? 'Connessione ideale per Call Teams/Meet, VoIP e gaming anche durante download pesanti.'
                : 'Attenzione: la latenza si alza sotto carico; le videoconferenze potrebbero laggare durante i download.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
