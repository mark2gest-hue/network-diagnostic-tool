'use client';

import React, { useEffect, useState } from 'react';
import { RiskAssessment } from '@/types/findings';
import { SecurityCourtVerdict, JudgeOpinion } from '@/lib/tribunal-engine';
import { 
  Scale, 
  Flame, 
  ShieldCheck, 
  Briefcase, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Sparkles,
  Lock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/nd';

interface SecurityTribunalCardProps {
  target: string;
  assessment: RiskAssessment | null;
  rawResults?: Record<string, any>;
}

export function SecurityTribunalCard({ target, assessment, rawResults }: SecurityTribunalCardProps) {
  const [verdict, setVerdict] = useState<SecurityCourtVerdict | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'red_team' | 'blue_team' | 'business_risk'>('red_team');

  useEffect(() => {
    if (!target) return;

    let isMounted = true;
    async function loadVerdict() {
      setLoading(true);
      try {
        const res = await fetch('/api/security/tribunal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target,
            assessment,
            rawResults,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.verdict) {
            setVerdict(data.verdict);
          }
        }
      } catch (err) {
        console.error('Tribunal fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadVerdict();
    return () => {
      isMounted = false;
    };
  }, [target, assessment, rawResults]);

  if (!verdict && !loading) return null;

  const toneToPill = (tone: JudgeOpinion['verdictTone']) => {
    if (tone === 'critical') return <StatusPill tone="crit">Rischio Alto</StatusPill>;
    if (tone === 'warning') return <StatusPill tone="warn">Attenzione</StatusPill>;
    return <StatusPill tone="ok">Resiliente</StatusPill>;
  };

  const getJudgeBorder = (tone: JudgeOpinion['verdictTone'], isSelected: boolean) => {
    if (isSelected) {
      if (tone === 'critical') return 'border-red-500/80 bg-red-950/20';
      if (tone === 'warning') return 'border-amber-500/80 bg-amber-950/20';
      return 'border-emerald-500/80 bg-emerald-950/20';
    }
    return 'border-border bg-surface hover:bg-hover';
  };

  const currentJudge = verdict ? verdict.judges[activeTab === 'red_team' ? 'redTeam' : activeTab === 'blue_team' ? 'blueTeam' : 'businessRisk'] : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-5 transition-all">
      {/* Header Corte di Sicurezza */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-bg text-accent">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[1.0625rem] font-bold text-foreground">
                Tribunale di Sicurezza Multi-Modello
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono border-accent/40 text-accent">
                3 PROSPETTIVE INDIPENDENTI
              </Badge>
            </div>
            <p className="text-xs text-ink-2">
              Valutazione collegiale su dati empirici verificati (Zero allucinazioni o supposizioni).
            </p>
          </div>
        </div>

        {verdict && (
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-ink-3">Verdetto della Corte:</span>
            <Badge
              variant="outline"
              className={
                verdict.courtStatus === 'INTERVENTO_URGENTE'
                  ? 'border-red-500/50 bg-red-950/40 text-red-300 font-bold'
                  : verdict.courtStatus === 'ATTENZIONE_RICHIESTA'
                  ? 'border-amber-500/50 bg-amber-950/40 text-amber-300 font-bold'
                  : 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 font-bold'
              }
            >
              {verdict.courtStatus === 'INTERVENTO_URGENTE'
                ? '🔴 INTERVENTO PRIORITARIO'
                : verdict.courtStatus === 'ATTENZIONE_RICHIESTA'
                ? '🟡 ATTENZIONE DI GESTIONE'
                : '🟢 PERIMETRO PROTETTO'}
            </Badge>
          </div>
        )}
      </div>

      {loading && (
        <div className="p-8 text-center text-xs text-ink-3 flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 animate-spin text-accent" />
          I 3 Giudici stanno esaminando i fatti empirici della scansione...
        </div>
      )}

      {verdict && (
        <div className="space-y-4">
          {/* Sentenza Unificata del Presidente di Corte */}
          <div className="rounded-lg bg-field p-3.5 border border-border text-xs leading-relaxed">
            <span className="font-bold text-foreground block mb-1">
              ⚖️ Sintesi Esecutiva della Corte (Consenso {verdict.courtConsensusRatio}):
            </span>
            <p className="text-ink-2">
              {verdict.consensusSummary}
            </p>
          </div>

          {/* I 3 Scranni dei Giudici (Selector a Tab) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Giudice 1: Red Team */}
            <button
              type="button"
              onClick={() => setActiveTab('red_team')}
              className={`p-3 rounded-lg border text-left transition-all ${getJudgeBorder(verdict.judges.redTeam.verdictTone, activeTab === 'red_team')}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-red-400" />
                  <span className="text-xs font-bold text-foreground">Red Team</span>
                </div>
                {toneToPill(verdict.judges.redTeam.verdictTone)}
              </div>
              <p className="text-[11px] text-ink-3 line-clamp-1">{verdict.judges.redTeam.modelDesignation}</p>
              <p className="text-[11px] font-medium text-ink-2 mt-1 truncate">
                {verdict.judges.redTeam.verdictHeadline}
              </p>
            </button>

            {/* Giudice 2: Blue Team */}
            <button
              type="button"
              onClick={() => setActiveTab('blue_team')}
              className={`p-3 rounded-lg border text-left transition-all ${getJudgeBorder(verdict.judges.blueTeam.verdictTone, activeTab === 'blue_team')}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold text-foreground">Blue Team</span>
                </div>
                {toneToPill(verdict.judges.blueTeam.verdictTone)}
              </div>
              <p className="text-[11px] text-ink-3 line-clamp-1">{verdict.judges.blueTeam.modelDesignation}</p>
              <p className="text-[11px] font-medium text-ink-2 mt-1 truncate">
                {verdict.judges.blueTeam.verdictHeadline}
              </p>
            </button>

            {/* Giudice 3: Business & Risk */}
            <button
              type="button"
              onClick={() => setActiveTab('business_risk')}
              className={`p-3 rounded-lg border text-left transition-all ${getJudgeBorder(verdict.judges.businessRisk.verdictTone, activeTab === 'business_risk')}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-foreground">Risk & NIS2</span>
                </div>
                {toneToPill(verdict.judges.businessRisk.verdictTone)}
              </div>
              <p className="text-[11px] text-ink-3 line-clamp-1">{verdict.judges.businessRisk.modelDesignation}</p>
              <p className="text-[11px] font-medium text-ink-2 mt-1 truncate">
                {verdict.judges.businessRisk.verdictHeadline}
              </p>
            </button>
          </div>

          {/* Dettaglio Giudice Selezionato */}
          {currentJudge && (
            <div className="rounded-lg border border-border bg-field p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span>Deliberazione di: {currentJudge.judgeName}</span>
                </span>
                <span className="text-[10px] font-mono text-ink-3 bg-surface px-2 py-0.5 rounded border border-border">
                  Confidenza: {Math.round(currentJudge.confidenceScore * 100)}%
                </span>
              </div>

              <div className="space-y-1.5">
                {currentJudge.keyArguments.map((arg, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-ink-2">
                    <ChevronRight className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                    <span>{arg}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border/80 flex items-start gap-2 text-xs">
                <span className="font-bold text-ink-3 uppercase text-[10px] tracking-wider shrink-0 mt-0.5">
                  {currentJudge.judgeRole === 'red_team' ? 'Exploit Vector:' : currentJudge.judgeRole === 'blue_team' ? 'Caveat Tecnico:' : 'Impatto d’Impresa:'}
                </span>
                <span className="font-mono text-ink-2 text-[11px]">
                  {currentJudge.operationalNoticeOrExploitPath}
                </span>
              </div>
            </div>
          )}

          {/* Direttive Unanimi della Corte */}
          {verdict.unanimousDirectives && verdict.unanimousDirectives.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-ink-3 uppercase tracking-wider block">
                Direttive Unanimi di Bonifica (Nessun dissenso tra i Giudici):
              </span>
              <div className="space-y-1.5">
                {verdict.unanimousDirectives.map((dir, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border text-xs gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-bg text-accent font-bold text-[10px]">
                        {dir.priority}
                      </span>
                      <span className="font-medium text-foreground">{dir.action}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] border-border text-ink-3">
                        {dir.responsibleRole}
                      </Badge>
                      <span className="text-[11px] text-amber-400/90 font-mono hidden lg:inline">
                        ⚠️ {dir.safeguardRule}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
