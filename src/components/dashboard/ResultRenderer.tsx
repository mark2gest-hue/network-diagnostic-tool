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
  Cookie
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
                    <Badge variant="outline" className="text-[9px] uppercase bg-red-500/20 border-red-500/50 text-red-300 shrink-0 whitespace-nowrap">
                      {file.risk || 'High'}
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
            return (
              <div 
                key={i} 
                className={cn(
                  'flex items-center justify-between px-2.5 py-1.5 rounded-lg border font-mono transition-all gap-1.5 min-w-0',
                  isOpen 
                    ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300' 
                    : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-500'
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isOpen ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-zinc-600')} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-xs leading-tight">{p.port}</span>
                    <span className="text-[9px] opacity-70 truncate leading-none mt-0.5">{portLabels[p.port] || 'Port'}</span>
                  </div>
                </div>
                <span 
                  className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 whitespace-nowrap',
                    isOpen 
                      ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300' 
                      : 'border border-zinc-800 bg-zinc-900 text-zinc-500'
                  )}
                >
                  {isOpen ? 'Open' : 'Closed'}
                </span>
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
