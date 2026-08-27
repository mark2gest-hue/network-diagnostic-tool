'use client';

import React from 'react';
import { DEMO_SCENARIOS, DemoScenario } from '@/lib/demo-scenarios';
import { Sparkles, ShieldCheck, Flame, Server, Globe } from 'lucide-react';

interface DemoScenarioSelectorProps {
  activeScenarioId: string | null;
  onSelectScenario: (scenario: DemoScenario | null) => void;
}

export const DemoScenarioSelector: React.FC<DemoScenarioSelectorProps> = ({
  activeScenarioId,
  onSelectScenario,
}) => {
  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 shadow-xl mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Portfolio Interactive Demo & EASM Simulator
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                1-Click Showcase
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Mostra istantaneamente a clienti e recruiter il calcolo del rischio, il drift temporale e la remediation AI senza attese.
            </p>
          </div>
        </div>

        {activeScenarioId && (
          <button
            onClick={() => onSelectScenario(null)}
            className="text-xs text-indigo-300 hover:text-white underline font-mono flex items-center gap-1 self-end md:self-auto"
          >
            <Globe className="w-3.5 h-3.5" />
            Torna a Scansione Live Utente
          </button>
        )}
      </div>

      {/* Scenario Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Scenario 1: Fintech Prod */}
        <button
          onClick={() => onSelectScenario(DEMO_SCENARIOS.fintech_prod)}
          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
            activeScenarioId === 'fintech_prod'
              ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500 shadow-lg shadow-emerald-950/50'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Fintech Prod
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Score: 98 A+
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-semibold truncate">api.fintech-cloud.io</p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">Golden Standard bancario, zero leak</p>
        </button>

        {/* Scenario 2: E-Commerce Drift Incident */}
        <button
          onClick={() => onSelectScenario(DEMO_SCENARIOS.ecommerce_drift)}
          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
            activeScenarioId === 'ecommerce_drift'
              ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500 shadow-lg shadow-rose-950/50'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 animate-bounce" /> E-Commerce Incident
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Drift: -63 pt (F)
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-semibold truncate">shop.fashion-global.com</p>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">Porta Redis 6379 & .env leakati</p>
        </button>

        {/* Scenario 3: Staging K8s */}
        <button
          onClick={() => onSelectScenario(DEMO_SCENARIOS.staging_k8s)}
          className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
            activeScenarioId === 'staging_k8s'
              ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500 shadow-lg shadow-amber-950/50'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" /> Staging Cluster
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Score: 64 C
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-semibold truncate">k8s-stage.internal-dev.net</p>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">SSL in scadenza (3 giorni)</p>
        </button>
      </div>
    </div>
  );
};
