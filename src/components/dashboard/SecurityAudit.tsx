'use client';

import { useState } from 'react';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { TestCard } from './TestCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Download, 
  Play, 
  Loader2, 
  Mail, 
  Key, 
  FileCheck, 
  Lock, 
  Terminal, 
  Globe2, 
  AlertOctagon, 
  FileCode,
  ShieldX
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const PRESET_DOMAINS = ['google.com', 'cloudflare.com', 'github.com', 'microsoft.com'];

export function SecurityAudit() {
  const [target, setTarget] = useState('google.com');
  const { results, loading, overallScore, runAll, generatePDF } = useSecurityAudit();
  
  const isRunning = Object.values(loading).some(l => l);
  const completedCount = Object.values(results).filter(r => r !== null && r.status !== 'idle' && r.status !== 'running').length;
  const progress = (completedCount / 10) * 100;

  const getScoreMeta = (score: number) => {
    if (score >= 80) return {
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/30 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]',
      label: 'Postura di Sicurezza Eccellente',
      desc: 'Il dominio rispetta la maggior parte dei moderni standard di hardening e sicurezza email.'
    };
    if (score >= 50) return {
      color: 'text-amber-400',
      bg: 'bg-amber-950/30 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)]',
      label: 'Attenzione Richiesta',
      desc: 'Rilevate configurazioni mancanti o vulnerabilità di media entità. Si raccomanda l\'aggiornamento.'
    };
    return {
      color: 'text-red-400',
      bg: 'bg-red-950/30 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]',
      label: 'Criticità Rilevate',
      desc: 'Esposizione a rischi elevati. Intervento raccomandato per proteggere email, porte e intestazioni.'
    };
  };

  return (
    <div className="space-y-6">
      {/* Header & Target Input */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center justify-between pb-6 border-b border-zinc-800/80">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Shield className="w-5 h-5" />
            </div>
            Security Posture & Compliance Audit
          </h2>
          <p className="text-sm text-zinc-400">
            Scansione automatica di header HTTP, reputazione email (SPF/DMARC/DKIM), porte aperte e takeover.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative min-w-[260px] sm:min-w-[300px]">
            <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="es. esempio.com" 
              className="bg-zinc-900/90 border-zinc-700/70 pl-10 pr-4 py-5 text-white font-mono text-sm focus:ring-2 focus:ring-purple-500 rounded-xl shadow-inner"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => runAll(target)} 
              disabled={!target.trim() || isRunning}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-5 py-5 rounded-xl shadow-lg shadow-purple-600/25 border border-purple-400/20 transition-all"
            >
              {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
              {isRunning ? 'Scansione...' : 'Avvia Audit'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => generatePDF(target)}
              disabled={overallScore === null}
              className="border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 py-5 rounded-xl transition-all"
            >
              <Download className="w-4 h-4 mr-2" />
              Esporta PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Preset Quick Chips */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
        <span className="font-semibold text-zinc-500">Preset rapidi:</span>
        {PRESET_DOMAINS.map((preset) => (
          <button
            key={preset}
            onClick={() => setTarget(preset)}
            className={`px-3 py-1 rounded-full border transition-all font-mono ${
              target === preset
                ? 'bg-purple-600/30 border-purple-500 text-purple-300 shadow-sm'
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Progress Indicator */}
      {isRunning && (
        <div className="space-y-2 p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 animate-in fade-in">
          <div className="flex justify-between text-xs text-purple-400 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Scansione di sicurezza in corso ({completedCount}/10 verifiche completate)...
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-zinc-900" />
        </div>
      )}

      {/* Modern Score Card */}
      {overallScore !== null && (
        <Card className={cn("rounded-2xl border transition-all duration-500 overflow-hidden", getScoreMeta(overallScore).bg)}>
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex items-baseline font-black font-mono">
                <span className={cn("text-6xl md:text-7xl tracking-tight", getScoreMeta(overallScore).color)}>
                  {overallScore}
                </span>
                <span className="text-xl text-zinc-500 ml-1">/100</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {overallScore >= 80 ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-amber-400" />
                  )}
                  <h3 className={cn("text-lg font-bold", getScoreMeta(overallScore).color)}>
                    {getScoreMeta(overallScore).label}
                  </h3>
                </div>
                <p className="text-sm text-zinc-400 max-w-xl">
                  {getScoreMeta(overallScore).desc}
                </p>
              </div>
            </div>

            <Button 
              onClick={() => generatePDF(target)}
              className="shrink-0 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl"
            >
              <Download className="w-4 h-4 mr-2" />
              Scarica Report Completo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grid of 10 Security Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <TestCard 
          test={results.spf} 
          loading={loading.spf} 
          onRun={() => runAll(target)} 
          title="Sender Policy Framework (SPF)" 
          description="Verifica autorizzazione IP di invio email"
          icon={Mail}
        />
        <TestCard 
          test={results.dkim} 
          loading={loading.dkim} 
          onRun={() => runAll(target)} 
          title="DKIM Signature Record" 
          description="Verifica chiavi crittografiche per autenticazione posta"
          icon={Key}
        />
        <TestCard 
          test={results.dmarc} 
          loading={loading.dmarc} 
          onRun={() => runAll(target)} 
          title="DMARC Policy Enforcement" 
          description="Verifica protezione anti-spoofing e policy email"
          icon={FileCheck}
        />
        <TestCard 
          test={results.dnssec} 
          loading={loading.dnssec} 
          onRun={() => runAll(target)} 
          title="DNSSEC Zone Validation" 
          description="Verifica firma e integrità crittografica della zona DNS"
          icon={Shield}
        />
        <TestCard 
          test={results.headers} 
          loading={loading.headers} 
          onRun={() => runAll(target)} 
          title="HTTP Security Headers" 
          description="Verifica protezione HSTS, CSP, X-Frame-Options e CORS"
          icon={FileCode}
        />
        <TestCard 
          test={results.tls} 
          loading={loading.tls} 
          onRun={() => runAll(target)} 
          title="TLS Cipher & Version Support" 
          description="Verifica supporto TLS 1.2 / TLS 1.3 e cifrari sicuri"
          icon={Lock}
        />
        <TestCard 
          test={results.ports} 
          loading={loading.ports} 
          onRun={() => runAll(target)} 
          title="Database & Admin Ports Exposure" 
          description="Verifica porte sensibili non protette da firewall (22, 3306, 5432)"
          icon={Terminal}
        />
        <TestCard 
          test={results.admin} 
          loading={loading.admin} 
          onRun={() => runAll(target)} 
          title="Admin Panel Exposure" 
          description="Controllo percorsi amministrativi noti (/admin, /wp-admin, ecc.)"
          icon={AlertOctagon}
        />
        <TestCard 
          test={results.subdomains} 
          loading={loading.subdomains} 
          onRun={() => runAll(target)} 
          title="Subdomain Takeover Risk" 
          description="Verifica CNAME pendenti verso servizi cloud dismessi"
          icon={Globe2}
        />
        <TestCard 
          test={results.blacklist} 
          loading={loading.blacklist} 
          onRun={() => runAll(target)} 
          title="RBL Email Server Blacklist" 
          description="Verifica reputazione dei server mail su blacklist globali"
          icon={ShieldX}
        />
      </div>
    </div>
  );
}
