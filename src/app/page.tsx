'use client';

import { useState } from 'react';
import { ExternalTests } from '@/components/dashboard/ExternalTests';
import { InternalTests } from '@/components/dashboard/InternalTests';
import { SecurityAudit } from '@/components/dashboard/SecurityAudit';
import { VulnerabilityScan } from '@/components/dashboard/VulnerabilityScan';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Globe, Wifi, ShieldCheck, Flame, Zap } from 'lucide-react';

type TabType = 'external' | 'internal' | 'security' | 'vulnerabilities';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('external');

  return (
    <div className="relative min-h-screen pb-16 overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-gradient-to-b from-blue-600/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-48 right-10 w-[400px] h-[300px] bg-red-600/10 blur-3xl pointer-events-none -z-10" />

      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-7xl">
        {/* Main Hero Header */}
        <div className="flex flex-col items-center text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 text-blue-400 fill-current" />
            Network & Security Operations Suite
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white max-w-4xl leading-tight">
            Diagnostica di Rete & <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-red-400">
              Vulnerability Assessment
            </span>
          </h1>

          <p className="text-zinc-400 max-w-2xl text-base sm:text-lg leading-relaxed">
            Monitora latenza, DNS, posture crittografica e scansiona falle di sicurezza, file esposti (.env, .git) e misconfigurazioni CORS/Cookie.
          </p>
        </div>

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
              External Tests
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
        </div>
        
        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between text-zinc-500 text-xs gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Network Diagnostic & Vulnerability Operations Center</span>
          </div>
          <div>
            &copy; 2026 NetworkDiag Tool &bull; Powered by LibSQL & Edge Next.js
          </div>
        </footer>
      </div>
    </div>
  );
}
