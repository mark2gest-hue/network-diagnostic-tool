'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  Search, 
  ExternalLink
} from 'lucide-react';
import { RowList, ExpandableRow, StatusPill } from '@/components/ui/nd';

interface DiscoveredDevice {
  ip: string;
  mac: string;
  role: string;
  vendor?: string;
  latency?: number;
  openPorts: number[];
  isGateway: boolean;
  isSelf: boolean;
}

interface LanScanData {
  interface: {
    name: string;
    ip: string;
    netmask: string;
    mac: string;
  };
  subnet: string;
  gatewayIp: string;
  devicesCount: number;
  devices: DiscoveredDevice[];
}

export function LanScanner() {
  const [data, setData] = useState<LanScanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runScan = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/lan/scan');
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Scansione fallita');
      } else {
        setData(json);
      }
    } catch {
      setError('Impossibile contattare il server diagnostico');
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = () => {
    if (!data || !data.devices.length) return;
    const headers = ['IP', 'MAC Address', 'Ruolo', 'Gateway', 'Dispositivo Locale', 'Porte Aperte', 'Latenza (ms)'];
    const rows = data.devices.map(d => [
      d.ip,
      d.mac,
      `"${d.role}"`,
      d.isGateway ? 'SI' : 'NO',
      d.isSelf ? 'SI' : 'NO',
      `"${d.openPorts.join(', ') || 'Nessuna'}"`,
      d.latency ?? 0
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wifi_lan_devices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Scanner Control Banner */}
      <div className="rounded-lg border border-border bg-surface p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground">
            Dispositivi su LAN, WiFi e cavo Ethernet
          </h3>
          <p className="text-xs text-ink-2 mt-0.5">
            Rileva l&apos;interfaccia host, il Gateway e legge la tabella ARP di sistema (IP, MAC, produttore).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data && data.devices.length > 0 && (
            <Button
              onClick={exportToCsv}
              variant="outline"
              className="text-xs"
            >
              Esporta CSV
            </Button>
          )}
          <Button
            onClick={runScan}
            disabled={loading}
            className="text-xs"
          >
            {loading ? (
              <>
                <RefreshCw className="size-3.5 mr-2 animate-spin" aria-hidden="true" />
                Scansione in corso...
              </>
            ) : (
              <>
                <Search className="size-3.5 mr-2" aria-hidden="true" />
                {data ? 'Ripeti scansione' : 'Avvia scansione'}
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md border border-warn-border bg-warn-bg text-warn-strong text-xs font-mono">
          {error}
        </div>
      )}

      {/* Network Interface Specs */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-md border border-border bg-field space-y-0.5">
            <span className="text-[10px] text-ink-3 uppercase font-semibold block">Scheda WiFi</span>
            <span className="text-xs font-mono font-bold text-foreground truncate block">
              {data.interface.name} ({data.interface.mac})
            </span>
          </div>

          <div className="p-3 rounded-md border border-border bg-field space-y-0.5">
            <span className="text-[10px] text-ink-3 uppercase font-semibold block">Tuo IP Locale</span>
            <span className="text-xs font-mono font-bold text-foreground truncate block">
              {data.interface.ip}
            </span>
          </div>

          <div className="p-3 rounded-md border border-border bg-field space-y-0.5">
            <span className="text-[10px] text-ink-3 uppercase font-semibold block">Router / Gateway</span>
            <span className="text-xs font-mono font-bold text-foreground truncate block">
              {data.gatewayIp}
            </span>
          </div>

          <div className="p-3 rounded-md border border-border bg-field space-y-0.5">
            <span className="text-[10px] text-ink-3 uppercase font-semibold block">Subnet & Host</span>
            <span className="text-xs font-mono font-bold text-foreground truncate block">
              {data.subnet} ({data.devicesCount} trovati)
            </span>
          </div>
        </div>
      )}

      {/* Discovered Devices Table */}
      {data && data.devices.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-ink-2 uppercase tracking-wider">
            Dispositivi connessi rilevati ({data.devices.length})
          </h4>
          <RowList>
            {data.devices.map((dev, idx) => {
              const hasWebInterface = dev.openPorts.includes(80) || dev.openPorts.includes(443) || dev.isGateway;

              return (
                <ExpandableRow
                  key={idx}
                  status={
                    <StatusPill tone={dev.isGateway ? 'warn' : dev.isSelf ? 'ok' : 'low'}>
                      {dev.isGateway ? 'Router' : dev.isSelf ? 'Tuo host' : 'Dispositivo'}
                    </StatusPill>
                  }
                  title={dev.ip}
                  summary={dev.role}
                  value={dev.mac}
                  action={
                    hasWebInterface ? (
                      <a
                        href={`http://${dev.ip}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-field hover:bg-hover text-foreground text-xs border border-field-border"
                      >
                        Web UI
                        <ExternalLink className="size-3" />
                      </a>
                    ) : undefined
                  }
                >
                  <div className="text-xs space-y-1 font-mono text-ink-2">
                    <p>• Porte aperte: {dev.openPorts.join(', ') || 'Nessuna porta standard aperta'}</p>
                    <p>• Latenza stimata: {dev.latency ?? 0} ms</p>
                  </div>
                </ExpandableRow>
              );
            })}
          </RowList>
        </div>
      )}
    </div>
  );
}
