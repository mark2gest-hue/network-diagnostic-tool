'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  Router, 
  Laptop, 
  Smartphone, 
  RefreshCw, 
  Search, 
  Radio, 
  Network, 
  Server,
  ExternalLink
} from 'lucide-react';

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
      setError('Impossibile comunicare con il motore di scansione locale');
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

  const getDeviceIcon = (device: DiscoveredDevice) => {
    if (device.isGateway) return Router;
    if (device.isSelf) return Laptop;
    if (device.role.includes('Access Point') || device.role.includes('Ripetitore')) return Radio;
    if (device.role.includes('Server') || device.role.includes('NAS')) return Server;
    return Smartphone;
  };

  return (
    <div className="space-y-6">
      {/* Scanner Control Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <Wifi className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Scansione Rete Locale (LAN / WiFi & Cavo Ethernet)
            </h3>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Rileva l&apos;interfaccia di rete host attiva, l&apos;IP locale, il Gateway e legge la tabella ARP di sistema per mappare i nodi noti (richiede account autenticato).
          </p>
        </div>

        <div className="flex gap-2">
          {data && data.devices.length > 0 && (
            <Button
              onClick={exportToCsv}
              variant="outline"
              className="border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 font-semibold px-4 py-5 rounded-xl transition-all shrink-0 text-xs"
            >
              Esporta CSV
            </Button>
          )}
          <Button
            onClick={runScan}
            disabled={loading}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold px-5 py-5 rounded-xl shadow-lg shadow-emerald-600/20 border border-emerald-400/20 transition-all shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Scansione Subnet...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                {data ? 'Ripeti Scansione Rete' : 'Avvia Scansione Rete'}
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Network Interface Specs */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in">
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Scheda WiFi</span>
            <span className="text-sm font-bold font-mono text-emerald-400 truncate block">
              {data.interface.name} ({data.interface.mac})
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Tuo IP Locale</span>
            <span className="text-sm font-bold font-mono text-blue-400 truncate block">
              {data.interface.ip}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Router / Gateway</span>
            <span className="text-sm font-bold font-mono text-purple-400 truncate block">
              {data.gatewayIp}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Subnet & Host</span>
            <span className="text-sm font-bold font-mono text-zinc-200 truncate block">
              {data.subnet} ({data.devicesCount} trovati)
            </span>
          </div>
        </div>
      )}

      {/* Discovered Devices Table */}
      {data && data.devices.length > 0 && (
        <div className="glass-panel rounded-2xl border border-zinc-800/80 overflow-hidden shadow-xl animate-in fade-in">
          <div className="p-4 bg-zinc-900/50 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Dispositivi Connessi Rilevati ({data.devices.length})
              </span>
            </div>
            <Badge variant="outline" className="bg-emerald-950/40 text-emerald-400 border-emerald-500/40 text-[10px] font-mono">
              ARP Table Live
            </Badge>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {data.devices.map((dev, idx) => {
              const DeviceIcon = getDeviceIcon(dev);
              const hasWebInterface = dev.openPorts.includes(80) || dev.openPorts.includes(443) || dev.isGateway;

              return (
                <div 
                  key={idx} 
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    dev.isSelf 
                      ? 'bg-blue-950/15 hover:bg-blue-950/25' 
                      : dev.isGateway 
                      ? 'bg-purple-950/15 hover:bg-purple-950/25' 
                      : 'hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${
                      dev.isSelf 
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' 
                        : dev.isGateway 
                        ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' 
                        : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/50'
                    }`}>
                      <DeviceIcon className="w-5 h-5" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-zinc-100">{dev.ip}</span>
                        {dev.isSelf && (
                          <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0">TU</Badge>
                        )}
                        {dev.isGateway && (
                          <Badge className="bg-purple-600 text-white text-[9px] px-1.5 py-0">ROUTER</Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">{dev.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 justify-between sm:justify-end">
                    <div className="flex flex-col sm:items-end">
                      <span className="text-[10px] text-zinc-500 uppercase">MAC Address</span>
                      <span className="text-zinc-300">{dev.mac}</span>
                    </div>

                    {hasWebInterface && (
                      <a
                        href={`http://${dev.ip}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 text-[11px] border border-zinc-700 transition-colors"
                        title="Apri interfaccia web del dispositivo"
                      >
                        Web UI
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
