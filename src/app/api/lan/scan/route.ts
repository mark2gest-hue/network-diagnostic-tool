import { NextResponse } from 'next/server';
import os from 'os';
import net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';

import { getSession } from '@/lib/auth';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

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

// Controllo non invasivo singolo host/porta con timeout breve
function probePort(ip: string, port: number, timeout = 300): Promise<{ open: boolean; latency: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(timeout);

    socket.connect(port, ip, () => {
      const latency = Date.now() - start;
      socket.destroy();
      resolve({ open: true, latency });
    });

    socket.on('error', () => {
      socket.destroy();
      resolve({ open: false, latency: 0 });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ open: false, latency: 0 });
    });
  });
}

// Lettura passiva e parsing della tabella ARP già presente nel sistema operativo
async function getArpTable(): Promise<Map<string, string>> {
  const arpMap = new Map<string, string>();
  try {
    const { stdout } = await execAsync('arp -a');
    const lines = stdout.split('\n');

    for (const line of lines) {
      const ipMatch = line.match(/\(?((?:[0-9]{1,3}\.){3}[0-9]{1,3})\)?/);
      const macMatch = line.match(/((?:[0-9a-fA-F]{1,2}[:-]){5}[0-9a-fA-F]{1,2})/);

      if (ipMatch && macMatch) {
        const ip = ipMatch[1];
        const mac = macMatch[1].toUpperCase();
        if (mac !== 'FF:FF:FF:FF:FF:FF' && !ip.startsWith('224.') && !ip.startsWith('239.') && !ip.endsWith('.255')) {
          arpMap.set(ip, mac);
        }
      }
    }
  } catch {
    // ARP command non disponibile o ambiente restrittivo
  }
  return arpMap;
}

// Gateway di default reale dalla tabella di routing del sistema (macOS / Linux)
async function getDefaultGateway(): Promise<string | null> {
  try {
    if (process.platform === 'darwin') {
      const { stdout } = await execAsync('route -n get default');
      return stdout.match(/gateway:\s*((?:[0-9]{1,3}\.){3}[0-9]{1,3})/)?.[1] ?? null;
    }
    if (process.platform === 'linux') {
      const { stdout } = await execAsync('ip route show default');
      return stdout.match(/default via ((?:[0-9]{1,3}\.){3}[0-9]{1,3})/)?.[1] ?? null;
    }
  } catch {
    // comando non disponibile: gateway non rilevabile
  }
  return null;
}

const ipToInt = (ip: string) => ip.split('.').reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;

export async function GET() {
  // In modalità locale o audit sul campo la scansione ARP/LAN legge l'interfaccia di rete host attiva
  try {
    const interfaces = os.networkInterfaces();
    let primaryInterface: { name: string; ip: string; netmask: string; mac: string } | null = null;

    // Trova l'interfaccia attiva
    for (const [name, netList] of Object.entries(interfaces)) {
      if (!netList) continue;
      for (const iface of netList) {
        if (!iface.internal && iface.family === 'IPv4' && iface.address !== '127.0.0.1') {
          primaryInterface = {
            name,
            ip: iface.address,
            netmask: iface.netmask,
            mac: iface.mac.toUpperCase()
          };
          if (name.includes('en0') || name.includes('wlan') || name.includes('eth0') || name.includes('Wi-Fi')) {
            break;
          }
        }
      }
      if (primaryInterface && (primaryInterface.name.includes('en0') || primaryInterface.name.includes('wlan') || primaryInterface.name.includes('eth0'))) {
        break;
      }
    }

    if (!primaryInterface) {
      return NextResponse.json({
        error: 'Nessuna interfaccia di rete attiva rilevata sull\'ambiente host.'
      }, { status: 404 });
    }

    const selfIp = primaryInterface.ip;
    const maskInt = ipToInt(primaryInterface.netmask);
    const cidr = primaryInterface.netmask.split('.').reduce((n, o) => n + Number(o).toString(2).replace(/0/g, '').length, 0);
    const networkInt = (ipToInt(selfIp) & maskInt) >>> 0;
    const inSubnet = (ip: string) => ((ipToInt(ip) & maskInt) >>> 0) === networkInt;
    const networkAddr = [24, 16, 8, 0].map((s) => (networkInt >>> s) & 255).join('.');

    const gatewayIp = await getDefaultGateway();

    // 1. Lettura passiva e sicura della tabella ARP (senza scansioni invasive a ventaglio)
    const arpTable = await getArpTable();

    // 2. Probe reale (porte 80/443) solo sul gateway rilevato
    const gwOpenPorts: number[] = [];
    let gwLatency: number | undefined;
    if (gatewayIp) {
      for (const port of [80, 443]) {
        const probe = await probePort(gatewayIp, port, 300);
        if (probe.open) {
          gwOpenPorts.push(port);
          gwLatency = gwLatency === undefined ? probe.latency : Math.min(gwLatency, probe.latency);
        }
      }
    }

    const devices: DiscoveredDevice[] = [];

    devices.push({
      ip: selfIp,
      mac: primaryInterface.mac || 'N/A',
      role: 'Questo Computer (Host)',
      isGateway: false,
      isSelf: true,
      openPorts: [],
    });

    if (gatewayIp && gatewayIp !== selfIp) {
      devices.push({
        ip: gatewayIp,
        mac: arpTable.get(gatewayIp) || 'N/A',
        role: 'Gateway di default (tabella di routing)',
        isGateway: true,
        isSelf: false,
        openPorts: gwOpenPorts,
        latency: gwLatency,
      });
    }

    // Altri host presenti in tabella ARP nella stessa subnet (ruolo non determinabile senza fingerprinting)
    arpTable.forEach((mac, ip) => {
      if (ip !== selfIp && ip !== gatewayIp && inSubnet(ip)) {
        devices.push({
          ip,
          mac,
          role: 'Host in tabella ARP (ruolo non determinato)',
          isGateway: false,
          isSelf: false,
          openPorts: [],
        });
      }
    });

    // Ordina per indirizzo IP numerico
    devices.sort((a, b) => ipToInt(a.ip) - ipToInt(b.ip));

    return NextResponse.json({
      interface: primaryInterface,
      subnet: `${networkAddr}/${cidr}`,
      gatewayIp: gatewayIp ?? 'non rilevato',
      devicesCount: devices.length,
      devices
    });
  } catch (error) {
    console.error('LAN scan error:', error);
    return NextResponse.json({ error: 'Scansione rete locale fallita' }, { status: 500 });
  }
}
