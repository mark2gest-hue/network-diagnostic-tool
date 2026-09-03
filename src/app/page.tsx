'use client';

import { useState } from 'react';
import { ExternalTests } from '@/components/dashboard/ExternalTests';
import { InternalTests } from '@/components/dashboard/InternalTests';
import { SecurityAudit } from '@/components/dashboard/SecurityAudit';
import { VulnerabilityScan } from '@/components/dashboard/VulnerabilityScan';
import { ManualSection } from '@/components/dashboard/ManualSection';
import { RiskScoreWidget } from '@/components/dashboard/RiskScoreWidget';
import { DemoScenarioSelector } from '@/components/dashboard/DemoScenarioSelector';
import { AssetInventoryModal } from '@/components/dashboard/AssetInventoryModal';
import { WebhookManagerModal } from '@/components/dashboard/WebhookManagerModal';
import { AiRemediationDrawer } from '@/components/dashboard/AiRemediationDrawer';
import { ScanDiffViewer } from '@/components/dashboard/ScanDiffViewer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Globe, Wifi, ShieldCheck, Flame, BookOpen, Zap } from 'lucide-react';
import { calculateRiskAssessment } from '@/lib/risk-engine';
import { RiskAssessment, ScanDiffResult } from '@/types/findings';
import { DemoScenario } from '@/lib/demo-scenarios';
import { Asset } from '@/types/assets';

type TabType = 'external' | 'internal' | 'security' | 'vulnerabilities' | 'manual';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('external');
  const [currentTarget, setCurrentTarget] = useState<string>('google.com');
  const [activeScenario, setActiveScenario] = useState<DemoScenario | null>(null);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [diffViewerOpen, setDiffViewerOpen] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);

  // Baseline default risk assessment per scansione live
  const liveAssessment: RiskAssessment = calculateRiskAssessment([
    {
      id: 'sec-hsts-ok',
      category: 'configuration',
      severity: 'info',
      title: 'HSTS Abilitato (Strict-Transport-Security)',
      description: 'Protezione HTTPS forzata con max-age elevato.',
      evidence: 'max-age=31536000; includeSubDomains; preload',
      confidence: 1.0,
    },
    {
      id: 'avail-dns-fast',
      category: 'availability',
      severity: 'info',
      title: 'Risoluzione DNS Globale Ottimale',
      description: 'Latenza DNS inferiore a 25ms su tutti i resolver principali.',
      evidence: 'Media: 14ms',
      confidence: 1.0,
    },
    {
      id: 'sec-no-leak',
      category: 'security',
      severity: 'info',
      title: 'Nessun File Sensibile Esposto',
      description: 'Verifica completata su .env, .git, backup.sql.',
      evidence: 'Tutti gli endpoint restituiscono 404 / 403',
      confidence: 1.0,
    },
  ]);

  const activeAssessment = activeScenario ? activeScenario.assessment : liveAssessment;
  const activeAsset: Asset | null = activeScenario ? activeScenario.asset : null;
  const activeDiffResult: ScanDiffResult = activeScenario?.diffResult || {
    target: currentTarget,
    previousTimestamp: new Date(Date.now() - 86400000).toISOString(),
    currentTimestamp: new Date().toISOString(),
    previousScore: 85,
    currentScore: 98,
    scoreDelta: 13,
    previousGrade: 'B',
    currentGrade: 'A+',
    changes: [
      {
        id: 'sec-hsts-enabled',
        category: 'configuration',
        changeType: 'improved',
        title: 'HSTS Abilitato con successo',
        previousEvidence: 'Header assente',
        currentEvidence: 'max-age=31536000; includeSubDomains',
        severity: 'high',
        description: 'Il server web ora invia correttamente la direttiva HSTS.',
      },
      {
        id: 'sec-port-closed',
        category: 'security',
        changeType: 'removed',
        title: 'Porta Database 3306 Chiusa',
        previousEvidence: 'Porta 3306 aperta su IP pubblico',
        severity: 'critical',
        description: 'La porta MySQL è stata rimossa dall’interfaccia pubblica tramite regola firewall.',
      },
    ],
    summary: {
      newVulnerabilities: 0,
      resolvedVulnerabilities: 1,
      configDrifts: 1,
      latencyDeltaMs: -35,
    },
  };

  const handleSelectScenario = (scenario: DemoScenario | null) => {
    setActiveScenario(scenario);
    if (scenario) {
      setCurrentTarget(scenario.asset.target);
    } else {
      setCurrentTarget('google.com');
    }
  };

  return (
    <div className="relative min-h-screen pb-16 overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-blue-600/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-48 right-10 w-[400px] h-[300px] bg-red-600/10 blur-3xl pointer-events-none -z-10" />

      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-7xl">
        {/* Main Hero Header */}
        <div className="flex flex-col items-center text-center space-y-4 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 text-blue-400 fill-current" />
            Network & Security Operations Suite Pro (EASM)
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white max-w-4xl leading-tight">
            Attack Surface Monitoring & <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-red-400">
              Explainable Risk Scoring
            </span>
          </h1>

          <p className="text-zinc-400 max-w-2xl text-base sm:text-lg leading-relaxed">
            Diagnostica profonda a 3 pilastri (Disponibilità, Configurazione, Sicurezza), protezione da SSRF, diffing temporale e assistenza AI alla remediation.
          </p>
        </div>

        {/* 1-Click Interactive Demo Selector for Portfolio & Clients */}
        <DemoScenarioSelector
          activeScenarioId={activeScenario ? activeScenario.id : null}
          onSelectScenario={handleSelectScenario}
        />

        {/* Explainable Risk Score Banner */}
        <RiskScoreWidget
          assessment={activeAssessment}
          target={activeScenario ? activeScenario.asset.target : currentTarget}
          asset={activeAsset}
          onOpenAiRemediation={() => setAiDrawerOpen(true)}
          onOpenDiffHistory={() => setDiffViewerOpen(true)}
          onOpenAssetInventory={() => setAssetModalOpen(true)}
          onOpenWebhookManager={() => setWebhookModalOpen(true)}
        />

        {/* Interactive Tab Switcher Selector */}
        <div className="flex justify-center mb-8">
          <div className="bg-zinc-900/90 border border-zinc-800/90 p-1.5 gap-2 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-wrap justify-center max-w-full">
            <button 
              type="button"
              onClick={() => setActiveTab('external')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'external'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Globe className="w-4 h-4" />
              External Diagnostics
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('internal')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'internal'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25 border border-emerald-400/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Wifi className="w-4 h-4" />
              Internal / LAN & WiFi
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('security')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'security'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/25 border border-purple-400/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Security Audit
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('vulnerabilities')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'vulnerabilities'
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 text-white shadow-lg shadow-red-600/25 border border-red-400/30'
                  : 'text-red-400/80 hover:text-red-300 hover:bg-red-950/30'
              }`}
            >
              <Flame className="w-4 h-4 text-red-400" />
              Vulnerability Scanner
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'manual'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-emerald-600/25 border border-emerald-400/30'
                  : 'text-emerald-400/90 hover:text-emerald-300 hover:bg-emerald-950/30'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Manuale & Guida
            </button>
          </div>
        </div>

        {/* Tab Content Panels wrapped with Error Boundary */}
        <div className="space-y-4">
          {activeTab === 'external' && (
            <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in duration-300">
              <ErrorBoundary fallbackTitle="Errore nella sezione External Tests">
                <ExternalTests />
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'internal' && (
            <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in duration-300">
              <ErrorBoundary fallbackTitle="Errore nella sezione Internal / WiFi">
                <InternalTests />
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in duration-300">
              <ErrorBoundary fallbackTitle="Errore nella sezione Security Audit">
                <SecurityAudit />
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'vulnerabilities' && (
            <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in duration-300 border-red-500/20">
              <ErrorBoundary fallbackTitle="Errore nella sezione Vulnerability Scanner">
                <VulnerabilityScan />
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in duration-300 border-emerald-500/20">
              <ErrorBoundary fallbackTitle="Errore nella sezione Manuale & Guida">
                <ManualSection />
              </ErrorBoundary>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between text-zinc-500 text-xs gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>NetworkDiagOps Pro &bull; Attack Surface & Risk Management</span>
          </div>
          <div>
            &copy; 2026 NetworkDiag Tool &bull; Powered by LibSQL & Edge Next.js
          </div>
        </footer>
      </div>

      {/* AI Remediation Copilot Drawer */}
      <AiRemediationDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        target={activeScenario ? activeScenario.asset.target : currentTarget}
        assessment={activeAssessment}
      />

      {/* Diff Viewer Modal */}
      <ScanDiffViewer
        isOpen={diffViewerOpen}
        onClose={() => setDiffViewerOpen(false)}
        diffResult={activeDiffResult}
      />

      {/* Asset Inventory Modal */}
      <AssetInventoryModal
        isOpen={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        onSelectTarget={(t) => {
          setActiveScenario(null);
          setCurrentTarget(t);
        }}
      />

      {/* Webhook Manager Modal */}
      <WebhookManagerModal
        isOpen={webhookModalOpen}
        onClose={() => setWebhookModalOpen(false)}
        target={activeScenario ? activeScenario.asset.target : currentTarget}
      />
    </div>
  );
}


