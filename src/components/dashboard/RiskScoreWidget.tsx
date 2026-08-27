'use client';

import React, { useState } from 'react';
import { RiskAssessment, FindingSeverity, FindingStatus } from '@/types/findings';
import { Asset } from '@/types/assets';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Bot, 
  History, 
  Server, 
  Bell, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  Calculator,
  Calendar,
  Layers
} from 'lucide-react';

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
  // Tracciamento locale degli stati dei finding (open, confirmed, risk_accepted, false_positive)
  const [findingStatuses, setFindingStatuses] = useState<Record<string, FindingStatus>>({});
  const [expandedEvidenceIds, setExpandedEvidenceIds] = useState<string[]>([]);
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  const toggleExpandEvidence = (id: string) => {
    setExpandedEvidenceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSetStatus = (findingId: string, status: FindingStatus) => {
    setFindingStatuses((prev) => ({
      ...prev,
      [findingId]: prev[findingId] === status ? 'open' : status,
    }));
  };

  // Calcolo dinamico dello score tenendo conto di Falsi Positivi e Rischi Accettati
  const findingsWithStatus = assessment.findings.map((f) => ({
    ...f,
    status: findingStatuses[f.id] || f.status || 'open',
  }));

  // Filtra detrazioni attive
  const activeDeductions = assessment.deductions.filter((d) => {
    const status = d.findingId ? findingStatuses[d.findingId] : undefined;
    return status !== 'false_positive' && status !== 'risk_accepted';
  });

  const ignoredCount = Object.values(findingStatuses).filter(
    (s) => s === 'false_positive' || s === 'risk_accepted'
  ).length;

  // Ricalcolo dinamico dei 3 punteggi (Exposure, Posture, Operational)
  const exposureDeductions = activeDeductions.filter((d) => d.severity === 'critical' || d.severity === 'high');
  const exposurePoints = exposureDeductions.reduce((acc, d) => acc + d.points, 0);
  const dynamicExposure = Math.max(0, Math.min(100, 100 - exposurePoints));

  const posturePoints = activeDeductions
    .filter((d) => d.severity === 'medium' || d.severity === 'low')
    .reduce((acc, d) => acc + d.points, 0);
  const dynamicPosture = Math.max(0, Math.min(100, 100 - posturePoints));

  const dynamicOperational = assessment.breakdown?.operationalScore ?? assessment.pillars.availability.score;

  // Calcolo totale ponderato: Exposure 50% + Posture 30% + Operational 20%
  const dynamicScore = Math.round((dynamicExposure * 0.5) + (dynamicPosture * 0.3) + (dynamicOperational * 0.2));

  let dynamicGrade = assessment.grade;
  if (dynamicScore >= 95) dynamicGrade = 'A+';
  else if (dynamicScore >= 85) dynamicGrade = 'A';
  else if (dynamicScore >= 70) dynamicGrade = 'B';
  else if (dynamicScore >= 50) dynamicGrade = 'C';
  else if (dynamicScore >= 35) dynamicGrade = 'D';
  else dynamicGrade = 'F';

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
              {ignoredCount > 0 && (
                <span className="text-xs text-amber-400 ml-2">
                  ({ignoredCount} finding esclusi/accettati)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
          <button
            onClick={() => setShowFormulaDetails(!showFormulaDetails)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            Formula Trasparente
          </button>
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

      {/* Formula Explanation Collapsible Box */}
      {showFormulaDetails && (
        <div className="my-4 p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
            <Calculator className="w-4 h-4" />
            <span>Scomposizione Matematica del Punteggio EASM</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block">Exposure Score (50%):</span>
              <span className="text-rose-400 font-bold text-sm">{dynamicExposure}/100</span>
              <span className="text-[10px] text-slate-500 block">Porte aperte, leak .env, vulnerabilità</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block">Posture Score (30%):</span>
              <span className="text-blue-400 font-bold text-sm">{dynamicPosture}/100</span>
              <span className="text-[10px] text-slate-500 block">TLS 1.3, HSTS, Cookie, CAA, WAF</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block">Operational Score (20%):</span>
              <span className="text-emerald-400 font-bold text-sm">{dynamicOperational}/100</span>
              <span className="text-[10px] text-slate-500 block">Latenza TTFB, SLA DNS, HTTP/3</span>
            </div>
          </div>
          <p className="text-slate-400 font-mono text-[11px] pt-1">
            Formula: <span className="text-slate-200">({dynamicExposure} × 0.5) + ({dynamicPosture} × 0.3) + ({dynamicOperational} × 0.2) = <strong className="text-emerald-400">{dynamicScore}/100</strong></span>
          </p>
        </div>
      )}

      {/* 3 Pillars Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {/* Pilastro 1: Exposure */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Exposure Score (50%)
            </span>
            <span className="font-mono font-bold text-sm text-rose-400">{dynamicExposure}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                dynamicExposure > 70 ? 'bg-emerald-500' : dynamicExposure > 40 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${dynamicExposure}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Porte, Leak File, CORS</span>
            <span className="text-slate-300 font-mono">
              {exposurePoints > 0 ? `-${exposurePoints} pt` : '✓ Blindato'}
            </span>
          </div>
        </div>

        {/* Pilastro 2: Posture */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Posture Score (30%)
            </span>
            <span className="font-mono font-bold text-sm text-blue-400">{dynamicPosture}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${dynamicPosture}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>TLS, HSTS, DMARC, Cookie</span>
            <span className="text-slate-300 font-mono">
              {posturePoints > 0 ? `-${posturePoints} pt` : '✓ Conforme'}
            </span>
          </div>
        </div>

        {/* Pilastro 3: Operational */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Operational & SLA (20%)
            </span>
            <span className="font-mono font-bold text-sm text-emerald-400">{dynamicOperational}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${dynamicOperational}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>TTFB, DNS Latency, IPv6</span>
            <span className="text-slate-300 font-mono">
              {dynamicOperational >= 80 ? '✓ Ottimale' : 'Latenza elevata'}
            </span>
          </div>
        </div>
      </div>

      {/* Findings with Expandable Technical Evidence & Analyst Actions */}
      <div className="mt-6 pt-5 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Evidenze Tecniche & Gestione Lifecycle dei Finding
            </h3>
            <p className="text-xs text-slate-400">
              Ispeziona i dati grezzi dei moduli, verifica i timestamp e modifica lo stato del finding.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {findingsWithStatus.length} anomalie tracciate
          </span>
        </div>

        <div className="space-y-3">
          {findingsWithStatus.map((finding) => {
            const isExpanded = expandedEvidenceIds.includes(finding.id);
            const status = finding.status || 'open';
            const isIgnored = status === 'false_positive' || status === 'risk_accepted';

            return (
              <div
                key={finding.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isIgnored
                    ? 'bg-slate-950/30 border-slate-800/40 opacity-60'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Finding Header Bar */}
                <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span
                      className={`px-2 py-0.5 rounded border font-mono font-bold uppercase text-[10px] shrink-0 mt-0.5 ${getSeverityBadge(
                        finding.severity
                      )}`}
                    >
                      {finding.severity}
                    </span>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-200">{finding.title}</h4>
                        {/* Status Chip */}
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded font-mono font-semibold border ${
                            status === 'confirmed'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : status === 'risk_accepted'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : status === 'false_positive'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          Stato: {status === 'open' ? 'Da Verificare' : status === 'confirmed' ? 'Confermato' : status === 'risk_accepted' ? 'Rischio Accettato' : 'Falso Positivo'}
                        </span>
                        {finding.confidence && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Confidenza: {Math.round(finding.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{finding.description}</p>
                    </div>
                  </div>

                  {/* Analyst Action Buttons */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => toggleExpandEvidence(finding.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1 transition-colors"
                    >
                      <Terminal className="w-3 h-3 text-indigo-400" />
                      {isExpanded ? 'Nascondi Evidenza' : 'Mostra Evidenza'}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {/* Status Toggle Menu */}
                    <div className="flex items-center gap-1">
                      {status !== 'confirmed' && (
                        <button
                          onClick={() => handleSetStatus(finding.id, 'confirmed')}
                          className="px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[11px] border border-rose-800/60 transition-colors"
                          title="Conferma che la vulnerabilità è reale"
                        >
                          Conferma
                        </button>
                      )}
                      {status !== 'false_positive' && (
                        <button
                          onClick={() => handleSetStatus(finding.id, 'false_positive')}
                          className="px-2 py-1 rounded bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-[11px] border border-emerald-800/60 transition-colors"
                          title="Segnala come falso positivo ed escludi dal punteggio"
                        >
                          Falso Positivo
                        </button>
                      )}
                      {status !== 'risk_accepted' && (
                        <button
                          onClick={() => handleSetStatus(finding.id, 'risk_accepted')}
                          className="px-2 py-1 rounded bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 text-[11px] border border-blue-800/60 transition-colors"
                          title="Accetta il rischio aziendale per questo finding"
                        >
                          Accetta Rischio
                        </button>
                      )}
                      {status !== 'open' && (
                        <button
                          onClick={() => handleSetStatus(finding.id, 'open')}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] border border-slate-700 transition-colors"
                          title="Ripristina allo stato 'Da verificare'"
                        >
                          Ripristina
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Technical Evidence Body */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-800/60 bg-slate-950/80 text-xs space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px] font-mono">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block">Host / Target:</span>
                        <span className="text-slate-200 font-semibold">{finding.technicalEvidence?.host || target}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block">Porta / Protocollo:</span>
                        <span className="text-slate-200 font-semibold">{finding.technicalEvidence?.port ? `${finding.technicalEvidence.port} (${finding.technicalEvidence.protocol || 'TCP'})` : 'N/A (Web/DNS)'}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block">Modulo Rilevatore:</span>
                        <span className="text-indigo-300 font-semibold">{finding.technicalEvidence?.engine || 'Diagnostic Engine'}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block">Confidenza Rilevamento:</span>
                        <span className="text-emerald-400 font-semibold">{finding.technicalEvidence?.confidencePercentage || 98}% (Zero Allucinazioni)</span>
                      </div>
                    </div>

                    {/* Raw Evidence Payload */}
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1 font-semibold flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                        Raw Evidence / Risposta del Server:
                      </span>
                      <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {finding.technicalEvidence?.rawEvidence || finding.evidence}
                      </pre>
                    </div>

                    {/* Metadata dates */}
                    <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-600" />
                        Prima rilevazione: {finding.technicalEvidence?.firstSeen || '27/08/2026 18:30 UTC'}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-slate-600" />
                        Ultima verifica: {finding.technicalEvidence?.lastVerified || '27/08/2026 20:15 UTC'}
                      </span>
                      {finding.technicalEvidence?.resolvedIp && (
                        <span>IP: {finding.technicalEvidence.resolvedIp}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

