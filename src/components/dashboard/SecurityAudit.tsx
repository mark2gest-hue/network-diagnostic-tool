'use client';

import { useState } from 'react';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { TestCard } from './TestCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, ShieldAlert, ShieldCheck, Download, Play, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function SecurityAudit() {
  const [target, setTarget] = useState('');
  const { results, loading, overallScore, runAll, generatePDF } = useSecurityAudit();
  
  const isRunning = Object.values(loading).some(l => l);
  const completedCount = Object.values(results).filter(r => r !== null && r.status !== 'idle' && r.status !== 'running').length;
  const progress = (completedCount / 10) * 100;

  const getScoreColor = (score: number) => {
    if (score >= 71) return 'text-green-500 border-green-500/20 bg-green-500/10';
    if (score >= 41) return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10';
    return 'text-red-500 border-red-500/20 bg-red-500/10';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-end mb-8">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium text-zinc-400 ml-1">Dominio da Analizzare</label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="esempio.com" 
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            onClick={() => runAll(target)} 
            disabled={!target || isRunning}
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Avvia Audit Sicurezza
          </Button>
          <Button 
            variant="outline" 
            onClick={() => generatePDF(target)}
            disabled={!overallScore}
            className="border-zinc-800 bg-zinc-900"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {isRunning && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between text-xs text-zinc-500 px-1">
            <span>Analisi in corso...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1 bg-zinc-800" />
        </div>
      )}

      {overallScore !== null && (
        <Card className={cn("border transition-all duration-500", getScoreColor(overallScore))}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              {overallScore >= 71 ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              Security Score Card
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tracking-tighter">{overallScore}</span>
              <span className="text-xl opacity-70">/ 100</span>
            </div>
            <p className="mt-2 text-sm opacity-80">
              {overallScore >= 71 
                ? "Il tuo dominio ha una buona postura di sicurezza." 
                : overallScore >= 41 
                ? "Rilevate vulnerabilità di media entità. Richiesta attenzione." 
                : "Rilevate criticità gravi! Intervento immediato raccomandato."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TestCard 
          test={results.spf} 
          loading={loading.spf} 
          onRun={() => runAll(target)} 
          title="SPF Check" 
          description="Verifica record Sender Policy Framework"
        />
        <TestCard 
          test={results.dkim} 
          loading={loading.dkim} 
          onRun={() => runAll(target)} 
          title="DKIM Check" 
          description="Verifica firme DomainKeys Identified Mail"
        />
        <TestCard 
          test={results.dmarc} 
          loading={loading.dmarc} 
          onRun={() => runAll(target)} 
          title="DMARC Check" 
          description="Verifica policy di autenticazione email"
        />
        <TestCard 
          test={results.dnssec} 
          loading={loading.dnssec} 
          onRun={() => runAll(target)} 
          title="DNSSEC Check" 
          description="Verifica integrità zona DNS"
        />
        <TestCard 
          test={results.headers} 
          loading={loading.headers} 
          onRun={() => runAll(target)} 
          title="Security Headers" 
          description="Verifica header HTTP (HSTS, CSP, XFO, etc.)"
        />
        <TestCard 
          test={results.tls} 
          loading={loading.tls} 
          onRun={() => runAll(target)} 
          title="TLS Version Check" 
          description="Verifica versioni protocollo supportate"
        />
        <TestCard 
          test={results.ports} 
          loading={loading.ports} 
          onRun={() => runAll(target)} 
          title="Open Ports Risk" 
          description="Verifica esposizione porte database e admin"
        />
        <TestCard 
          test={results.admin} 
          loading={loading.admin} 
          onRun={() => runAll(target)} 
          title="Admin Panels" 
          description="Ricerca percorsi amministrativi esposti"
        />
        <TestCard 
          test={results.subdomains} 
          loading={loading.subdomains} 
          onRun={() => runAll(target)} 
          title="Subdomain Takeover" 
          description="Controllo CNAME vs cloud services"
        />
        <TestCard 
          test={results.blacklist} 
          loading={loading.blacklist} 
          onRun={() => runAll(target)} 
          title="Email Blacklist" 
          description="Verifica IP server MX su RBL"
        />
      </div>
    </div>
  );
}
