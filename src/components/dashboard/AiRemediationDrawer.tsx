'use client';

import React, { useEffect, useState } from 'react';
import { RiskAssessment } from '@/types/findings';
import { X, Bot, ShieldAlert, Check, Copy, Terminal, RefreshCw, AlertCircle, FileText } from 'lucide-react';

interface AiRemediationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  target: string;
  assessment: RiskAssessment | null;
}

interface RemediationReport {
  target: string;
  timestamp: string;
  score: number;
  grade: string;
  executiveSummary: string;
  topPriorities: {
    rank: number;
    title: string;
    category: string;
    severity: string;
    evidence: string;
    action: string;
    snippet?: string;
    reference: string;
  }[];
  falsePositivesAnalysis: {
    topic: string;
    note: string;
  }[];
  complianceChecklist: {
    standard: string;
    status: string;
    detail: string;
  }[];
}

export const AiRemediationDrawer: React.FC<AiRemediationDrawerProps> = ({
  isOpen,
  onClose,
  target,
  assessment,
}) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<RemediationReport | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fetchAnalysis = React.useCallback(async () => {
    if (!target || !assessment) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          riskAssessment: assessment,
          findings: assessment?.findings || [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error('Failed to fetch AI analysis:', err);
    } finally {
      setLoading(false);
    }
  }, [target, assessment]);

  useEffect(() => {
    if (isOpen && target && assessment) {
      fetchAnalysis();
    }
  }, [isOpen, target, assessment, fetchAnalysis]);


  const [copiedChecklist, setCopiedChecklist] = useState(false);

  const copyFullChecklistMarkdown = () => {
    if (!report) return;

    let md = `# 🛡️ Piano di Remediation EASM - ${report.target}\n`;
    md += `**Data**: ${new Date(report.timestamp).toLocaleString()} | **Score Iniziale**: ${report.score}/100 (${report.grade})\n\n`;
    md += `## 📋 Executive Summary\n${report.executiveSummary}\n\n`;
    md += `## 🎯 Azioni di Bonifica Prioritarie\n\n`;

    report.topPriorities.forEach((item, idx) => {
      md += `### ${idx + 1}. [${item.severity.toUpperCase()}] ${item.title}\n`;
      md += `- **Evidenza**: ${item.evidence}\n`;
      md += `- **Azione di Remediation**: ${item.action}\n`;
      if (item.snippet) {
        md += `\`\`\`bash\n${item.snippet}\n\`\`\`\n`;
      }
      md += `- **Verifica**: Ripetere la scansione diagnostica dopo l'applicazione delle modifiche.\n`;
      md += `- **Riferimento**: ${item.reference}\n\n`;
    });

    if (report.falsePositivesAnalysis && report.falsePositivesAnalysis.length > 0) {
      md += `## 💡 Note sui Falsi Positivi\n`;
      report.falsePositivesAnalysis.forEach((fp) => {
        md += `- **${fp.topic}**: ${fp.note}\n`;
      });
      md += `\n`;
    }

    navigator.clipboard.writeText(md);
    setCopiedChecklist(true);
    setTimeout(() => setCopiedChecklist(false), 3000);
  };

  const copySnippet = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                AI Remediation Copilot
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Deterministic AI
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">Target: {target}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <button
                onClick={copyFullChecklistMarkdown}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
                title="Copia l'intero piano di remediation in formato Markdown"
              >
                {copiedChecklist ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedChecklist ? 'Checklist Copiata!' : 'Copia Checklist'}
              </button>
            )}
            <button
              onClick={fetchAnalysis}
              disabled={loading}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Ricalcola analisi"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <div>
                <p className="text-sm font-semibold text-slate-200">Elaborazione evidenze di sicurezza in corso...</p>
                <p className="text-xs text-slate-500 mt-1">Generazione piano di remediation e sintesi esecutiva.</p>
              </div>
            </div>
          ) : report ? (
            <>
              {/* Executive Summary */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-wide">Executive Summary (Management)</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{report.executiveSummary}</p>
              </div>

              {/* Top 3 Priorità di Remediation con formato strutturato */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Top Priorità di Remediation ({report.topPriorities.length})
                  </h3>
                  <span className="text-xs text-slate-500">Ordinato per gravità</span>
                </div>

                {report.topPriorities.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                    ✓ Nessun problema critico prioritario rilevato! La configurazione è ottimale.
                  </div>
                ) : (
                  report.topPriorities.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3.5"
                    >
                      {/* Titolo e Severità */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-800/60 pb-3">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                            #{item.rank}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-slate-100">{item.title}</h4>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">Evidenza: {item.evidence}</p>
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded border uppercase font-mono font-bold shrink-0 ${
                            item.severity === 'critical'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </div>

                      {/* Blocco 1: Problema & Rischio */}
                      <div className="space-y-1.5 text-xs text-slate-300">
                        <span className="font-semibold text-rose-300 block">Rischio & Impatto:</span>
                        <p className="text-slate-400 leading-relaxed">
                          Possibile esposizione non autorizzata di dati o compromissione dell&apos;integrità del perimetro applicativo.
                        </p>
                      </div>

                      {/* Blocco 2: Azione Consigliata */}
                      <div className="text-xs text-slate-300 bg-slate-900/90 p-3.5 rounded-lg border border-slate-800/60 space-y-1.5">
                        <span className="font-bold text-indigo-300 block">Azioni Immediate di Bonifica:</span>
                        <p className="text-slate-200">{item.action}</p>
                      </div>

                      {/* Blocco 3: Snippet Configurazione */}
                      {item.snippet && (
                        <div className="relative group">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 rounded-t-lg border-t border-x border-slate-800 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1.5 font-mono text-slate-300">
                              <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Comando / Configurazione Suggerita
                            </span>
                            <button
                              onClick={() => copySnippet(item.snippet!, idx)}
                              className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                              {copiedIndex === idx ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copiato!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copia Codice</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="p-3 bg-slate-950 rounded-b-lg border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
                            <code>{item.snippet}</code>
                          </pre>
                        </div>
                      )}

                      {/* Blocco 4: Verifica Post-Modifica */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                        <span>
                          <strong>Verifica successiva:</strong> Rieseguire la scansione dopo aver applicato la modifica.
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          Ref: {item.reference}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>


              {/* Analisi dei Falsi Positivi */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Note su Potenziali Falsi Positivi
                </h4>
                <div className="space-y-2 text-xs text-slate-400">
                  {report.falsePositivesAnalysis.map((fp, i) => (
                    <div key={i} className="border-l-2 border-slate-700 pl-3">
                      <span className="font-semibold text-slate-300">{fp.topic}:</span> {fp.note}
                    </div>
                  ))}
                </div>
              </div>

              {/* Checklist di Conformità */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Postura Standard & Compliance</h4>
                <div className="space-y-2">
                  {report.complianceChecklist.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 text-xs">
                      <div>
                        <span className="font-semibold text-slate-200">{c.standard}</span>
                        <p className="text-[11px] text-slate-400">{c.detail}</p>
                      </div>
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                          c.status === 'CONFORME'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center py-10">Nessun dato disponibile per l’analisi.</p>
          )}
        </div>
      </div>
    </div>
  );
};
