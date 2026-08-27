'use client';

import React, { useState } from 'react';
import { RiskAssessment, FindingSeverity } from '@/types/findings';
import { Asset } from '@/types/assets';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Bot, History, Server, Bell } from 'lucide-react';


interface RiskScoreWidgetProps {
  assessment: RiskAssessment;
  target: string;
  asset?: Asset | null;
  onOpenAiRemediation: () => void;
  onOpenDiffHistory: () => void;
  onOpenAssetInventory?: () => void;
  onOpenWebhookManager?: () => void;
}

export const RiskScoreWidget: React.FC<RiskScoreWidgetProps> = ({
  assessment,
  target,
  asset,
  onOpenAiRemediation,
  onOpenDiffHistory,
  onOpenAssetInventory,
  onOpenWebhookManager,
}) => {
  const [ignoredRules, setIgnoredRules] = useState<string[]>([]);

  // Calcolo dinamico dello score se l'utente ha marcato dei falsi positivi
  const activeDeductions = assessment.deductions.filter((d) => !ignoredRules.includes(d.rule));
  const totalDeductionsPoints = activeDeductions.reduce((acc, d) => acc + d.points, 0);
  const dynamicScore = Math.max(0, Math.min(100, 100 - totalDeductionsPoints));

  let dynamicGrade = assessment.grade;
  if (ignoredRules.length > 0) {
    if (dynamicScore >= 95) dynamicGrade = 'A+';
    else if (dynamicScore >= 85) dynamicGrade = 'A';
    else if (dynamicScore >= 70) dynamicGrade = 'B';
    else if (dynamicScore >= 50) dynamicGrade = 'C';
    else if (dynamicScore >= 35) dynamicGrade = 'D';
    else dynamicGrade = 'F';
  }

  const toggleIgnoreRule = (rule: string) => {
    setIgnoredRules((prev) =>
      prev.includes(rule) ? prev.filter((r) => r !== rule) : [...prev, rule]
    );
  };

  const getGradeBadge = (g: string) => {
    switch (g) {
      case 'A+':
      case 'A':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'B':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'C':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'D':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    }
  };

  const getSeverityBadge = (sev: FindingSeverity) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden my-6">
      {/* Background ambient glow */}
      <div
        className={`absolute -right-20 -top-20 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20 ${
          dynamicScore >= 80 ? 'bg-emerald-500' : dynamicScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'
        }`}
      />

      {/* Header Widget */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-4">
          <div
            className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border font-mono font-black text-2xl shadow-inner ${getGradeBadge(
              dynamicGrade
            )}`}
          >
            <span>{dynamicGrade}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-100">Explainable Security & Posture Score</h2>
              {asset && (
                <span
                  className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border font-bold ${
                    asset.environment === 'production'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  Env: {asset.environment} ({asset.criticality})
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Valutazione per <span className="font-mono text-indigo-300 font-semibold">{target}</span>: {dynamicScore}/100 punti
              {ignoredRules.length > 0 && (
                <span className="text-xs text-amber-400 ml-2">
                  ({ignoredRules.length} falso positivo escluso)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
          {onOpenAssetInventory && (
            <button
              onClick={onOpenAssetInventory}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              Asset Inventory
            </button>
          )}
          {onOpenWebhookManager && (
            <button
              onClick={onOpenWebhookManager}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <Bell className="w-3.5 h-3.5 text-violet-400" />
              Webhooks
            </button>
          )}
          <button
            onClick={onOpenDiffHistory}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            Diffing Storico
          </button>
          <button
            onClick={onOpenAiRemediation}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Bot className="w-4 h-4 text-indigo-200" />
            AI Remediation Copilot
          </button>
        </div>
      </div>

      {/* 3 Pillars Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {/* Pilastro 1: Disponibilità */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Disponibilità & SLA
            </span>
            <span className="font-mono font-bold text-sm text-emerald-400">{assessment.pillars.availability.score}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${assessment.pillars.availability.score}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>DNS, Ping, TTFB, IPv6</span>
            <span className="text-slate-300 font-mono">
              {assessment.pillars.availability.criticalCount + assessment.pillars.availability.highCount === 0 ? '✓ Ottimale' : 'Attenzione'}
            </span>
          </div>
        </div>

        {/* Pilastro 2: Configurazione */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Configurazione & Header
            </span>
            <span className="font-mono font-bold text-sm text-blue-400">{assessment.pillars.configuration.score}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${assessment.pillars.configuration.score}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>TLS, HSTS, CSP, DMARC, CAA</span>
            <span className="text-slate-300 font-mono">
              {assessment.pillars.configuration.highCount > 0 ? `${assessment.pillars.configuration.highCount} alert` : '✓ Conforme'}
            </span>
          </div>
        </div>

        {/* Pilastro 3: Sicurezza & Esposizione */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Sicurezza & Perimetro
            </span>
            <span className="font-mono font-bold text-sm text-rose-400">{assessment.pillars.security.score}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                assessment.pillars.security.score > 70 ? 'bg-emerald-500' : assessment.pillars.security.score > 40 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${assessment.pillars.security.score}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Porte, File .env, CORS, Cookie</span>
            <span className="text-slate-300 font-mono">
              {assessment.pillars.security.criticalCount > 0 ? (
                <span className="text-rose-400 font-bold">{assessment.pillars.security.criticalCount} critici</span>
              ) : (
                '✓ Nessun leak'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Deductions & Explainability Section with False Positive toggling */}
      {assessment.deductions.length > 0 ? (
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Trasparenza Punteggio & Gestione Falsi Positivi
            </h4>
            <span className="text-xs text-slate-400">
              Penalità applicata: <span className="font-mono text-rose-400 font-bold">-{totalDeductionsPoints} pt</span>
            </span>
          </div>
          <div className="space-y-2">
            {assessment.deductions.map((ded, i) => {
              const isIgnored = ignoredRules.includes(ded.rule);
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all text-xs ${
                    isIgnored
                      ? 'bg-slate-950/20 border-slate-800/40 opacity-50 line-through'
                      : 'bg-slate-950/40 border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 mr-3">
                    <span className={`px-2 py-0.5 rounded border font-mono font-bold uppercase ${getSeverityBadge(ded.severity)}`}>
                      {ded.severity}
                    </span>
                    <span className="font-medium text-slate-200">{ded.rule}</span>
                    <span className="text-slate-400 hidden sm:inline">— {ded.reason}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-rose-400">-{ded.points} pt</span>
                    <button
                      onClick={() => toggleIgnoreRule(ded.rule)}
                      className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-colors ${
                        isIgnored
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800 hover:bg-emerald-900/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                      title={isIgnored ? 'Ripristina penalità' : 'Contrassegna come Falso Positivo / Rischio Accettato'}
                    >
                      {isIgnored ? 'Ripristina' : 'Falso Positivo'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          Nessuna penalità applicata. L’host soddisfa tutti i requisiti di hardening perimetrale e configurazione.
        </div>
      )}
    </div>
  );
};
