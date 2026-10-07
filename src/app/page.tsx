'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useExternalTests } from '@/hooks/useExternalTests';
import { ResultRenderer } from '@/components/dashboard/ResultRenderer';
import { ExportReportModal } from '@/components/dashboard/ExportReportModal';
import { InternalTests } from '@/components/dashboard/InternalTests';
import { SecurityAudit } from '@/components/dashboard/SecurityAudit';
import { VulnerabilityScan } from '@/components/dashboard/VulnerabilityScan';
import { ManualSection } from '@/components/dashboard/ManualSection';
import { ExecutiveRemediationSummary } from '@/components/dashboard/ExecutiveRemediationSummary';
import {
  Globe,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  Activity,
  Server,
  Lock,
  Mail,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  Wifi,
  Radio,
  Zap,
  Search,
  Hash,
  ArrowUpRight,
  GitCommit,
  Network,
  Share2,
  Timer,
  Loader2,
  Flame,
  BookOpen,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import { TestResult, ExternalTestType } from '@/types/tests';

type MainSectionTab = 'remediation' | 'external' | 'internal' | 'security' | 'vulnerabilities' | 'manual';

interface TestModuleDefinition {
  type: ExternalTestType;
  title: string;
  description: string;
  icon: React.ElementType;
}

const MODULES: TestModuleDefinition[] = [
  {
    type: 'dns',
    title: 'DNS Lookup & Authority',
    description: 'Risoluzione record A, AAAA, MX, TXT, NS, SOA',
    icon: Server,
  },
  {
    type: 'propagation',
    title: 'Propagazione DNS Anycast',
    description: 'Verifica latenza e consistenza su 6 resolver globali (Cloudflare, Google, Quad9, OpenDNS)',
    icon: Globe,
  },
  {
    type: 'reverse_dns',
    title: 'Reverse DNS (PTR)',
    description: 'Risoluzione inversa IP verso Hostname e FQDN aziendale',
    icon: Share2,
  },
  {
    type: 'ttfb',
    title: 'Analisi TTFB & Latenza Server',
    description: 'DNS Lookup, TCP Handshake, TLS Handshake e First Byte waterfall',
    icon: Timer,
  },
  {
    type: 'http',
    title: 'Diagnostica HTTP & Security Headers',
    description: 'Header di risposta, HSTS, CSP, X-Frame-Options, Cookie security flags',
    icon: Activity,
  },
  {
    type: 'protocols',
    title: 'Supporto Protocolli Moderni',
    description: 'Verifica compatibilità HTTP/1.1, HTTP/2 (ALPN) e HTTP/3 (QUIC / UDP 443)',
    icon: Zap,
  },
  {
    type: 'ipv6',
    title: 'Connettività IPv6 Dual-Stack',
    description: 'Risoluzione record AAAA e connettività end-to-end IPv6',
    icon: Network,
  },
  {
    type: 'portscan',
    title: 'Port Scanner Sicurezza Rete',
    description: 'Scansione porte pubbliche sensibili (21, 22, 25, 80, 443, 3306, 3389, 8080)',
    icon: Hash,
  },
  {
    type: 'ssl',
    title: 'Catena Certificati SSL / TLS 1.3',
    description: 'Validazione catena x509, scadenza, Subject Alternative Names (SAN), Cipher',
    icon: Lock,
  },
  {
    type: 'rbl',
    title: 'Reputazione IP & RBL Blacklist',
    description: 'Controllo presenza su 15+ blacklist antispam e reputazione (Spamhaus, Barracuda, SORBS)',
    icon: ShieldAlert,
  },
  {
    type: 'traceroute',
    title: 'Traceroute & Routing IP',
    description: 'Tracciamento nodi gateway, latenze intermedie e AS Path',
    icon: GitCommit,
  },
  {
    type: 'whois',
    title: 'Registro WHOIS & Dominio',
    description: 'Registrar, date di registrazione/scadenza, Nameservers e status EPP',
    icon: ArrowUpRight,
  },
];

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<MainSectionTab>('remediation');
  const [target, setTarget] = useState<string>('aiutiamoci.cloud');
  const [searchInput, setSearchInput] = useState<string>('aiutiamoci.cloud');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'suite' | 'remediation'>('suite');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const { results, loading, runTest, runAll } = useExternalTests();

  const activeCount = Object.values(loading).filter(Boolean).length;
  const finishedCount = Object.values(results).filter(
    (r) => r !== null && r.status !== 'running' && r.status !== 'idle'
  ).length;
  const totalTests = MODULES.length;
  const progress = Math.round((finishedCount / totalTests) * 100);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const clean = searchInput.trim().toLowerCase().replace(/^https?:\/\//, '');
      setTarget(clean);
      runAll(clean);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusBadge = (test: TestResult | null, isLoading: boolean) => {
    if (isLoading) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#0284c7]/20 text-[#38bdf8] border border-[#0369a1] animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          IN CORSO
        </span>
      );
    }
    if (!test || test.status === 'idle') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#1e293b] text-[#94a3b8] border border-[#334155]">
          <Play className="w-2.5 h-2.5" />
          IN ATTESA
        </span>
      );
    }
    const s = String(test.status).toLowerCase();
    if (['pass', 'success', 'passed', 'propagated', 'ok'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#064e3b]/80 text-[#34d399] border border-[#059669]">
          <CheckCircle2 className="w-3 h-3" />
          SUPERATO
        </span>
      );
    }
    if (['warning', 'warn', 'attention'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#451a03]/80 text-[#fbbf24] border border-[#b45309]">
          <AlertTriangle className="w-3 h-3" />
          ATTENZIONE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#450a0a]/80 text-[#f87171] border border-[#b91c1c]">
        <XCircle className="w-3 h-3" />
        FALLITO
      </span>
    );
  };

  const navTabs: Array<{ id: MainSectionTab; label: string; sublabel: string; icon: React.ElementType; badge?: string }> = [
    { id: 'remediation', label: 'Riepilogo & Bonifica', sublabel: 'Score, Grafici & Download PDF', icon: BarChart3, badge: 'EXECUTIVE' },
    { id: 'external', label: 'External Diagnostics', sublabel: 'DNS Anycast, TTFB, SSL, Port Scanner', icon: Globe, badge: '12 MODULI' },
    { id: 'internal', label: 'Internal / LAN & WiFi', sublabel: 'Client Speedtest, ARP Subnet Sweep', icon: Wifi, badge: 'CLIENT & LAN' },
    { id: 'security', label: 'Security Audit', sublabel: 'SPF, DKIM, DMARC, Blacklist & Threat Radar', icon: ShieldCheck, badge: 'SCORE 0-100' },
    { id: 'vulnerabilities', label: 'Vulnerability Scanner', sublabel: 'File Esposti, CORS, Clickjacking & CVE', icon: Flame, badge: 'EXPLOIT RADAR' },
    { id: 'manual', label: 'Manuale & Guida Operativa', sublabel: 'Playbook Sistemistico & Conformità NIS2', icon: BookOpen, badge: 'DOCS & PDF' },
  ];

  const activeTabMeta = navTabs.find((t) => t.id === activeSection) || navTabs[0];
  const ActiveIcon = activeTabMeta.icon;

  return (
    <div className="min-h-screen bg-[#07090e] text-[#d1d5db] font-mono selection:bg-[#00f0ff] selection:text-black antialiased pb-12">
      {/* Clean HUD Navigation Bar with Dropdown Selector */}
      <nav className="bg-[#090d16] border-b border-[#192336] px-4 py-2 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-3">
          {/* Module Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="bg-[#0e1628] hover:bg-[#152038] text-white border border-[#24334f] hover:border-[#00f0ff] px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,0,0,0.3)] select-none"
            >
              <div className="p-1 rounded bg-[#131d33] text-[#00f0ff]">
                <ActiveIcon className="w-3.5 h-3.5" />
              </div>
              <div className="text-left flex items-center gap-2">
                <span className="tracking-wide">{activeTabMeta.label}</span>
                {activeTabMeta.badge && (
                  <span className="text-[9px] bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 px-1.5 py-0.2 rounded font-mono font-normal">
                    {activeTabMeta.badge}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-[#94a3b8] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#00f0ff]' : ''}`} />
            </button>

            {/* Dropdown Floating Popover */}
            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 w-80 bg-[#0a0f1c] border border-[#1e2d45] rounded-md shadow-2xl z-50 p-1.5 space-y-1 backdrop-blur-xl">
                <div className="px-2.5 py-1.5 text-[10px] text-[#64748b] font-bold uppercase tracking-wider border-b border-[#172236]">
                  Seleziona Modulo Diagnostico
                </div>
                  {navTabs.map((tab) => {
                    const TabIcon = tab.icon;
                    const isSelected = activeSection === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveSection(tab.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#121e36] text-[#00f0ff] border border-[#00f0ff]/40 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                            : 'text-[#94a3b8] hover:text-white hover:bg-[#0e1628]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <TabIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#00f0ff]' : 'text-[#64748b]'}`} />
                          <div>
                            <div className="text-xs font-bold text-white">{tab.label}</div>
                            <div className="text-[10px] text-[#64748b]">{tab.sublabel}</div>
                          </div>
                        </div>
                        {tab.badge && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                            isSelected ? 'bg-[#00f0ff]/20 text-[#00f0ff]' : 'bg-[#182338] text-[#64748b]'
                          }`}>
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
            )}
          </div>

          {/* Right Indicator: Active Target */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#64748b]">TARGET ATTIVO:</span>
            <span className="text-[#00f0ff] font-mono font-bold bg-[#0e1628] border border-[#1f2d45] px-2.5 py-1 rounded">
              {target}
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-[1720px] mx-auto p-4 space-y-4">
        {/* ========================================================================= */}
        {/* TAB 0: EXECUTIVE SUMMARY & REMEDIATION PLAN */}
        {/* ========================================================================= */}
        {activeSection === 'remediation' && (
          <ExecutiveRemediationSummary target={target} />
        )}

        {/* ========================================================================= */}
        {/* TAB 1: EXTERNAL DIAGNOSTICS */}
        {/* ========================================================================= */}
        {activeSection === 'external' && (
          <div className="space-y-4">
            {/* Prominent Target Search & Controls Box */}
            <div className="bg-[#0b101c] border border-[#1d2b42] rounded-md p-4 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#00f0ff]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Target di Scansione: <span className="text-[#00f0ff] font-mono">{target}</span>
                  </h3>
                </div>
                <p className="text-[11px] text-[#94a3b8]">
                  Digita qualsiasi dominio aziendale o IPv4 e premi Invio o &quot;Esegui Tutti&quot;.
                </p>
              </div>

              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-xl">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-[#6b7280] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Digita dominio o IP (es. cavalli.it, google.com)..."
                    className="w-full bg-[#070a12] border border-[#24334f] focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] text-white text-xs px-3 py-2.5 pl-9 rounded font-mono transition-all outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={activeCount > 0}
                  className="bg-[#00f0ff] hover:bg-[#38bdf8] text-black font-bold text-xs px-5 py-2.5 rounded flex items-center gap-2 shrink-0 transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.25)] whitespace-nowrap"
                >
                  {activeCount > 0 ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{activeCount > 0 ? `ESECUZIONE (${activeCount})...` : 'ESEGUI TUTTI (12)'}</span>
                </button>
              </form>
            </div>

            {/* View Toggle Tabs & Status */}
            <div className="flex items-center justify-between border-b border-[#1c2940] pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('suite')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    viewMode === 'suite'
                      ? 'bg-[#0e1628] text-[#00f0ff] border border-[#00f0ff]/50'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>12 MODULI DIAGNOSTICI ESTERNI</span>
                </button>

                <button
                  onClick={() => setViewMode('remediation')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    viewMode === 'remediation'
                      ? 'bg-[#0e1628] text-[#fde047] border border-[#fde047]/50'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>TACTICAL REMEDIATION & CLI</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[#64748b]">
                  Completati: <span className="text-white font-mono">{finishedCount} / {totalTests} ({progress}%)</span>
                </span>
                <span className="text-[#10b981] font-bold flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  ONLINE
                </span>
              </div>
            </div>

            {/* Mode 1: 12 Interactive Diagnostic Cards */}
            {viewMode === 'suite' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {MODULES.map((mod) => {
                  const testResult = results[mod.type];
                  const isLoading = loading[mod.type];
                  const Icon = mod.icon;

                  return (
                    <div
                      key={mod.type}
                      className={`bg-[#0b101c] border rounded-md p-3.5 shadow-lg flex flex-col justify-between transition-all duration-200 ${
                        isLoading
                          ? 'border-[#0284c7] shadow-[0_0_15px_rgba(2,132,199,0.15)]'
                          : testResult?.status === 'pass'
                          ? 'border-[#1c2940] hover:border-[#059669]/60'
                          : testResult?.status === 'fail'
                          ? 'border-[#1c2940] hover:border-[#dc2626]/60'
                          : 'border-[#1c2940] hover:border-[#2d3f60]'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-[#172236] pb-2.5 mb-2.5">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="p-2 rounded bg-[#0e1628] border border-[#23334f] text-[#00f0ff] shrink-0 mt-0.5">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-white tracking-wide truncate" title={mod.title}>
                              {mod.title}
                            </h3>
                            <p className="text-[11px] text-[#64748b] mt-0.5 line-clamp-1" title={mod.description}>
                              {mod.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {getStatusBadge(testResult, isLoading)}
                          <button
                            onClick={() => runTest(mod.type, target)}
                            disabled={isLoading}
                            title={`Esegui ${mod.title}`}
                            className="p-1.5 bg-[#0e1628] hover:bg-[#1a253d] text-[#94a3b8] hover:text-[#00f0ff] border border-[#23334f] rounded transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isLoading ? (
                              <RefreshCw className="w-3 h-3 animate-spin text-[#00f0ff]" />
                            ) : (
                              <Play className="w-3 h-3 fill-current" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Card Content & Result Body */}
                      <div className="flex-1 min-h-[120px] text-xs">
                        {testResult && testResult.status !== 'idle' ? (
                          <div className="bg-[#070a12] p-2.5 rounded border border-[#141d2e] overflow-x-auto max-h-72">
                            <ResultRenderer testId={mod.type} result={testResult.result} />
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#1a2538] rounded bg-[#080d17]/50 text-[#4b5563]">
                            <Icon className="w-6 h-6 mb-1 text-[#334155]" />
                            <span className="text-[11px]">Nessun dato registrato.</span>
                            <span className="text-[10px] text-[#64748b]">Premi Play per avviare il test.</span>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Info */}
                      {testResult?.timestamp && (
                        <div className="mt-2.5 pt-2 border-t border-[#172236] flex items-center justify-between text-[10px] text-[#64748b]">
                          <span>Timestamp: {new Date(testResult.timestamp).toLocaleTimeString('it-IT')}</span>
                          <span className="text-[#00f0ff]">ID: {mod.type}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mode 2: Tactical Remediation Snippets */}
            {viewMode === 'remediation' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-[#0b101c] border border-[#1d2b42] rounded-md p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1d2b42] pb-2">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-[#00f0ff]" />
                      <h3 className="text-xs font-bold text-white uppercase">Nginx Security Hardening</h3>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `# Nginx Security Configuration per ${target}\nadd_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;\nadd_header X-Content-Type-Options "nosniff" always;\nadd_header X-Frame-Options "DENY" always;\nadd_header X-XSS-Protection "1; mode=block" always;\nadd_header Referrer-Policy "strict-origin-when-cross-origin" always;`,
                          'nginx-all'
                        )
                      }
                      className="text-xs text-[#00f0ff] hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'nginx-all' ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'nginx-all' ? 'Copiato!' : 'Copia Tutto'}</span>
                    </button>
                  </div>

                  <pre className="bg-[#070a12] p-3 rounded border border-[#182338] text-[11px] font-mono text-[#38bdf8] overflow-x-auto">
{`# Nginx Security Configuration per ${target}
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;`}
                  </pre>
                </div>

                <div className="bg-[#0b101c] border border-[#1d2b42] rounded-md p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1d2b42] pb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#a855f7]" />
                      <h3 className="text-xs font-bold text-white uppercase">Mail Authentication DNS Zone</h3>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `; Mail DNS Zone Records per ${target}\n${target}. IN TXT "v=spf1 include:_spf.google.com ~all"\n_dmarc.${target}. IN TXT "v=DMARC1; p=reject; sp=reject; pct=100; rua=mailto:dmarc-reports@${target}; aspf=r;"`,
                          'dns-zone'
                        )
                      }
                      className="text-xs text-[#00f0ff] hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'dns-zone' ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'dns-zone' ? 'Copiato!' : 'Copia Tutto'}</span>
                    </button>
                  </div>

                  <pre className="bg-[#070a12] p-3 rounded border border-[#182338] text-[11px] font-mono text-[#c084fc] overflow-x-auto">
{`; Mail DNS Zone Records per ${target}
${target}. IN TXT "v=spf1 include:_spf.google.com ~all"
_dmarc.${target}. IN TXT "v=DMARC1; p=reject; sp=reject; pct=100; rua=mailto:dmarc-reports@${target}; aspf=r;"`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: INTERNAL / LAN & WIFI */}
        {/* ========================================================================= */}
        {activeSection === 'internal' && (
          <div className="bg-[#090d16] border border-[#1c2940] rounded-md p-4">
            <InternalTests />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SECURITY AUDIT */}
        {/* ========================================================================= */}
        {activeSection === 'security' && (
          <div className="bg-[#090d16] border border-[#1c2940] rounded-md p-4">
            <SecurityAudit />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: VULNERABILITY SCANNER */}
        {/* ========================================================================= */}
        {activeSection === 'vulnerabilities' && (
          <div className="bg-[#090d16] border border-[#1c2940] rounded-md p-4">
            <VulnerabilityScan />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MANUALE & GUIDA */}
        {/* ========================================================================= */}
        {activeSection === 'manual' && (
          <div className="bg-[#090d16] border border-[#1c2940] rounded-md p-4">
            <ManualSection />
          </div>
        )}
      </main>

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        target={target}
        results={results}
      />
    </div>
  );
}
