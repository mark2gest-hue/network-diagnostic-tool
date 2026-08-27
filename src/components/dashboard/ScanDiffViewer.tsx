'use client';

import React from 'react';
import { ScanDiffResult, DiffChangeType } from '@/types/findings';
import { X, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

interface ScanDiffViewerProps {

  isOpen: boolean;
  onClose: () => void;
  diffResult: ScanDiffResult | null;
  loading?: boolean;
}

export const ScanDiffViewer: React.FC<ScanDiffViewerProps> = ({
  isOpen,
  onClose,
  diffResult,
  loading = false,
}) => {
  if (!isOpen) return null;

  const getChangeBadge = (type: DiffChangeType) => {
    switch (type) {
      case 'added':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'removed':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'degraded':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'improved':
        return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      case 'changed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getChangeLabel = (type: DiffChangeType) => {
    switch (type) {
      case 'added':
        return '+ Nuovo Alert';
      case 'removed':
        return '✓ Risolto';
      case 'degraded':
        return '▼ Degrado';
      case 'improved':
        return '▲ Migliorato';
      case 'changed':
        return '~ Modificato';
      default:
        return 'Invariato';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>Time-Travel Diffing & Anomaly Detection</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Prima vs Dopo
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Confronto temporale per: <span className="text-indigo-300 font-semibold">{diffResult?.target || 'Target'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
              <p className="text-sm text-slate-300">Calcolo comparativo e analisi differenze in corso...</p>
            </div>
          ) : diffResult ? (
            <>
              {/* Score Comparison Banner */}
              <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
                  <span className="text-xs text-slate-400 mb-1">Scansione Precedente</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-bold text-slate-200">{diffResult.previousScore}/100</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">
                      {diffResult.previousGrade}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">
                    {new Date(diffResult.previousTimestamp).toLocaleDateString()} {new Date(diffResult.previousTimestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
                  <span className="text-xs text-slate-400 mb-1">Variazione Postura</span>
                  <div className="flex items-center gap-1.5 font-mono text-xl font-bold">
                    {diffResult.scoreDelta > 0 ? (
                      <>
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-400">+{diffResult.scoreDelta} pt</span>
                      </>
                    ) : diffResult.scoreDelta < 0 ? (
                      <>
                        <TrendingDown className="w-5 h-5 text-rose-400" />
                        <span className="text-rose-400">{diffResult.scoreDelta} pt</span>
                      </>
                    ) : (
                      <>
                        <Minus className="w-5 h-5 text-slate-400" />
                        <span className="text-slate-400">Invariato</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    {diffResult.scoreDelta >= 0 ? 'Miglioramento' : 'Peggiore esposizione'}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
                  <span className="text-xs text-slate-400 mb-1">Scansione Più Recente</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-bold text-slate-200">{diffResult.currentScore}/100</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">
                      {diffResult.currentGrade}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">
                    {new Date(diffResult.currentTimestamp).toLocaleDateString()} {new Date(diffResult.currentTimestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Badges Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col">
                  <span className="text-rose-400 font-semibold">Nuovi Alert</span>
                  <span className="text-xl font-mono font-bold text-rose-300 mt-1">
                    {diffResult.summary.newVulnerabilities}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                  <span className="text-emerald-400 font-semibold">Problemi Risolti</span>
                  <span className="text-xl font-mono font-bold text-emerald-300 mt-1">
                    {diffResult.summary.resolvedVulnerabilities}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col">
                  <span className="text-blue-400 font-semibold">Variazioni Config</span>
                  <span className="text-xl font-mono font-bold text-blue-300 mt-1">
                    {diffResult.summary.configDrifts}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 flex flex-col">
                  <span className="text-violet-400 font-semibold">Delta Latenza</span>
                  <span className="text-xl font-mono font-bold text-violet-300 mt-1">
                    {diffResult.summary.latencyDeltaMs ? `${diffResult.summary.latencyDeltaMs > 0 ? '+' : ''}${diffResult.summary.latencyDeltaMs}ms` : '—'}
                  </span>
                </div>
              </div>

              {/* View Switcher: Diff Dettagliato vs Timeline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <span>Cronologia Modifiche & Timeline Eventi</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {diffResult.timeline?.length || diffResult.changes.length} eventi
                  </span>
                </div>

                {/* Timeline Events Rendering */}
                {diffResult.timeline && diffResult.timeline.length > 0 && (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800 my-4 pl-8">
                    {diffResult.timeline.map((evt) => {
                      const getTimelineClassBadge = (c: string) => {
                        switch (c) {
                          case 'new':
                            return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                          case 'resolved':
                            return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                          case 'modified':
                            return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                          case 'recurring':
                            return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                          default:
                            return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
                        }
                      };

                      return (
                        <div key={evt.id} className="relative group">
                          {/* Timeline dot */}
                          <div className={`absolute -left-8 top-1.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                            evt.severity === 'critical' ? 'bg-rose-500' : evt.severity === 'high' ? 'bg-orange-500' : 'bg-blue-500'
                          }`} />

                          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-1.5 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span className="font-bold text-slate-100 text-sm flex items-center gap-2">
                                {evt.title}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.2 rounded border font-mono font-bold uppercase ${getTimelineClassBadge(evt.classification)}`}>
                                  {evt.classification === 'new' ? 'Nuovo' : evt.classification === 'resolved' ? 'Risolto' : evt.classification === 'modified' ? 'Modificato' : evt.classification}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">{evt.date}</span>
                              </div>
                            </div>
                            <p className="text-slate-400 leading-relaxed">{evt.description}</p>
                            {evt.evidence && (
                              <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300">
                                Evidenza: {evt.evidence}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Detailed Changes List */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Dettaglio Tecnico delle Variazioni ({diffResult.changes.length})
                  </h4>
                  {diffResult.changes.length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400">
                      ✓ Nessuna differenza riscontrata tra le due scansioni. La postura e la configurazione sono identiche.
                    </div>
                  ) : (
                    diffResult.changes.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded border uppercase font-mono font-bold text-[10px] ${getChangeBadge(item.changeType)}`}>
                              {getChangeLabel(item.changeType)}
                            </span>
                            <span className="font-semibold text-slate-100 text-sm">{item.title}</span>
                          </div>
                        </div>
                        <p className="text-slate-400">{item.description}</p>
                        {(item.previousEvidence || item.currentEvidence) && (
                          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 font-mono text-[11px] space-y-1">
                            {item.previousEvidence && (
                              <div className="text-rose-400/90 flex items-center gap-1.5">
                                <span className="text-slate-500 font-sans">Prima:</span> {item.previousEvidence}
                              </div>
                            )}
                            {item.currentEvidence && (
                              <div className="text-emerald-400 flex items-center gap-1.5">
                                <span className="text-slate-500 font-sans">Ora:</span> {item.currentEvidence}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center py-10">Dati di confronto non disponibili.</p>
          )}
        </div>
      </div>
    </div>
  );
};

