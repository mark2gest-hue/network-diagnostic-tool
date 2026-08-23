'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
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

interface ShieldItem {
  name: string;
  vendor: string;
}

export function ResultRenderer({ result }: ResultRendererProps) {
  if (!result || typeof result !== 'object') {
    return <span className="text-xs text-zinc-400">{String(result ?? 'Nessun dato')}</span>;
  }

  const data = result as Record<string, unknown>;

  // 1. Vulnerability: Exposed Sensitive Files
  if ('exposedFiles' in data && Array.isArray(data.exposedFiles)) {
    const exposed = data.exposedFiles as ExposedFile[];
    return (
      <div className="space-y-2.5 text-xs">
        {exposed.length === 0 ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Nessun file critico esposto (.env, .git, backup).</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <span className="text-[10px] text-red-400 uppercase font-bold tracking-wider block">
              File Rilevati ({exposed.length}):
            </span>
            {exposed.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-red-950/20 border border-red-500/30 font-mono">
                <div className="flex flex-col">
                  <span className="font-bold text-red-300">{file.path}</span>
                  <span className="text-[10px] text-zinc-400">{file.detail || file.label}</span>
                </div>
                <Badge variant="outline" className="text-[9px] uppercase bg-red-500/20 border-red-500/50 text-red-300">
                  {file.risk || 'High'}
                </Badge>
              </div>
            ))}
          </div>
        )}
        {Boolean(data.recommendation) && (
          <p className="text-[11px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80">
            {String(data.recommendation)}
          </p>
        )}
      </div>
    );
  }

  // 2. Vulnerability: Cookie Security Flags
  if ('cookies' in data && Array.isArray(data.cookies)) {
    const cookies = data.cookies as CookieItem[];
    return (
      <div className="space-y-2.5 text-xs">
        {cookies.length === 0 ? (
          <div className="text-zinc-400 p-2 rounded bg-zinc-950/40 border border-zinc-800">
            Nessun cookie restituito dall&apos;endpoint analizzato.
          </div>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {cookies.map((c, i) => (
              <div key={i} className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                    <Cookie className="w-3.5 h-3.5 text-amber-400" />
                    {c.name}
                  </span>
                  <Badge variant="outline" className={c.safe ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40 text-[9px]' : 'bg-amber-950/40 text-amber-400 border-amber-500/40 text-[9px]'}>
                    {c.safe ? 'Protetto' : 'Incompleto'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 text-[10px]">
                  <span className={`px-1.5 py-0.5 rounded ${c.isHttpOnly ? 'bg-emerald-950/60 text-emerald-300' : 'bg-red-950/60 text-red-400'}`}>
                    HttpOnly: {c.isHttpOnly ? 'Sì' : 'No'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded ${c.isSecure ? 'bg-emerald-950/60 text-emerald-300' : 'bg-red-950/60 text-red-400'}`}>
                    Secure: {c.isSecure ? 'Sì' : 'No'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400">
                    SameSite: {c.sameSite}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {Boolean(data.recommendation) && (
          <p className="text-[11px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/80">
            {String(data.recommendation)}
          </p>
        )}
      </div>
    );
  }

  // 3. Vulnerability: WAF & Shield Detection
  if ('detectedShields' in data && Array.isArray(data.detectedShields)) {
    const shields = data.detectedShields as ShieldItem[];
    return (
      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
          <span className="text-zinc-400">Protezione WAF:</span>
          {shields.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {shields.map((s, i) => (
                <Badge key={i} variant="outline" className="bg-purple-950/40 border-purple-500/40 text-purple-300">
                  {s.name}
                </Badge>
              ))}
            </div>
          ) : (
            <Badge variant="outline" className="bg-amber-950/40 border-amber-500/40 text-amber-400">
              Nessun WAF Rilevato
            </Badge>
          )}
        </div>
        {Boolean(data.serverHeader) && (
          <div className="flex justify-between text-[11px] text-zinc-400 font-mono px-1">
            <span>Server Banner:</span>
            <span className="text-zinc-300">{String(data.serverHeader)}</span>
          </div>
        )}
      </div>
    );
  }

  // 4. Vulnerability: CORS Audit
  if ('allowOrigin' in data || 'riskLevel' in data) {
    return (
      <div className="space-y-2 text-xs font-mono">
        <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800 space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-500">Allow-Origin:</span>
            <span className="text-zinc-200">{String(data.allowOrigin)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Allow-Credentials:</span>
            <span className="text-zinc-200">{String(data.allowCredentials)}</span>
          </div>
        </div>
        {Boolean(data.message) && (
          <p className="text-[11px] font-sans text-zinc-300 leading-relaxed">
            {String(data.message)}
          </p>
        )}
      </div>
    );
  }

  // 5. DNS Records
  if ('a' in data || 'mx' in data || 'txt' in data) {
    const aRecords = Array.isArray(data.a) ? (data.a as string[]) : [];
    const aaaaRecords = Array.isArray(data.aaaa) ? (data.aaaa as string[]) : [];
    const mxRecords = Array.isArray(data.mx) ? (data.mx as (MxRecord | string)[]) : [];
    const txtRecords = Array.isArray(data.txt) ? (data.txt as (string[] | string)[]) : [];

    return (
      <div className="space-y-3 text-xs">
        {aRecords.length > 0 && (
          <div>
            <span className="font-semibold text-blue-400 flex items-center gap-1.5 mb-1.5">
              <Server className="w-3.5 h-3.5" /> Record A (IPv4):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {aRecords.map((ip, i) => (
                <Badge key={i} variant="outline" className="font-mono bg-blue-950/40 border-blue-800/60 text-blue-300">
                  {ip}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {aaaaRecords.length > 0 && (
          <div>
            <span className="font-semibold text-purple-400 flex items-center gap-1.5 mb-1.5">
              <Server className="w-3.5 h-3.5" /> Record AAAA (IPv6):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {aaaaRecords.map((ip, i) => (
                <Badge key={i} variant="outline" className="font-mono bg-purple-950/40 border-purple-800/60 text-purple-300">
                  {ip}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {mxRecords.length > 0 && (
          <div>
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5 mb-1.5">
              <Layers className="w-3.5 h-3.5" /> Mail Exchanger (MX):
            </span>
            <div className="space-y-1">
              {mxRecords.map((m, i) => {
                const exchange = typeof m === 'object' && m ? m.exchange : String(m);
                const priority = typeof m === 'object' && m ? m.priority : undefined;
                return (
                  <div key={i} className="flex items-center justify-between font-mono bg-zinc-950/60 px-2.5 py-1.5 rounded border border-zinc-800/80">
                    <span className="text-zinc-300 truncate">{exchange}</span>
                    {priority !== undefined && (
                      <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">prio: {priority}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {txtRecords.length > 0 && (
          <div>
            <span className="font-semibold text-amber-400 flex items-center gap-1.5 mb-1.5">
              <FileCode className="w-3.5 h-3.5" /> Record TXT:
            </span>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {txtRecords.map((t, i) => {
                const text = Array.isArray(t) ? t.join(' ') : String(t);
                return (
                  <div key={i} className="font-mono text-[11px] bg-zinc-950/60 p-1.5 rounded border border-zinc-800/80 text-zinc-400 break-all">
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

  // 6. Port Scanner
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {portsList.map((p, i) => {
          const isOpen = p.open;
          return (
            <div 
              key={i} 
              className={`flex items-center justify-between p-2 rounded-lg border font-mono transition-all ${
                isOpen 
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                  : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-500'
              }`}
            >
              <div className="flex flex-col">
                <span className="font-bold">{p.port}</span>
                <span className="text-[10px] opacity-70">{portLabels[p.port] || 'Port'}</span>
              </div>
              <Badge 
                variant="outline" 
                className={`text-[9px] px-1.5 py-0 h-4 uppercase ${
                  isOpen 
                    ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300' 
                    : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                }`}
              >
                {isOpen ? 'Open' : 'Closed'}
              </Badge>
            </div>
          );
        })}
      </div>
    );
  }

  // 7. Ping / Latency
  if ('latency' in data) {
    const latencyNum = typeof data.latency === 'number' ? data.latency : parseInt(String(data.latency), 10);
    const latencyQuality = latencyNum < 50 ? 'Eccellente' : latencyNum < 150 ? 'Buona' : 'Elevata';
    const latencyColor = latencyNum < 50 ? 'text-emerald-400' : latencyNum < 150 ? 'text-amber-400' : 'text-red-400';
    const bgQuality = latencyNum < 50 ? 'bg-emerald-950/30 border-emerald-500/30' : latencyNum < 150 ? 'bg-amber-950/30 border-amber-500/30' : 'bg-red-950/30 border-red-500/30';

    return (
      <div className="space-y-3">
        <div className={`flex items-center justify-between p-3 rounded-xl border ${bgQuality}`}>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Tempo di Risposta</span>
            <span className={`text-2xl font-black font-mono tracking-tight ${latencyColor}`}>
              {String(data.latency)} {String(data.unit || 'ms')}
            </span>
          </div>
          <Badge variant="outline" className={`border-none ${bgQuality} ${latencyColor} font-semibold text-xs`}>
            {latencyQuality}
          </Badge>
        </div>
        {Boolean(data.method) && (
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span>Metodo diagnostico:</span>
            <span className="font-mono text-zinc-300">{String(data.method)}</span>
          </div>
        )}
      </div>
    );
  }

  // 8. SSL Certificate
  if ('valid_to' in data || 'issuer' in data || 'days_remaining' in data) {
    const isOk = data.is_valid !== false;
    const days = typeof data.days_remaining === 'number' ? data.days_remaining : undefined;

    return (
      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Lock className={`w-4 h-4 ${isOk ? 'text-emerald-400' : 'text-red-400'}`} />
            <div>
              <span className="font-semibold text-zinc-200 block">{String(data.issuer || 'Issuer sconosciuto')}</span>
              <span className="text-[10px] text-zinc-500">CN: {String(data.subject || '-')}</span>
            </div>
          </div>
          {days !== undefined && (
            <Badge 
              variant="outline" 
              className={`font-mono text-xs ${
                days > 30 ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400' : 'bg-amber-950/30 border-amber-500/40 text-amber-400'
              }`}
            >
              {days} giorni residui
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 font-mono">
          <div className="bg-zinc-950/40 p-2 rounded border border-zinc-900">
            <span className="text-zinc-600 block text-[9px] uppercase">Valido Da</span>
            <span className="truncate block">{Boolean(data.valid_from) ? new Date(String(data.valid_from)).toLocaleDateString() : '-'}</span>
          </div>
          <div className="bg-zinc-950/40 p-2 rounded border border-zinc-900">
            <span className="text-zinc-600 block text-[9px] uppercase">Scadenza</span>
            <span className="truncate block">{Boolean(data.valid_to) ? new Date(String(data.valid_to)).toLocaleDateString() : '-'}</span>
          </div>
        </div>
      </div>
    );
  }

  // 9. WHOIS
  if ('registrar' in data || 'nameservers' in data) {
    const nsList = Array.isArray(data.nameservers) ? (data.nameservers as string[]) : [];

    return (
      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-800">
          <span className="text-zinc-400">Registrar:</span>
          <span className="font-semibold text-zinc-200 truncate max-w-[180px]">{String(data.registrar || 'N/A')}</span>
        </div>
        {Boolean(data.expiry && data.expiry !== 'Unknown') && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <span className="text-zinc-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Scadenza:</span>
            <span className="font-mono text-zinc-300">{String(data.expiry)}</span>
          </div>
        )}
        {nsList.length > 0 && (
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Name Servers</span>
            <div className="space-y-1">
              {nsList.map((ns, i) => (
                <div key={i} className="font-mono text-[11px] bg-zinc-950/40 px-2 py-1 rounded border border-zinc-900 text-blue-400">
                  {ns}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 10. Public IP / ISP
  if ('ip' in data && ('city' in data || 'org' in data)) {
    return (
      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
          <span className="text-zinc-400">IP Pubblico:</span>
          <span className="text-sm font-bold font-mono text-emerald-400">{String(data.ip)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-zinc-300">
          <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800">
            <span className="text-[9px] text-zinc-500 uppercase block">Località</span>
            <span className="font-medium truncate block">{String(data.city || '-')}, {String(data.country || '-')}</span>
          </div>
          <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800">
            <span className="text-[9px] text-zinc-500 uppercase block">Provider / ASN</span>
            <span className="font-medium truncate block">{String(data.org || data.asn || '-')}</span>
          </div>
        </div>
      </div>
    );
  }

  // 11. General Security Check Fallback
  if ('message' in data || 'recommendation' in data) {
    return (
      <div className="space-y-2 text-xs">
        {Boolean(data.message) && (
          <p className="text-zinc-300 leading-relaxed font-medium bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800/80">
            {String(data.message)}
          </p>
        )}
        {Boolean(data.recommendation) && (
          <div className="text-[11px] text-zinc-400 bg-blue-950/20 border border-blue-800/30 p-2 rounded">
            <span className="text-blue-400 font-semibold block mb-0.5">Suggerimento:</span>
            {String(data.recommendation)}
          </div>
        )}
      </div>
    );
  }

  // Fallback formattato pulito
  return (
    <div className="space-y-1 text-xs">
      {Object.entries(data).map(([k, v], i) => (
        <div key={i} className="flex justify-between items-center py-1 border-b border-zinc-800/50 last:border-none">
          <span className="text-zinc-500 capitalize">{k.replace(/_/g, ' ')}:</span>
          <span className="font-mono text-zinc-300 truncate max-w-[200px]">
            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}
