'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  Server, 
  Lock, 
  Layers, 
  FileCode, 
  CheckCircle2, 
  Cookie,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

interface ResultRendererProps {
  testId?: string;
  result: unknown;
}

interface MxRecord {
  exchange?: string;
  priority?: number;
}

interface ExposedFile {
  path?: string;
  label?: string;
  risk?: string;
  detail?: string;
}

interface CookieItem {
  name: string;
  isHttpOnly: boolean;
  isSecure: boolean;
  sameSite: string;
  issues: string[];
  safe: boolean;
}

interface TracerouteHop {
  hop: number;
  ip: string;
  host: string;
  latency: number;
}

interface ResolverCheck {
  name: string;
  resolverIp?: string;
  location?: string;
  resolvedIps?: string[];
  responseTime?: number;
  status?: string;
}

export function ResultRenderer({ result }: ResultRendererProps) {
  if (!result || typeof result !== 'object') {
    return <span className="text-xs text-zinc-400">{String(result ?? 'Nessun dato')}</span>;
  }

  const data = result as Record<string, unknown>;

  try {
    // 1. DNS Global Propagation
    if ('resolvers' in data && Array.isArray(data.resolvers)) {
      const resolvers = data.resolvers as ResolverCheck[];
      const isPropagated = Boolean(data.isFullyPropagated);

      return (
        <div className="space-y-2.5 text-xs">
          <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
            isPropagated ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block truncate">Propagazione Mondiale</span>
              <span className="font-bold text-xs">{String(data.successCount ?? 0)} / {String(data.totalResolvers ?? resolvers.length)} Resolver</span>
            </div>
            <Badge variant="outline" className={cn('shrink-0 whitespace-nowrap text-[10px]', isPropagated ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40')}>
              {isPropagated ? '100% Sincronizzato' : 'In Corso'}
            </Badge>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {resolvers.map((r, i) => {
              const resolvedList = Array.isArray(r.resolvedIps) ? r.resolvedIps : [];
              return (
                <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-[11px] font-mono">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-zinc-200 truncate" title={`${r.name || 'Resolver'} (${r.location || 'Global'})`}>
                      {r.name || 'Resolver'} <span className="text-[10px] font-normal text-zinc-400">({r.location || 'Global'})</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 truncate" title={resolvedList.length > 0 ? resolvedList.join(', ') : 'Nessuna risposta'}>
                      {resolvedList.length > 0 ? resolvedList.join(', ') : 'Nessuna risposta'}
                    </span>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0 whitespace-nowrap text-[10px] font-mono font-semibold', r.status === 'propagated' ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30' : 'bg-red-950/50 text-red-400 border-red-500/30')}>
                    {r.responseTime ?? 0} ms
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 2. TTFB & Waterfall Latency
    if ('ttfbMs' in data && 'dnsMs' in data) {
      const dns = Number(data.dnsMs) || 0;
      const tcp = Number(data.tcpMs) || 0;
      const tls = Number(data.tlsMs) || 0;
      const ttfb = Number(data.ttfbMs) || 0;
      const total = Number(data.totalMs) || (dns + tcp + tls + ttfb) || 1;

      return (
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block tracking-wide">TTFB Server Time</span>
              <span className="text-xl font-bold font-mono text-cyan-400 leading-none mt-0.5 block">{ttfb} ms</span>
            </div>
            <Badge variant="outline" className="bg-cyan-950/30 border-cyan-500/30 text-cyan-300 font-mono text-xs shrink-0 whitespace-nowrap px-2.5 py-1">
              Totale: {total} ms
            </Badge>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            <div className="flex items-center justify-between gap-2 text-zinc-400">
              <span className="truncate">1. DNS Lookup:</span>
              <span className="text-blue-300 font-semibold shrink-0 whitespace-nowrap">{dns} ms</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-zinc-400">
              <span className="truncate">2. Connessione TCP:</span>
              <span className="text-emerald-300 font-semibold shrink-0 whitespace-nowrap">{tcp} ms</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-zinc-400">
              <span className="truncate">3. Handshake TLS:</span>
              <span className="text-purple-300 font-semibold shrink-0 whitespace-nowrap">{tls} ms</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-zinc-400">
              <span className="truncate">4. Server (TTFB):</span>
              <span className="text-cyan-300 font-semibold shrink-0 whitespace-nowrap">{ttfb} ms</span>
            </div>
          </div>
        </div>
      );
    }

    // 3. HTTP Protocols (HTTP/2, HTTP/3, ALPN)
    if ('supportsH2' in data || 'negotiatedProtocol' in data) {
      const protocols = Array.isArray(data.protocols) ? (data.protocols as string[]) : [];
      const hasH3 = Boolean(data.supportsH3);

      return (
        <div className="space-y-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block tracking-wide">Protocollo Negoziato</span>
              <span className="font-bold font-mono text-zinc-200 uppercase text-xs truncate block">{String(data.negotiatedProtocol || 'http/1.1')}</span>
            </div>
            <Badge variant="outline" className={cn('shrink-0 whitespace-nowrap text-[10px] font-semibold', hasH3 ? 'bg-purple-950/40 text-purple-300 border-purple-500/40' : 'bg-blue-950/40 text-blue-300 border-blue-500/40')}>
              {hasH3 ? 'HTTP/3 Ready' : 'HTTP/2 Active'}
            </Badge>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Protocolli Supportati</span>
            <div className="flex flex-wrap gap-1.5">
              {protocols.map((p, i) => (
                <Badge key={i} variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-300 text-[10px] font-mono whitespace-nowrap">
                  {p}
                </Badge>
              ))}
            </div>
          </div>

          {Boolean(data.cipher) && (
            <div className="text-[10px] font-mono text-zinc-500 truncate pt-1 border-t border-zinc-900" title={String(data.cipher)}>
              Cipher: <span className="text-zinc-400">{String(data.cipher)}</span>
            </div>
          )}
        </div>
      );
    }

    // 4. Reverse DNS (PTR Record)
    if ('hasPtr' in data && ('hostnames' in data || 'ip' in data)) {
      const hostnames = Array.isArray(data.hostnames) ? (data.hostnames as string[]) : [];
      const hasPtr = Boolean(data.hasPtr);

      return (
        <div className="space-y-2.5 text-xs">
          <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
            hasPtr ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block truncate">Record PTR</span>
              <span className="font-bold font-mono text-xs">{hasPtr ? 'Configurato' : 'Mancante'}</span>
            </div>
            <Badge variant="outline" className={cn('shrink-0 whitespace-nowrap text-[10px]', hasPtr ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40')}>
              {hasPtr ? 'PTR OK' : 'No Reverse'}
            </Badge>
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            <span className="text-[10px] text-zinc-500 block">Host Risolto:</span>
            {hostnames.length > 0 ? (
              <div className="space-y-1">
                {hostnames.map((h, i) => (
                  <div key={i} className="bg-zinc-950 p-1.5 rounded border border-zinc-800 text-zinc-200 truncate text-xs" title={h}>
                    {h}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-zinc-500 italic text-xs">Nessun puntatore PTR inverso associato.</div>
            )}
          </div>
        </div>
      );
    }

    // 5. Traceroute Visual Hops Chain
    if ('hops' in data && Array.isArray(data.hops)) {
      const hops = data.hops as TracerouteHop[];
      return (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 text-zinc-400 pb-1 border-b border-zinc-800/50">
            <span className="font-semibold text-zinc-300 text-xs whitespace-nowrap">Tratta ({hops.length} nodi)</span>
            {Boolean(data.target) && (
              <span className="font-mono text-[10px] text-zinc-500 truncate max-w-[140px]" title={String(data.target)}>
                {String(data.target)}
              </span>
            )}
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {hops.map((h, i) => (
              <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 font-mono text-xs">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {h.hop}
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-zinc-200 truncate text-[11px]" title={h.ip}>{h.ip}</span>
                    {h.host && h.host !== h.ip && (
                      <span className="text-[9px] text-zinc-500 truncate" title={h.host}>{h.host}</span>
                    )}
                  </div>
                </div>

                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-[10px] shrink-0 whitespace-nowrap font-mono font-semibold',
                    (h.latency ?? 0) < 20 
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' 
                      : (h.latency ?? 0) < 80 
                      ? 'bg-amber-950/40 text-amber-400 border-amber-500/30' 
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  )}
                >
                  {h.latency ?? 0} ms
                </Badge>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 6. IPv6 & Dual-Stack Connectivity
    if ('isDualStack' in data || 'ipv6Addresses' in data) {
      const isDual = Boolean(data.isDualStack);
      const ipv4List = Array.isArray(data.ipv4Addresses) ? (data.ipv4Addresses as string[]) : [];
      const ipv6List = Array.isArray(data.ipv6Addresses) ? (data.ipv6Addresses as string[]) : [];

      return (
        <div className="space-y-2.5 text-xs">
          <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
            isDual ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block truncate">Stato Protocollo</span>
              <span className="font-bold font-mono text-xs truncate block">{String(data.mode || 'N/A')}</span>
            </div>
            <Badge variant="outline" className={cn('shrink-0 whitespace-nowrap text-[10px]', isDual ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40')}>
              {isDual ? 'Dual-Stack OK' : 'Legacy IPv4'}
            </Badge>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            {ipv4List.length > 0 && (
              <div>
                <span className="text-[10px] text-zinc-500 block mb-1">Indirizzi IPv4 (A):</span>
                <div className="flex flex-wrap gap-1">
                  {ipv4List.map((ip, i) => (
                    <Badge key={i} variant="outline" className="bg-zinc-950 border-zinc-800 text-blue-300 text-[10px] font-mono">
                      {ip}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {ipv6List.length > 0 ? (
              <div>
                <span className="text-[10px] text-zinc-500 block mb-1">Indirizzi IPv6 (AAAA):</span>
                <div className="flex flex-wrap gap-1">
                  {ipv6List.map((ip, i) => (
                    <Badge key={i} variant="outline" className="bg-purple-950/40 border-purple-800 text-purple-300 break-all text-[10px] font-mono">
                      {ip}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-zinc-500 italic pt-1">
                Nessun record IPv6 presente.
              </div>
            )}
          </div>
        </div>
      );
    }

    // 7. Vulnerability: Exposed Sensitive Files
    if ('exposedFiles' in data && Array.isArray(data.exposedFiles)) {
      const exposed = data.exposedFiles as ExposedFile[];
      return (
        <div className="space-y-2.5 text-xs">
          {exposed.length === 0 ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs leading-snug">Nessun file critico esposto (.env, .git, backup).</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <span className="text-[10px] text-red-400 uppercase font-bold tracking-wider block">
                File Rilevati ({exposed.length}):
              </span>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {exposed.map((file, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-red-950/20 border border-red-500/30 font-mono text-xs">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-bold text-red-300 truncate" title={file.path}>{file.path}</span>
                      <span className="text-[10px] text-zinc-400 truncate">{file.detail || file.label}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[8px] bg-red-950/60 text-red-300 border border-red-500/40 px-1 py-0.2 rounded font-mono font-bold" title="MITRE D3FEND: D3-AHA / CWE-538">
                        D3-AHA
                      </span>
                      <Badge variant="outline" className="text-[9px] uppercase bg-red-500/20 border-red-500/50 text-red-300 whitespace-nowrap">
                        {file.risk || 'High'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Boolean(data.recommendation) && (
            <p className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80 leading-relaxed">
              {String(data.recommendation)}
            </p>
          )}
        </div>
      );
    }

    // 7.1 Vulnerability: Frontend Secret Leaks
    if ('detectedSecrets' in data && Array.isArray(data.detectedSecrets)) {
      const secrets = data.detectedSecrets as Array<{
        name: string;
        category: string;
        severity: 'critical' | 'high' | 'medium';
        sourceFile: string;
        matchedMasked: string;
        description: string;
      }>;
      return (
        <div className="space-y-2.5 text-xs">
          {secrets.length === 0 ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs leading-snug">Nessun token o chiave API segreta rilevata nei bundle JS.</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <span className="text-[10px] text-red-400 uppercase font-bold tracking-wider block">
                Segreti Rilevati ({secrets.length}):
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {secrets.map((sec, i) => (
                  <div key={i} className="p-2 rounded-lg bg-red-950/20 border border-red-500/30 font-mono text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-red-300 truncate">{sec.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[8px] bg-red-950/60 text-red-300 border border-red-500/40 px-1 py-0.2 rounded font-mono font-bold">
                          T1552.001
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] uppercase whitespace-nowrap',
                            sec.severity === 'critical'
                              ? 'bg-red-500/30 text-red-200 border-red-500'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          )}
                        >
                          {sec.severity}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span>Origine: {sec.sourceFile}</span>
                      <span className="text-zinc-200 bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">
                        {sec.matchedMasked}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Boolean(data.recommendation) && (
            <p className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80 leading-relaxed">
              {String(data.recommendation)}
            </p>
          )}
        </div>
      );
    }

    // 7.2 Security / Leaks: DeepWeb & Credential Leaks
    if ('combCount' in data || ('breaches' in data && 'sampleLeaks' in data)) {
      const combCount = Number(data.combCount || 0);
      const breaches = Array.isArray(data.breaches) ? data.breaches as Array<{
        title?: string;
        breachDate?: string;
        pwnCount?: number;
        dataClasses?: string[];
      }> : [];
      const sampleLeaks = Array.isArray(data.sampleLeaks) ? data.sampleLeaks as Array<{
        email: string;
        passwordMasked: string;
        source: string;
      }> : [];

      const hasIssues = combCount > 0 || breaches.length > 0;

      return (
        <div className="space-y-2.5 text-xs">
          {!hasIssues ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="space-y-0.5">
                <span className="text-xs font-bold block">Nessun Leak Rilevato nel Dark Web</span>
                <span className="text-[10px] text-emerald-400/80 block">Nessuna credenziale @{String(data.domain || 'target')} esposta in archivi pubblici e COMB (3.2B records).</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-red-950/30 border border-red-500/30 text-red-300">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Esposizione Archivi</span>
                  <span className="font-bold text-xs font-mono">{combCount} Credenziali & {breaches.length} Breach Noti</span>
                </div>
                <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/50 text-[10px] uppercase font-bold">
                  {combCount > 50 ? 'Rischio Critico' : 'Attenzione'}
                </Badge>
              </div>

              {breaches.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Breach Storici Verificati:</span>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {breaches.map((b, i) => (
                      <div key={i} className="p-1.5 rounded bg-zinc-950/70 border border-zinc-800 text-[11px] flex justify-between items-center font-mono">
                        <span className="font-bold text-zinc-200">{b.title} ({b.breachDate?.slice(0, 4) || 'N/A'})</span>
                        <span className="text-[10px] text-zinc-400">{Number(b.pwnCount || 0).toLocaleString()} account</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sampleLeaks.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Campione Account Compromessi (Anonimizzati PII):</span>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1 font-mono text-[11px]">
                    {sampleLeaks.map((leak, i) => (
                      <div key={i} className="p-1.5 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
                        <span className="text-red-300 font-semibold truncate">{leak.email}</span>
                        <span className="text-zinc-500 bg-zinc-900 px-1 rounded text-[10px] border border-zinc-800 shrink-0">{leak.passwordMasked}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {Boolean(data.recommendation) && (
            <p className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80 leading-relaxed">
              💡 {String(data.recommendation)}
            </p>
          )}
        </div>
      );
    }

    // 8. Vulnerability: Cookie Security Flags
    if ('cookies' in data && Array.isArray(data.cookies)) {
      const cookies = data.cookies as CookieItem[];
      return (
        <div className="space-y-2.5 text-xs">
          {cookies.length === 0 ? (
            <div className="text-zinc-400 p-2 rounded bg-zinc-950/40 border border-zinc-800 text-xs">
              Nessun cookie restituito dall&apos;endpoint analizzato.
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {cookies.map((c, i) => (
                <div key={i} className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 font-mono text-xs">
                    <span className="font-bold text-zinc-200 flex items-center gap-1.5 min-w-0 flex-1 truncate" title={c.name}>
                      <Cookie className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <Badge variant="outline" className={cn('text-[9px] shrink-0 whitespace-nowrap', c.safe ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40' : 'bg-amber-950/40 text-amber-400 border-amber-500/40')}>
                      {c.safe ? 'Protetto' : 'Incompleto'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded whitespace-nowrap ${c.isHttpOnly ? 'bg-emerald-950/60 text-emerald-300' : 'bg-red-950/60 text-red-400'}`}>
                      HttpOnly: {c.isHttpOnly ? 'Sì' : 'No'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded whitespace-nowrap ${c.isSecure ? 'bg-emerald-950/60 text-emerald-300' : 'bg-red-950/60 text-red-400'}`}>
                      Secure: {c.isSecure ? 'Sì' : 'No'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 whitespace-nowrap">
                      SameSite: {c.sameSite}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {Boolean(data.recommendation) && (
            <p className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80 leading-relaxed">
              {String(data.recommendation)}
            </p>
          )}
        </div>
      );
    }

    // 8.1 Email Armor & AXFR (MTA-STS / BIMI / Zone Transfer)
    if ('mtaSts' in data && 'axfr' in data) {
      const mtaSts = (data.mtaSts as {
        enabled?: boolean;
        mode?: string;
        record?: string;
        policyValid?: boolean;
      }) || {};
      const bimi = (data.bimi as {
        enabled?: boolean;
        record?: string;
        logoUrl?: string;
        vmcUrl?: string;
        hasVmc?: boolean;
      }) || {};
      const axfr = (data.axfr as {
        protected?: boolean;
        testedNs?: string;
        message?: string;
      }) || {};
      const score = typeof data.score === 'number' ? data.score : 0;

      return (
        <div className="space-y-2.5 text-xs">
          {/* Header Bar */}
          <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block tracking-wide">Punteggio Armor</span>
              <span className="font-bold font-mono text-zinc-200 text-sm leading-none mt-0.5 block">{score} / 100</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[8px] bg-purple-950/60 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded font-mono font-bold" title="MITRE D3FEND: D3-MHA (Mail Server Hardening)">
                D3-MHA
              </span>
              <span className="text-[8px] bg-blue-950/60 text-blue-300 border border-blue-500/40 px-1.5 py-0.5 rounded font-mono font-bold" title="MITRE D3FEND: D3-DNSA (DNS Access Control)">
                D3-DNSA
              </span>
            </div>
          </div>

          {/* 3 Controlli: MTA-STS, BIMI, AXFR */}
          <div className="space-y-1.5">
            {/* MTA-STS */}
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-1">
              <div className="flex items-center justify-between gap-2 font-mono text-xs">
                <span className="font-bold text-zinc-200 truncate">MTA-STS (RFC 8461)</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] shrink-0 whitespace-nowrap',
                    mtaSts.mode === 'enforce'
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                      : mtaSts.mode === 'testing'
                      ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  )}
                >
                  {mtaSts.mode === 'enforce' ? 'Enforce (Attivo)' : mtaSts.mode === 'testing' ? 'Testing Mode' : 'Non Configurato'}
                </Badge>
              </div>
              <div className="text-[10px] text-zinc-500 truncate font-mono">
                {mtaSts.record ? `Record: ${mtaSts.record}` : 'Nessun record _mta-sts trovato'}
                {mtaSts.policyValid ? ' • Policy HTTPS: OK' : ''}
              </div>
            </div>

            {/* BIMI */}
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-1">
              <div className="flex items-center justify-between gap-2 font-mono text-xs">
                <span className="font-bold text-zinc-200 truncate">BIMI Brand Auth</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] shrink-0 whitespace-nowrap',
                    bimi.hasVmc
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                      : bimi.enabled
                      ? 'bg-blue-950/40 text-blue-300 border-blue-500/40'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  )}
                >
                  {bimi.hasVmc ? 'VMC Certificato' : bimi.enabled ? 'Logo Assertito' : 'Non Presente'}
                </Badge>
              </div>
              <div className="text-[10px] text-zinc-500 truncate font-mono">
                {bimi.logoUrl ? `Logo: ${bimi.logoUrl}` : 'Nessun record default._bimi trovato'}
              </div>
            </div>

            {/* DNS Zone Transfer AXFR */}
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-1">
              <div className="flex items-center justify-between gap-2 font-mono text-xs">
                <span className="font-bold text-zinc-200 truncate">AXFR Zone Transfer</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] shrink-0 whitespace-nowrap font-mono',
                    axfr.protected
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                      : 'bg-red-950/40 text-red-300 border-red-500/40'
                  )}
                >
                  {axfr.protected ? 'Protetto' : 'AXFR Aperto (Critico)'}
                </Badge>
              </div>
              <div className="text-[10px] text-zinc-500 truncate font-mono">
                {axfr.testedNs ? `Server: ${axfr.testedNs} • ${axfr.message || ''}` : axfr.message || ''}
              </div>
            </div>
          </div>

          {Boolean(data.recommendation) && (
            <p className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80 leading-relaxed">
              {String(data.recommendation)}
            </p>
          )}
        </div>
      );
    }

    // 8.2 WAF & Origin IP Bypass Scanner
    if ('detectedShields' in data || 'originBypass' in data) {
      const shields = Array.isArray(data.detectedShields)
        ? (data.detectedShields as Array<{ name: string; vendor: string }>)
        : [];
      const hasProtection = Boolean(data.hasProtection);
      const originBypass = (data.originBypass as {
        leakDetected?: boolean;
        leakedHost?: string;
        leakedIp?: string;
        details?: string;
      }) || {};
      const serverHeader = String(data.serverHeader || '');

      return (
        <div className="space-y-2.5 text-xs">
          {/* Header Bar */}
          <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block tracking-wide">Scudo Perimetrale</span>
              <span className="font-bold text-zinc-200 text-xs truncate block">
                {hasProtection ? shields.map(s => s.name).join(', ') : 'Nessun WAF/CDN'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[8px] bg-purple-950/60 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded font-mono font-bold" title="MITRE D3FEND: D3-WAF">
                D3-WAF
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-semibold whitespace-nowrap',
                  hasProtection ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40' : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                )}
              >
                {hasProtection ? 'Protetto' : 'Esposto'}
              </Badge>
            </div>
          </div>

          {/* Origin IP Leak / Bypass Box */}
          <div className={cn(
            'p-2.5 rounded-xl border space-y-1.5',
            originBypass.leakDetected
              ? 'bg-red-950/25 border-red-500/40 text-red-300'
              : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
          )}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-xs flex items-center gap-1.5">
                {originBypass.leakDetected ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>Origin IP Leak Rilevato!</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Origin IP Protetto</span>
                  </>
                )}
              </span>
              <span className="text-[8px] bg-zinc-900 border border-zinc-700 px-1 py-0.5 rounded font-mono text-zinc-300">
                T1590.005
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-300">
              {originBypass.details || 'Nessun bypass individuato.'}
            </p>
            {Boolean(originBypass.leakedIp) && (
              <div className="font-mono text-[10px] bg-zinc-950/80 p-1.5 rounded border border-red-500/30 text-red-200">
                Host: <span className="text-zinc-100">{originBypass.leakedHost}</span> → IP Origine: <span className="font-bold text-red-400">{originBypass.leakedIp}</span>
              </div>
            )}
          </div>

          {/* Server Header */}
          {serverHeader && (
            <div className="text-[10px] text-zinc-500 font-mono truncate px-1">
              Header Server: <span className="text-zinc-400">{serverHeader}</span>
            </div>
          )}

          {Boolean(data.recommendation) && (
            <p className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80 leading-relaxed">
              {String(data.recommendation)}
            </p>
          )}
        </div>
      );
    }

    // 8.3 Deep TLS Cipher & Protocol Matrix
    if ('weakCiphers' in data) {
      const protocols = Array.isArray(data.results)
        ? (data.results as Array<{ version: string; supported: boolean; status: string }>)
        : [];
      const weakCiphers = Array.isArray(data.weakCiphers)
        ? (data.weakCiphers as Array<{ name: string; supported: boolean; status: string }>)
        : [];
      const score = typeof data.score === 'number' ? data.score : 0;
      const hasCaa = Boolean(data.hasCaa);
      const caaCount = Number(data.caaCount) || 0;

      return (
        <div className="space-y-2.5 text-xs">
          {/* Header Bar */}
          <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block tracking-wide">Punteggio Crittografico</span>
              <span className="font-bold font-mono text-zinc-200 text-sm leading-none mt-0.5 block">{score} / 100</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[8px] bg-purple-950/60 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded font-mono font-bold" title="MITRE D3FEND: D3-EPSC">
                D3-EPSC
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-semibold whitespace-nowrap',
                  score >= 80 ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40' : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                )}
              >
                {score >= 80 ? 'TLS Moderno' : 'Revisione Richiesta'}
              </Badge>
            </div>
          </div>

          {/* Matrice Protocolli TLS */}
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Versioni Protocollo</span>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              {protocols.map((p, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-1.5 rounded-lg border flex items-center justify-between',
                    p.supported
                      ? p.status === 'pass'
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-950/30 border-red-500/40 text-red-300'
                      : 'bg-zinc-950/50 border-zinc-800/80 text-zinc-500'
                  )}
                >
                  <span className="font-bold text-[10px]">{p.version}</span>
                  <span className="text-[9px] uppercase font-bold">
                    {p.supported ? (p.status === 'pass' ? 'Attivo' : 'Attivo (Insicuro)') : 'Bloccato'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cifrari Deboli */}
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Cifrari Legacy & Sweet32</span>
            <div className="space-y-1 font-mono text-[11px]">
              {weakCiphers.map((c, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-1.5 rounded-lg border flex items-center justify-between',
                    c.supported
                      ? 'bg-red-950/30 border-red-500/40 text-red-300'
                      : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  )}
                >
                  <span className="text-[10px] truncate">{c.name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[8px] font-bold shrink-0',
                      c.supported
                        ? 'bg-red-500/20 text-red-300 border-red-500/50'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    )}
                  >
                    {c.supported ? 'Vulnerabile' : 'Rifiutato'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Record CAA */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-800 text-[11px] font-mono">
            <span className="text-zinc-400">DNS CAA (RFC 8659):</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[9px]',
                hasCaa ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              )}
            >
              {hasCaa ? `${caaCount} CA Autorizzate` : 'Non Configurato'}
            </Badge>
          </div>

          {Boolean(data.recommendation) && (
            <p className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80 leading-relaxed">
              {String(data.recommendation)}
            </p>
          )}
        </div>
      );
    }

    // 9. DNS Records
    if ('a' in data || 'mx' in data || 'txt' in data) {
      const aRecords = Array.isArray(data.a) ? (data.a as string[]) : [];
      const aaaaRecords = Array.isArray(data.aaaa) ? (data.aaaa as string[]) : [];
      const mxRecords = Array.isArray(data.mx) ? (data.mx as (MxRecord | string)[]) : [];
      const txtRecords = Array.isArray(data.txt) ? (data.txt as (string[] | string)[]) : [];

      return (
        <div className="space-y-3 text-xs">
          {aRecords.length > 0 && (
            <div>
              <span className="font-semibold text-blue-400 flex items-center gap-1.5 mb-1 text-[11px]">
                <Server className="w-3.5 h-3.5 shrink-0" /> Record A (IPv4):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {aRecords.map((ip, i) => (
                  <Badge key={i} variant="outline" className="font-mono bg-blue-950/40 border-blue-800/60 text-blue-300 text-xs px-2 py-0.5 whitespace-nowrap">
                    {ip}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {aaaaRecords.length > 0 && (
            <div>
              <span className="font-semibold text-purple-400 flex items-center gap-1.5 mb-1 text-[11px]">
                <Server className="w-3.5 h-3.5 shrink-0" /> Record AAAA (IPv6):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {aaaaRecords.map((ip, i) => (
                  <Badge key={i} variant="outline" className="font-mono bg-purple-950/40 border-purple-800/60 text-purple-300 text-xs px-2 py-0.5 break-all">
                    {ip}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {mxRecords.length > 0 && (
            <div>
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5 mb-1 text-[11px]">
                <Layers className="w-3.5 h-3.5 shrink-0" /> Mail Exchanger (MX):
              </span>
              <div className="space-y-1">
                {mxRecords.map((m, i) => {
                  const exchange = typeof m === 'object' && m ? m.exchange : String(m);
                  const priority = typeof m === 'object' && m ? m.priority : undefined;
                  return (
                    <div key={i} className="flex items-center justify-between gap-2 font-mono bg-zinc-950/60 px-2.5 py-1.5 rounded border border-zinc-800/80 text-xs">
                      <span className="text-zinc-300 truncate min-w-0 flex-1" title={exchange}>{exchange}</span>
                      {priority !== undefined && (
                        <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap font-mono">prio: {priority}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {txtRecords.length > 0 && (
            <div>
              <span className="font-semibold text-amber-400 flex items-center gap-1.5 mb-1 text-[11px]">
                <FileCode className="w-3.5 h-3.5 shrink-0" /> Record TXT:
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {txtRecords.map((t, i) => {
                  const text = Array.isArray(t) ? t.join(' ') : String(t);
                  return (
                    <div key={i} className="font-mono text-[10px] bg-zinc-950/60 p-1.5 rounded border border-zinc-800/80 text-zinc-400 break-all" title={text}>
                      {text}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    // 10. Port Scanner
    if (Array.isArray(data.ports)) {
      const portLabels: Record<number, string> = {
        80: 'HTTP',
        443: 'HTTPS',
        22: 'SSH',
        21: 'FTP',
        25: 'SMTP',
        3306: 'MySQL',
        5432: 'Postgres',
        8080: 'Web Alt'
      };

      const portsList = data.ports as { port: number; open: boolean }[];

      return (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {portsList.map((p, i) => {
            const isOpen = p.open;
            const isSensitive = [3306, 5432, 21, 25].includes(p.port);
            return (
              <div 
                key={i} 
                className={cn(
                  'flex items-center justify-between px-2.5 py-1.5 rounded-lg border font-mono transition-all gap-1.5 min-w-0',
                  isOpen && isSensitive
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    : isOpen 
                    ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300' 
                    : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-500'
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isOpen && isSensitive ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]' : isOpen ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-zinc-600')} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-xs leading-tight">{p.port}</span>
                    <span className="text-[9px] opacity-70 truncate leading-none mt-0.5">{portLabels[p.port] || 'Port'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isOpen && isSensitive && (
                    <span className="text-[8px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1 py-0.2 rounded font-mono font-bold" title="MITRE D3FEND: D3-NTF (Network Traffic Filtering)">
                      D3-NTF
                    </span>
                  )}
                  <span 
                    className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 whitespace-nowrap',
                      isOpen && isSensitive
                        ? 'border border-rose-500/50 bg-rose-500/20 text-rose-300'
                        : isOpen 
                        ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300' 
                        : 'border border-zinc-800 bg-zinc-900 text-zinc-500'
                    )}
                  >
                    {isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // 11. Ping / Latency
    if ('latency' in data) {
      const latencyNum = typeof data.latency === 'number' ? data.latency : parseInt(String(data.latency), 10);
      const latencyQuality = latencyNum < 50 ? 'Eccellente' : latencyNum < 150 ? 'Buona' : 'Elevata';
      const latencyColor = latencyNum < 50 ? 'text-emerald-400' : latencyNum < 150 ? 'text-amber-400' : 'text-red-400';
      const bgQuality = latencyNum < 50 ? 'bg-emerald-950/30 border-emerald-500/30' : latencyNum < 150 ? 'bg-amber-950/30 border-amber-500/30' : 'bg-red-950/30 border-red-500/30';

      return (
        <div className="space-y-3">
          <div className={`flex items-center justify-between gap-2 p-3 rounded-xl border ${bgQuality}`}>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Tempo di Risposta</span>
              <span className={`text-2xl font-black font-mono tracking-tight leading-none mt-1 block ${latencyColor}`}>
                {String(data.latency)} {String(data.unit || 'ms')}
              </span>
            </div>
            <Badge variant="outline" className={`border-none ${bgQuality} ${latencyColor} font-semibold text-xs shrink-0 whitespace-nowrap`}>
              {latencyQuality}
            </Badge>
          </div>
          {Boolean(data.method) && (
            <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 px-1">
              <span>Metodo diagnostico:</span>
              <span className="font-mono text-zinc-300 shrink-0">{String(data.method)}</span>
            </div>
          )}
        </div>
      );
    }

    // 12. SSL Certificate
    if ('valid_to' in data || 'issuer' in data || 'days_remaining' in data) {
      const isOk = data.is_valid !== false;
      const days = typeof data.days_remaining === 'number' ? data.days_remaining : undefined;

      return (
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Lock className={`w-4 h-4 shrink-0 ${isOk ? 'text-emerald-400' : 'text-red-400'}`} />
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-zinc-200 block truncate text-xs" title={String(data.issuer || '')}>{String(data.issuer || 'Issuer sconosciuto')}</span>
                <span className="text-[10px] text-zinc-500 block truncate" title={String(data.subject || '')}>CN: {String(data.subject || '-')}</span>
              </div>
            </div>
            {days !== undefined && (
              <Badge 
                variant="outline" 
                className={cn(
                  'font-mono text-xs shrink-0 whitespace-nowrap',
                  days > 30 ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400' : 'bg-amber-950/30 border-amber-500/40 text-amber-400'
                )}
              >
                {days} gg
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 font-mono">
            <div className="bg-zinc-950/40 p-2 rounded border border-zinc-900 min-w-0">
              <span className="text-zinc-600 block text-[9px] uppercase">Valido Da</span>
              <span className="truncate block text-zinc-300">{Boolean(data.valid_from) ? new Date(String(data.valid_from)).toLocaleDateString() : '-'}</span>
            </div>
            <div className="bg-zinc-950/40 p-2 rounded border border-zinc-900 min-w-0">
              <span className="text-zinc-600 block text-[9px] uppercase">Scadenza</span>
              <span className="truncate block text-zinc-300">{Boolean(data.valid_to) ? new Date(String(data.valid_to)).toLocaleDateString() : '-'}</span>
            </div>
          </div>
        </div>
      );
    }

    // 13. WHOIS
    if ('registrar' in data || 'nameservers' in data) {
      const nsList = Array.isArray(data.nameservers) ? (data.nameservers as string[]) : [];

      return (
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <span className="text-zinc-400 shrink-0">Registrar:</span>
            <span className="font-semibold text-zinc-200 truncate min-w-0 flex-1 text-right" title={String(data.registrar || 'N/A')}>{String(data.registrar || 'N/A')}</span>
          </div>
          {Boolean(data.expiry && data.expiry !== 'Unknown') && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-950/60 border border-zinc-800">
              <span className="text-zinc-400 flex items-center gap-1 shrink-0"><Clock className="w-3.5 h-3.5" /> Scadenza:</span>
              <span className="font-mono text-zinc-300 shrink-0 whitespace-nowrap">{String(data.expiry)}</span>
            </div>
          )}
          {nsList.length > 0 && (
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Name Servers</span>
              <div className="space-y-1">
                {nsList.map((ns, i) => (
                  <div key={i} className="font-mono text-[11px] bg-zinc-950/40 px-2 py-1 rounded border border-zinc-900 text-blue-400 truncate" title={ns}>
                    {ns}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // 14. HTTP Status & Headers
    if ('status' in data && 'responseTime' in data) {
      const statusCode = Number(data.status) || 200;
      const isOk = statusCode >= 200 && statusCode < 400;
      const statusText = String(data.statusText || (isOk ? 'OK' : 'Error'));
      const responseTime = Number(data.responseTime) || 0;

      return (
        <div className="space-y-2.5 text-xs">
          <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
            isOk ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-red-950/30 border-red-500/30 text-red-300'
          }`}>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block truncate">Status Code</span>
              <span className="font-bold font-mono text-sm">{statusCode} {statusText}</span>
            </div>
            <Badge variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-300 font-mono text-[10px] shrink-0 whitespace-nowrap">
              {responseTime} ms
            </Badge>
          </div>
        </div>
      );
    }

    // 15. Open Risky Ports & Admin Exposure
    if ('openRiskyPorts' in data && Array.isArray(data.openRiskyPorts)) {
      const ports = data.openRiskyPorts as Array<{
        port: number;
        name: string;
        risk: string;
        recommendation: string;
      }>;
      const hasRisks = ports.length > 0;

      return (
        <div className="space-y-2.5 text-xs">
          {!hasRisks ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs leading-snug">Tutte le porte critiche (22, 3306, 5432, 21, 3389) risultano chiuse o protette.</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block">
                Porte a Rischio Aperte ({ports.length}):
              </span>
              <div className="space-y-1.5">
                {ports.map((p, i) => (
                  <div key={i} className="p-2 rounded-lg bg-amber-950/20 border border-amber-500/30 font-mono text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                        <span className="font-bold text-zinc-200">Porta {p.port} ({p.name})</span>
                      </div>
                      <Badge variant="outline" className={cn(
                        'text-[9px] uppercase font-bold',
                        p.risk === 'critical' ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      )}>
                        {p.risk}
                      </Badge>
                    </div>
                    {p.recommendation && (
                      <p className="text-[10px] text-zinc-400 font-sans leading-relaxed pt-0.5">
                        {p.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // 16. Admin Panel Exposure
    if ('exposedPaths' in data && Array.isArray(data.exposedPaths)) {
      const paths = data.exposedPaths as Array<{ path: string; status: string }>;
      const hasExposed = paths.length > 0;

      return (
        <div className="space-y-2.5 text-xs">
          {!hasExposed ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs leading-snug">Nessun pannello amministrativo (/admin, /wp-admin, /phpmyadmin) esposto pubblicamente.</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">
                  Percorsi Raggiungibili ({paths.length}):
                </span>
                <span className="text-[8px] bg-amber-950/60 text-amber-300 border border-amber-500/40 px-1 py-0.5 rounded font-mono font-bold">
                  D3-URIF
                </span>
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                {paths.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-800">
                    <span className="font-bold text-zinc-300">{p.path}</span>
                    <Badge variant="outline" className="text-[9px] bg-amber-950/40 text-amber-300 border-amber-500/40 font-mono">
                      HTTP 200 OK
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Boolean(data.recommendation) && (
            <p className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80 leading-relaxed">
              {String(data.recommendation)}
            </p>
          )}
        </div>
      );
    }

    // 17. HTTP Security Headers
    if ('audit' in data && Array.isArray(data.audit) && data.audit.length > 0 && typeof data.audit[0] === 'object' && 'header' in data.audit[0]) {
      const headers = data.audit as Array<{
        header: string;
        present: boolean;
        value: string;
        status: string;
        impact?: string;
      }>;
      const presentCount = headers.filter(h => h.present).length;

      return (
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Copertura Intestazioni</span>
            <Badge variant="outline" className={cn(
              'text-[10px] font-mono font-bold',
              presentCount === headers.length ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40' : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
            )}>
              {presentCount} / {headers.length} Attive
            </Badge>
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            {headers.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-950/40 border border-zinc-900 gap-2">
                <span className={cn('truncate text-[10px]', h.present ? 'text-zinc-200' : 'text-zinc-500')} title={h.header}>
                  {h.header}
                </span>
                <Badge variant="outline" className={cn(
                  'text-[8px] uppercase font-bold shrink-0',
                  h.present ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                )}>
                  {h.present ? 'Presente' : 'Assente'}
                </Badge>
              </div>
            ))}
          </div>

          {Boolean(data.recommendation) && (
            <p className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80 leading-relaxed">
              {String(data.recommendation)}
            </p>
          )}
        </div>
      );
    }

    // 18. DMARC Policy
    if ('policy' in data && 'record' in data && typeof data.record === 'string' && data.record.includes('v=DMARC1')) {
      const policy = String(data.policy || 'none');
      const record = String(data.record || '');

      return (
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Policy Enforcement</span>
              <span className="font-bold font-mono text-zinc-200 text-xs">p={policy}</span>
            </div>
            <Badge variant="outline" className={cn(
              'text-[10px] font-bold uppercase',
              policy === 'reject' || policy === 'quarantine' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40' : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
            )}>
              {policy === 'quarantine' ? 'Quarantena (Attiva)' : policy === 'reject' ? 'Rigetto Totale' : 'Monitoraggio (None)'}
            </Badge>
          </div>

          <div className="space-y-1 font-mono text-[10px]">
            <span className="text-zinc-500 block">Record DNS Pubblicato:</span>
            <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800 text-zinc-300 break-all leading-relaxed">
              {record}
            </div>
          </div>

          {Boolean(data.recommendation) && (
            <p className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80 leading-relaxed">
              {String(data.recommendation)}
            </p>
          )}
        </div>
      );
    }

    // 19. SPF Policy
    if ('record' in data && typeof data.record === 'string' && data.record.includes('v=spf1')) {
      const record = String(data.record || '');
      const isStrict = record.includes('-all');

      return (
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Meccanismo SPF</span>
              <span className="font-bold font-mono text-zinc-200 text-xs">{isStrict ? 'HardFail (-all)' : 'SoftFail (~all)'}</span>
            </div>
            <Badge variant="outline" className="bg-emerald-950/40 text-emerald-300 border-emerald-500/40 text-[10px] font-bold">
              Configurato
            </Badge>
          </div>

          <div className="space-y-1 font-mono text-[10px]">
            <span className="text-zinc-500 block">Record TXT:</span>
            <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800 text-zinc-300 break-all leading-relaxed">
              {record}
            </div>
          </div>

          {Boolean(data.recommendation) && (
            <p className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80 leading-relaxed">
              {String(data.recommendation)}
            </p>
          )}
        </div>
      );
    }

    // 20. DKIM Selectors
    if ('selectors' in data || ('message' in data && typeof data.message === 'string' && data.message.includes('DKIM'))) {
      const selectors = Array.isArray(data.selectors) ? (data.selectors as Array<{ selector: string; found: boolean; record: string }>) : [];
      const hasActive = selectors.length > 0;

      return (
        <div className="space-y-2.5 text-xs">
          {!hasActive ? (
            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 space-y-1">
              <span className="font-bold block text-xs">Nessun selettore standard individuato</span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                I selettori comuni (google, default, k1, smtp) non sono stati trovati su `_domainkey`. Se usi una chiave con selettore personalizzato, la firma è attiva ma non rilevabile automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 font-mono text-[11px]">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Selettori Rilevati ({selectors.length}):</span>
              {selectors.map((s, i) => (
                <div key={i} className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200">{s.selector}._domainkey</span>
                    <Badge variant="outline" className="bg-emerald-950/40 text-emerald-300 border-emerald-500/40 text-[9px]">
                      Attivo
                    </Badge>
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">{s.record}</div>
                </div>
              ))}
            </div>
          )}

          {Boolean(data.recommendation) && (
            <p className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80 leading-relaxed">
              {String(data.recommendation)}
            </p>
          )}
        </div>
      );
    }

    // 21. DNSSEC Validation
    if ('message' in data && typeof data.message === 'string' && data.message.includes('DNSSEC')) {
      const isEnabled = data.status === 'pass';

      return (
        <div className="space-y-2.5 text-xs">
          <div className={cn(
            'p-2.5 rounded-xl border flex items-center justify-between gap-2',
            isEnabled ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
          )}>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Firma Crittografica Zona</span>
              <span className="font-bold text-xs">{isEnabled ? 'DNSSEC Abilitato' : 'DNSSEC Non Rilevato'}</span>
            </div>
            <Badge variant="outline" className={cn(
              'text-[10px] font-bold',
              isEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            )}>
              {isEnabled ? 'Protetto' : 'Disabilitato'}
            </Badge>
          </div>

          {Boolean(data.recommendation) && (
            <p className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80 leading-relaxed">
              {String(data.recommendation)}
            </p>
          )}
        </div>
      );
    }

    // 22. Network Integrity & Path MTU Discovery
    if ('dnsSecurity' in data && 'mtu' in data) {
      const dnsSec = data.dnsSecurity as {
        isHijacked: boolean;
        localIps?: string[];
        authoritativeIps?: string[];
        assessment?: string;
      };
      const mtu = data.mtu as {
        standardMtu: number;
        recommendation: string;
        mss: number;
      };

      return (
        <div className="space-y-2.5 text-xs">
          <div className={cn(
            'p-2.5 rounded-xl border flex items-center justify-between gap-2',
            !dnsSec.isHijacked ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-red-950/30 border-red-500/40 text-red-300'
          )}>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Integrità Risoluzione DNS</span>
              <span className="font-bold text-xs">{!dnsSec.isHijacked ? 'DNS Autentico (Nessun Hijack)' : 'Attenzione: Discrepanza DNS!'}</span>
            </div>
            <Badge variant="outline" className={cn(
              'text-[10px] font-bold',
              !dnsSec.isHijacked ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-red-500/20 text-red-300 border-red-500/50'
            )}>
              {!dnsSec.isHijacked ? 'Coerente' : 'Possibile Proxy'}
            </Badge>
          </div>

          <div className="p-2 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between items-center text-zinc-400">
              <span>Path MTU Standard:</span>
              <span className="text-cyan-300 font-bold">{mtu.standardMtu} Byte</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400">
              <span>TCP MSS (Segmento Max):</span>
              <span className="text-indigo-300 font-bold">{mtu.mss} Byte</span>
            </div>
            <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-900">
              {mtu.recommendation}
            </div>
          </div>

          {Boolean(dnsSec.assessment) && (
            <p className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80 leading-relaxed">
              💡 {dnsSec.assessment}
            </p>
          )}
        </div>
      );
    }
  } catch (err) {
    console.error('ResultRenderer error:', err);
  }

  // Fallback formattato pulito
  return (
    <div className="space-y-1 text-xs">
      {Object.entries(data).map(([k, v], i) => (
        <div key={i} className="flex justify-between items-center gap-2 py-1 border-b border-zinc-800/50 last:border-none">
          <span className="text-zinc-500 capitalize shrink-0 text-[11px]">{k.replace(/_/g, ' ')}:</span>
          <span className="font-mono text-zinc-300 truncate min-w-0 text-right text-[11px]" title={typeof v === 'object' ? JSON.stringify(v) : String(v)}>
            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}
