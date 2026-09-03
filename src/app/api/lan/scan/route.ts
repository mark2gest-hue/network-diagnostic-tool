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

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Autenticazione richiesta per accedere alla diagnostica di rete host' }, { status: 401 });
  }

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
    const ipParts = selfIp.split('.').map(Number);
    const baseSubnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
    const gatewayIp = `${baseSubnet}.1`;

    // 1. Lettura passiva e sicura della tabella ARP (senza scansioni invasive a ventaglio)
    const arpTable = await getArpTable();

    // 2. Controllo porta gateway rapido e non invasivo
    const gwProbe = await probePort(gatewayIp, 80, 200);
    const isGwReachable = gwProbe.open || arpTable.has(gatewayIp);

    const updatedArp = arpTable;

    const devices: DiscoveredDevice[] = [];

    // Aggiungiamo te stesso
    devices.push({
      ip: selfIp,
      mac: primaryInterface.mac || 'N/A',
      role: 'Questo Computer (Host)',
      isGateway: false,
      isSelf: true,
      openPorts: [3000],
      latency: 0
    });

    // Aggiungiamo il Gateway se presente o raggiungibile
    if (updatedArp.has(gatewayIp) || isGwReachable) {
      devices.push({
        ip: gatewayIp,
        mac: updatedArp.get(gatewayIp) || 'N/A',
        role: 'Router / Gateway WiFi',
        isGateway: true,
        isSelf: false,
        openPorts: [80, 443],
        latency: 1
      });
    }

    // Aggiungiamo gli altri dispositivi rilevati in ARP
    updatedArp.forEach((mac, ip) => {
      if (ip !== selfIp && ip !== gatewayIp && ip.startsWith(baseSubnet)) {
        let role = 'Dispositivo Connesso (Smartphone / PC / IoT)';
        if (ip.endsWith('.254') || ip.endsWith('.2')) role = 'Access Point / Ripetitore';
        else if (ip.endsWith('.200') || ip.endsWith('.250')) role = 'Stampante / Smart TV';

        devices.push({
          ip,
          mac,
          role,
          isGateway: false,
          isSelf: false,
          openPorts: [],
          latency: 2
        });
      }
    });

    // Ordina per ultimo byte IP numerico
    devices.sort((a, b) => {
      const lastA = parseInt(a.ip.split('.').pop() || '0', 10);
      const lastB = parseInt(b.ip.split('.').pop() || '0', 10);
      return lastA - lastB;
    });

    return NextResponse.json({
      interface: primaryInterface,
      subnet: `${baseSubnet}.0/24`,
      gatewayIp,
      devicesCount: devices.length,
      devices
    });
  } catch (error) {
    console.error('LAN scan error:', error);
    return NextResponse.json({ error: 'Scansione rete locale fallita' }, { status: 500 });
  }
}
