import { NextResponse } from 'next/server';
import os from 'os';
import net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';

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

// Controllo rapido socket su una porta per rilevare host attivo
function probePort(ip: string, port: number, timeout = 350): Promise<{ open: boolean; latency: number }> {
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

// Lettura e parsing della tabella ARP del sistema operativo (Mac/Linux/Windows)
async function getArpTable(): Promise<Map<string, string>> {
  const arpMap = new Map<string, string>();
  try {
    const { stdout } = await execAsync('arp -a');
    const lines = stdout.split('\n');

    for (const line of lines) {
      // Regex per estrarre IP e MAC: match di (192.168.1.1) at 00:11:22:33:44:55
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
    // ARP command non disponibile o errore non bloccante
  }
  return arpMap;
}

export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    let primaryInterface: { name: string; ip: string; netmask: string; mac: string } | null = null;

    // Trova l'interfaccia WiFi o LAN attiva (esclude localhost e IPv6)
    for (const [name, netList] of Object.entries(interfaces)) {
      if (!netList) continue;
      for (const iface of netList) {
        if (!iface.internal && iface.family === 'IPv4' && iface.address !== '127.0.0.1') {
          // Preferisci en0/wlan0/eth0/Wi-Fi
          primaryInterface = {
            name,
            ip: iface.address,
            netmask: iface.netmask,
            mac: iface.mac.toUpperCase()
          };
          if (name.includes('en0') || name.includes('wlan') || name.includes('Wi-Fi')) {
            break;
          }
        }
      }
      if (primaryInterface && (primaryInterface.name.includes('en0') || primaryInterface.name.includes('wlan'))) {
        break;
      }
    }

    if (!primaryInterface) {
      return NextResponse.json({
        error: 'Nessuna interfaccia di rete attiva rilevata.'
      }, { status: 404 });
    }

    const selfIp = primaryInterface.ip;
    const ipParts = selfIp.split('.').map(Number);
    const baseSubnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
    const gatewayIp = `${baseSubnet}.1`; // Gateway comune su subnet domestiche /24

    // 1. Leggiamo la tabella ARP
    const arpTable = await getArpTable();

    // 2. Eseguiamo una scansione rapida a ventaglio sulle prime 30 e principali porte/IP della subnet
    const commonIps: string[] = [gatewayIp];
    for (let i = 1; i <= 40; i++) {
      commonIps.push(`${baseSubnet}.${i}`);
    }
    // Aggiungi IP già presenti in ARP o vicini
    arpTable.forEach((_, ip) => {
      if (!commonIps.includes(ip) && ip.startsWith(baseSubnet)) {
        commonIps.push(ip);
      }
    });

    const probePorts = [80, 443, 22, 53, 8080, 5353];
    const activeIps = new Set<string>([selfIp]);

    // Scansione parallela non invasiva
    await Promise.allSettled(
      commonIps.map(async (targetIp) => {
        if (targetIp === selfIp) return;
        for (const port of probePorts) {
          const res = await probePort(targetIp, port, 250);
          if (res.open) {
            activeIps.add(targetIp);
            break;
          }
        }
      })
    );

    // Rileggi ARP dopo aver popolato la cache di rete
    const updatedArp = await getArpTable();

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

    // Aggiungiamo il Gateway se trovato o presente
    if (updatedArp.has(gatewayIp) || activeIps.has(gatewayIp)) {
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
