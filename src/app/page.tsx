'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useExternalTests } from '@/hooks/useExternalTests';
import { useInternalTests } from '@/hooks/useInternalTests';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { useVulnerabilityScan } from '@/hooks/useVulnerabilityScan';
import { ResultRenderer } from '@/components/dashboard/ResultRenderer';
import { ExportReportModal } from '@/components/dashboard/ExportReportModal';
import { InternalTests } from '@/components/dashboard/InternalTests';
import { SecurityAudit } from '@/components/dashboard/SecurityAudit';
import { VulnerabilityScan } from '@/components/dashboard/VulnerabilityScan';
import { ManualSection } from '@/components/dashboard/ManualSection';
import { ExecutiveRemediationSummary } from '@/components/dashboard/ExecutiveRemediationSummary';
import { PentestSection } from '@/components/dashboard/PentestSection';
import { ActiveDefenseModal } from '@/components/dashboard/ActiveDefenseModal';
import { SubdomainHunterCard } from '@/components/dashboard/SubdomainHunterCard';
import {
  Globe,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Server,
  Lock,
  RefreshCw,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  Wifi,
  Zap,
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
  ShieldHalf,
  Crosshair,
} from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import {
  Segmented,
  RowList,
  ExpandableRow,
  StatusPill,
  ActionCard,
  CommandBlock,
  Callout,
} from '@/components/ui/nd';
import { useUiPrefs, UiTheme } from '@/hooks/useUiPrefs';
import { TestResult, ExternalTestType } from '@/types/tests';

type MainSectionTab = 'remediation' | 'external' | 'internal' | 'security' | 'vulnerabilities' | 'pentest' | 'manual';

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
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'warn' | 'pass'>('all');
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
  const internalSuite = useInternalTests();
  const securitySuite = useSecurityAudit();
  const vulnerabilitySuite = useVulnerabilityScan();

  const activeCount = Object.values(loading).filter(Boolean).length;
  const finishedCount = Object.values(results).filter(
    (r) => r !== null && r.status !== 'running' && r.status !== 'idle'
  ).length;
  const totalTests = MODULES.length;
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const clean = searchInput.trim().toLowerCase().replace(/^https?:\/\//, '');
      setTarget(clean);
      runAll(clean);
    }
  };

  const [perspectiveMode, setPerspectiveMode] = useState<'executive' | 'it-pro'>('executive');
  const [showActiveDefenseModal, setShowActiveDefenseModal] = useState<boolean>(false);

  const navTabs: Array<{ id: MainSectionTab; label: string; sublabel: string; icon: React.ElementType; badge?: string }> = [
    { id: 'remediation', label: 'Riepilogo', sublabel: 'Score, Grafici & Download PDF', icon: BarChart3, badge: 'EXECUTIVE' },
    { id: 'external', label: 'Diagnostica esterna', sublabel: 'DNS Anycast, TTFB, SSL, Port Scanner', icon: Globe, badge: '12 MODULI' },
    { id: 'internal', label: 'Rete interna e WiFi', sublabel: 'Client Speedtest, ARP Subnet Sweep', icon: Wifi, badge: 'CLIENT & LAN' },
    { id: 'security', label: 'Audit di sicurezza', sublabel: 'SPF, DKIM, DMARC, Blacklist & Threat Radar', icon: ShieldCheck, badge: 'SCORE 0-100' },
    { id: 'vulnerabilities', label: 'Vulnerabilità', sublabel: 'File Esposti, CORS, Clickjacking & CVE', icon: Flame, badge: 'EXPLOIT RADAR' },
    { id: 'pentest', label: 'Penetration test', sublabel: 'Verifica Empirica Attiva OWASP & Takeover', icon: Crosshair, badge: 'ATTIVO' },
    { id: 'manual', label: 'Manuale operativo', sublabel: 'Playbook Sistemistico & Conformità NIS2', icon: BookOpen, badge: 'DOCS & PDF' },
  ];
  const ui = useUiPrefs();

  const activeTabMeta = navTabs.find((t) => t.id === activeSection) || navTabs[0];

  const navItemCls = (active: boolean) =>
    `flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-[0.875rem] font-medium transition-colors ${
      active ? 'bg-accent-bg text-accent font-semibold' : 'text-ink-2 hover:bg-hover hover:text-foreground'
    }`;
  const showDomainBar = activeSection === 'remediation' || activeSection === 'external' || activeSection === 'pentest' || activeSection === 'security' || activeSection === 'vulnerabilities';

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      {/* Sidebar: un solo livello, sezioni sempre visibili */}
      <aside className="border-b border-border bg-surface lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[232px] lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="px-5 pb-2 pt-5 flex items-center justify-between">
          <div>
            <div className="text-[1.0625rem] font-bold leading-tight">NetworkDiag</div>
            <div className="text-[0.8125rem] text-ink-3">by aiutiamoci</div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-ok-bg px-2 py-0.5 text-[0.75rem] font-medium text-ok" title="Engine diagnostico attivo e verificato">
            <span className="size-1.5 rounded-full bg-ok animate-pulse" aria-hidden="true" />
            <span>Online</span>
          </div>
        </div>

        <nav aria-label="Sezioni" className="flex flex-wrap gap-1 px-3 py-2 lg:flex-col lg:flex-nowrap">
          {navTabs.map((tab) => {
            const TabIcon = tab.icon;
            const isSelected = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isSelected ? 'page' : undefined}
                onClick={() => setActiveSection(tab.id)}
                className={`${navItemCls(isSelected)} w-auto lg:w-full`}
              >
                <TabIcon className="size-4 shrink-0" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {activeSection === 'remediation' && (
          <div className="px-5 pb-2 pt-1">
            <div className="mb-1.5 text-[0.8125rem] text-ink-3">Vista</div>
            <Segmented
              label="Vista del riepilogo"
              value={perspectiveMode}
              onChange={setPerspectiveMode}
              className="w-full"
              options={[
                { value: 'executive', label: 'Direzione' },
                { value: 'it-pro', label: 'IT Pro' },
              ]}
            />
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border px-3 py-4 lg:mt-auto">
          <div className="px-2">
            <div className="mb-1.5 text-[0.8125rem] text-ink-3">Tema</div>
            <Segmented<UiTheme>
              label="Tema dell'interfaccia"
              value={ui.theme}
              onChange={ui.changeTheme}
              className="grid w-full grid-cols-2"
              options={[
                { value: 'light', label: 'Chiaro' },
                { value: 'dark', label: 'Scuro' },
                { value: 'comfort', label: 'Comfort' },
                { value: 'auto', label: 'Automatico' },
              ]}
            />
            <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-[0.875rem] text-ink-2">
              <input
                type="checkbox"
                checked={ui.largeText}
                onChange={(e) => ui.changeLargeText(e.target.checked)}
                className="size-4 accent-[var(--accent)]"
              />
              Testo grande
            </label>
          </div>

          <button type="button" onClick={() => setShowActiveDefenseModal(true)} className={navItemCls(false)}>
            <ShieldHalf className="size-4 shrink-0" aria-hidden="true" />
            Sentinel
          </button>
          <Header />
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:pl-[232px]">
        {/* Barra superiore: un solo campo dominio, un solo pulsante primario */}
        {showDomainBar && (
          <form
            onSubmit={handleSearchSubmit}
            className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6"
          >
            <label htmlFor="domain-input" className="text-[0.8125rem] text-ink-2">Dominio analizzato</label>
            <input
              id="domain-input"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="esempio.it o indirizzo IP"
              spellCheck={false}
              className="min-h-11 w-full max-w-xs flex-1 rounded-md border border-field-border bg-field px-3 font-mono text-[0.875rem] text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            {activeSection === 'external' ? (
              <button
                type="submit"
                disabled={activeCount > 0}
                className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-4 text-[0.875rem] font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
              >
                {activeCount > 0 && <RefreshCw className="size-4 animate-spin" aria-hidden="true" />}
                {activeCount > 0 ? `In esecuzione (${activeCount})…` : `Esegui tutti (${totalTests})`}
              </button>
            ) : (
              <button
                type="submit"
                className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-4 text-[0.875rem] font-semibold text-foreground hover:bg-surface-alt"
              >
                Imposta dominio
              </button>
            )}
          </form>
        )}

      {/* Sentinel */}
      <ActiveDefenseModal
        target={target}
        isOpen={showActiveDefenseModal}
        onClose={() => setShowActiveDefenseModal(false)}
      />

      <main className="mx-auto w-full max-w-[960px] space-y-4 px-4 py-8 sm:px-6">
        {/* ========================================================================= */}
        {/* TAB 0: EXECUTIVE SUMMARY & REMEDIATION PLAN */}
        {/* ========================================================================= */}
        {activeSection === 'remediation' && (
          <ExecutiveRemediationSummary target={target} perspectiveMode={perspectiveMode} />
        )}

        {/* ========================================================================= */}
        {/* TAB 1: EXTERNAL DIAGNOSTICS */}
        {/* ========================================================================= */}
        {activeSection === 'external' && (
          <div className="space-y-4">
            {/* Intestazione Sezione Diagnostica Esterna */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h1 className="text-[1.625rem] font-bold leading-tight text-foreground">
                  {viewMode === 'suite' ? 'Diagnostica esterna' : 'Rimedi e comandi'}
                </h1>
                <p className="mt-1 text-[0.9375rem] text-ink-2">
                  {viewMode === 'suite'
                    ? `${totalTests} moduli completati alle ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}. ${
                        Object.values(results).filter(r => r && (String(r.status) === 'warning' || String(r.status) === 'warn' || r.status === 'fail')).length
                      } richiedono attenzione.`
                    : '6 interventi ordinati per priorità. Sostituire i valori tra parentesi quadre prima di eseguire.'}
                </p>
              </div>

              {/* Controllo segmentato: Diagnostica / Rimedi e comandi */}
              <Segmented<'suite' | 'remediation'>
                label="Modalità diagnostica"
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { value: 'suite', label: 'Diagnostica' },
                  { value: 'remediation', label: 'Rimedi e comandi' },
                ]}
              />
            </div>

            {/* Modalità 1: 12 Moduli come lista di righe espandibili con filtri */}
            {viewMode === 'suite' && (
              <div className="space-y-4">
                {/* Filtri: Tutti / Attenzione / Superati */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterSeverity('all')}
                    className={`min-h-9 px-3 rounded-full text-xs font-semibold border transition-all ${
                      filterSeverity === 'all'
                        ? 'bg-accent-bg text-accent border-accent/40'
                        : 'bg-surface text-ink-2 border-border hover:bg-hover'
                    }`}
                  >
                    Tutti {totalTests}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterSeverity('warn')}
                    className={`min-h-9 px-3 rounded-full text-xs font-semibold border transition-all ${
                      filterSeverity === 'warn'
                        ? 'bg-accent-bg text-accent border-accent/40'
                        : 'bg-surface text-ink-2 border-border hover:bg-hover'
                    }`}
                  >
                    Attenzione {
                      Object.values(results).filter(r => r && (String(r.status) === 'warning' || String(r.status) === 'warn' || r.status === 'fail')).length
                    }
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterSeverity('pass')}
                    className={`min-h-9 px-3 rounded-full text-xs font-semibold border transition-all ${
                      filterSeverity === 'pass'
                        ? 'bg-accent-bg text-accent border-accent/40'
                        : 'bg-surface text-ink-2 border-border hover:bg-hover'
                    }`}
                  >
                    Superati {
                      Object.values(results).filter(r => r && (['pass', 'success', 'passed', 'ok', 'propagated'].includes(String(r.status).toLowerCase()))).length
                    }
                  </button>
                </div>

                {/* Lista ordinata: problemi in cima */}
                <RowList>
                  {MODULES.slice()
                    .sort((a, b) => {
                      const resA = results[a.type]?.status || 'idle';
                      const resB = results[b.type]?.status || 'idle';
                      const isWarnA = ['warn', 'warning', 'fail'].includes(String(resA).toLowerCase());
                      const isWarnB = ['warn', 'warning', 'fail'].includes(String(resB).toLowerCase());
                      if (isWarnA && !isWarnB) return -1;
                      if (!isWarnA && isWarnB) return 1;
                      return 0;
                    })
                    .filter((mod) => {
                      if (filterSeverity === 'all') return true;
                      const status = String(results[mod.type]?.status || '').toLowerCase();
                      if (filterSeverity === 'warn') return ['warn', 'warning', 'fail'].includes(status);
                      if (filterSeverity === 'pass') return ['pass', 'success', 'passed', 'ok', 'propagated'].includes(status);
                      return true;
                    })
                    .map((mod) => {
                      const testResult = results[mod.type];
                      const isLoading = loading[mod.type];
                      const statusStr = String(testResult?.status || 'idle').toLowerCase();
                      const isWarn = ['warning', 'warn', 'attention', 'fail'].includes(statusStr);
                      const isPass = ['pass', 'success', 'passed', 'propagated', 'ok'].includes(statusStr);

                      let pillTone: 'ok' | 'warn' | 'low' | 'pending' = 'pending';
                      let pillLabel = 'In attesa';
                      if (isLoading) {
                        pillTone = 'pending';
                        pillLabel = 'In corso';
                      } else if (isPass) {
                        pillTone = 'ok';
                        pillLabel = 'Superato';
                      } else if (isWarn) {
                        pillTone = 'warn';
                        pillLabel = 'Attenzione';
                      }

                      return (
                        <ExpandableRow
                          key={mod.type}
                          defaultOpen={isWarn}
                          status={<StatusPill tone={pillTone}>{pillLabel}</StatusPill>}
                          title={mod.title}
                          summary={mod.description}
                          value={
                            testResult?.result && typeof testResult.result === 'object' && 'response_time' in testResult.result
                              ? `${(testResult.result as { response_time: number }).response_time} ms`
                              : undefined
                          }
                          action={
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => runTest(mod.type, target)}
                              disabled={isLoading}
                              className="text-xs"
                            >
                              {isLoading ? (
                                <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
                              ) : (
                                <Play className="size-3.5 mr-1" aria-hidden="true" />
                              )}
                              Esegui
                            </Button>
                          }
                        >
                          <div className="space-y-3 pt-2">
                            {testResult && testResult.status !== 'idle' ? (
                              <div className="rounded-md border border-border bg-field p-3 text-xs">
                                <ResultRenderer testId={mod.type} result={testResult.result} />
                              </div>
                            ) : (
                              <p className="text-xs text-ink-3">Nessun dato registrato. Premi &quot;Esegui&quot; per avviare il controllo.</p>
                            )}
                          </div>
                        </ExpandableRow>
                      );
                    })}
                </RowList>
              </div>
            )}

            {/* Modalità 2: Rimedi e comandi (6 schede azione ordinate) */}
            {viewMode === 'remediation' && (
              <div className="space-y-4">
                <ActionCard
                  n={1}
                  title="Attivare il blocco DMARC"
                  why="DMARC è in osservazione (p=none): le email false non vengono fermate. Dopo qualche settimana di report senza anomalie, passare alla quarantena. Modificare il record TXT esistente nel pannello DNS."
                  priority={<StatusPill tone="warn">Priorità media</StatusPill>}
                >
                  <CommandBlock
                    label="Record TXT su _dmarc.aiutiamoci.cloud"
                    command={`v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@${target}`}
                  />
                  <CommandBlock
                    label="Verifica dopo la propagazione"
                    command={`dig +short TXT _dmarc.${target}`}
                  />
                  <Callout tone="warn" title="Attenzione">
                    Controllare prima i report: se un servizio legittimo (newsletter, CRM) non è in SPF, le sue email finiranno in spam.
                  </Callout>
                  <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink-2 cursor-pointer">
                    <input type="checkbox" className="size-4 accent-[var(--accent)]" />
                    Segna come fatto
                  </label>
                </ActionCard>

                <ActionCard
                  n={2}
                  title="Limitare la porta SSH agli IP aziendali"
                  why="Facoltativo: la porta 22 è già protetta da chiave, ma oggi è raggiungibile da tutta Internet."
                  priority={<StatusPill tone="low">Priorità bassa</StatusPill>}
                >
                  <CommandBlock
                    label="Regola firewall UFW"
                    command="sudo ufw allow from 1.2.3.4 to any port 22 proto tcp"
                  />
                  <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink-2 cursor-pointer">
                    <input type="checkbox" className="size-4 accent-[var(--accent)]" />
                    Segna come fatto
                  </label>
                </ActionCard>

                <ActionCard
                  n={3}
                  title="Impostare il record PTR"
                  why={`Nessun record inverso per 80.225.81.150: può penalizzare la posta in uscita.`}
                  priority={<StatusPill tone="low">Priorità bassa</StatusPill>}
                >
                  <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink-2 cursor-pointer">
                    <input type="checkbox" className="size-4 accent-[var(--accent)]" />
                    Segna come fatto
                  </label>
                </ActionCard>

                <ActionCard
                  n={4}
                  title="Aggiungere il record AAAA (IPv6)"
                  why="Il dominio risponde solo su IPv4."
                  priority={<StatusPill tone="low">Priorità bassa</StatusPill>}
                >
                  <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink-2 cursor-pointer">
                    <input type="checkbox" className="size-4 accent-[var(--accent)]" />
                    Segna come fatto
                  </label>
                </ActionCard>

                <ActionCard
                  n={5}
                  title="Aggiungere una Content-Security-Policy"
                  why="Completa l'hardening del web server, che oggi ha già HSTS e X-Frame-Options."
                  priority={<StatusPill tone="low">Priorità bassa</StatusPill>}
                >
                  <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink-2 cursor-pointer">
                    <input type="checkbox" className="size-4 accent-[var(--accent)]" />
                    Segna come fatto
                  </label>
                </ActionCard>

                <ActionCard
                  n={6}
                  title="Valutare un proxy WAF davanti al server"
                  why="Il traffico arriva direttamente all'IP del server, senza protezione da attacchi di sovraccarico."
                  priority={<StatusPill tone="low">Priorità bassa</StatusPill>}
                >
                  <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink-2 cursor-pointer">
                    <input type="checkbox" className="size-4 accent-[var(--accent)]" />
                    Segna come fatto
                  </label>
                </ActionCard>
              </div>
            )}

            {/* Passive Subdomain Recon & Attack Surface */}
            <SubdomainHunterCard target={target} perspectiveMode={perspectiveMode} />
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
        {/* TAB 5: PENETRATION TESTING & EXPLOIT PROBE */}
        {/* ========================================================================= */}
        {activeSection === 'pentest' && (
          <PentestSection target={target} />
        )}

        {/* ========================================================================= */}
        {/* TAB 6: MANUALE & GUIDA */}
        {/* ========================================================================= */}
        {activeSection === 'manual' && (
          <div className="bg-[#090d16] border border-[#1c2940] rounded-md p-4">
            <ManualSection />
          </div>
        )}
      </main>
      </div>

      {/* Export Master Report Modal (All Modules Included) */}
      <ExportReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        target={target}
        results={results}
        internalResults={internalSuite.results}
        securityResults={securitySuite.results}
        vulnerabilityResults={vulnerabilitySuite.results}
      />
    </div>
  );
}
