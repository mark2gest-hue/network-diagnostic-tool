import dns from 'dns/promises';
import net from 'net';

/**
 * Verifica se un indirizzo IPv4 o IPv6 appartiene a range privati, riservati o di metadati cloud (Prevenzione SSRF).
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  if (!net.isIP(ip)) {
    return false;
  }

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }

    const [a, b, c, d] = parts;

    // 0.0.0.0/8 - Current network
    if (a === 0) return true;

    // 127.0.0.0/8 - Loopback
    if (a === 127) return true;

    // 10.0.0.0/8 - Private RFC 1918
    if (a === 10) return true;

    // 172.16.0.0/12 - Private RFC 1918 (172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 - Private RFC 1918
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 - Link-local / Cloud Metadata (169.254.169.254 AWS, GCP, Azure, etc.)
    if (a === 169 && b === 254) return true;

    // 100.64.0.0/10 - Carrier-grade NAT (100.64.0.0 - 100.127.255.255)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 192.0.0.0/24 - IETF Protocol Assignments
    if (a === 192 && b === 0 && c === 0) return true;

    // 192.0.2.0/24 - TEST-NET-1 (Documentation)
    if (a === 192 && b === 0 && c === 2) return true;

    // 198.51.100.0/24 - TEST-NET-2
    if (a === 198 && b === 51 && c === 100) return true;

    // 203.0.113.0/24 - TEST-NET-3
    if (a === 203 && b === 0 && c === 113) return true;

    // 224.0.0.0/4 - Multicast (224.0.0.0 - 239.255.255.255)
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 - Reserved for future use / Broadcast
    if (a >= 240) return true;

    // 255.255.255.255 - Broadcast
    if (a === 255 && b === 255 && c === 255 && d === 255) return true;

    return false;
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();

    // Loopback & Unspecified (comprese forme estese 0:0:0:0:0:0:0:1 e ::1)
    if (
      normalized === '::1' ||
      normalized === '::' ||
      normalized === '0:0:0:0:0:0:0:1' ||
      normalized === '0:0:0:0:0:0:0:0'
    ) {
      return true;
    }

    // IPv4-mapped IPv6 (forme standard ed estese)
    if (normalized.includes('ffff:')) {
      const parts = normalized.split('ffff:');
      const lastPart = parts[parts.length - 1];
      if (net.isIPv4(lastPart)) {
        return isPrivateOrReservedIP(lastPart);
      }
      // Hex format (es. 7f00:1 o a9fe:a9fe)
      const hexMatch = lastPart.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
      if (hexMatch) {
        const p1 = parseInt(hexMatch[1], 16);
        const p2 = parseInt(hexMatch[2], 16);
        const b1 = (p1 >> 8) & 0xff;
        const b2 = p1 & 0xff;
        const b3 = (p2 >> 8) & 0xff;
        const b4 = p2 & 0xff;
        return isPrivateOrReservedIP(`${b1}.${b2}.${b3}.${b4}`);
      }
    }

    // Unique Local Addresses (fc00::/7 -> fc00 to fdff)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    // Link-Local Unicast (fe80::/10)
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
    // Multicast (ff00::/8)
    if (normalized.startsWith('ff')) return true;
  }

  return false;
}

/**
 * Verifica se un dominio punta a hostname interni o riservati.
 */
export function isInternalHostname(domain: string): boolean {
  const normalized = domain.toLowerCase().trim();
  const internalSuffixes = [
    '.local',
    '.localhost',
    '.internal',
    '.lan',
    '.home.arpa',
    '.corp',
    '.intranet',
    '.test',
    '.example',
    '.invalid',
  ];

  if (normalized === 'localhost' || normalized === 'metadata.google.internal') {
    return true;
  }

  return internalSuffixes.some((suffix) => normalized.endsWith(suffix));
}

export interface TargetValidationResult {
  isValid: boolean;
  isPublic: boolean;
  target: string;
  resolvedIps: string[];
  error?: string;
}

/**
 * Modalità locale sul campo: permette di diagnosticare server, router, NAS e IP privati
 * dei clienti (192.168.x.x, 10.x.x.x, localhost, .local) SOLO se abilitata esplicitamente.
 * Sicurezza fail-closed: disattivata di default in produzione.
 */
export const ALLOW_LOCAL_DIAGNOSTICS = process.env.ALLOW_LOCAL_DIAGNOSTICS?.toLowerCase() === 'true';

/**
 * Valida un target (IP o Dominio) verificando che esista e sia sintatticamente corretto.
 * Se ALLOW_LOCAL_DIAGNOSTICS è attivo (default), consente liberamente IP privati, apparati di rete e localhost.
 */
export async function validateExternalTarget(rawTarget: string): Promise<TargetValidationResult> {
  const target = rawTarget.trim();

  if (!target) {
    return {
      isValid: false,
      isPublic: false,
      target,
      resolvedIps: [],
      error: 'Il target non può essere vuoto.',
    };
  }

  // Se siamo in modalità diagnostica locale (sul campo da clienti), permettiamo host interni e IP privati
  if (ALLOW_LOCAL_DIAGNOSTICS) {
    if (net.isIP(target)) {
      return {
        isValid: true,
        isPublic: !isPrivateOrReservedIP(target),
        target,
        resolvedIps: [target],
      };
    }

    if (target.toLowerCase() === 'localhost' || target.toLowerCase().endsWith('.local') || target.toLowerCase().endsWith('.lan')) {
      return {
        isValid: true,
        isPublic: false,
        target,
        resolvedIps: target.toLowerCase() === 'localhost' ? ['127.0.0.1'] : [],
      };
    }
  }

  // Controllo se è un hostname interno esplicito (solo se non consentito)
  if (!ALLOW_LOCAL_DIAGNOSTICS && isInternalHostname(target)) {
    return {
      isValid: false,
      isPublic: false,
      target,
      resolvedIps: [],
      error: `Accesso bloccato per sicurezza (SSRF): "${target}" è un host riservato o locale.`,
    };
  }

  // Se è già un IP letterale
  if (net.isIP(target)) {
    if (!ALLOW_LOCAL_DIAGNOSTICS && isPrivateOrReservedIP(target)) {
      return {
        isValid: false,
        isPublic: false,
        target,
        resolvedIps: [target],
        error: `Accesso bloccato per sicurezza (SSRF): L'indirizzo IP ${target} appartiene a un range privato o riservato (RFC 1918).`,
      };
    }
    return {
      isValid: true,
      isPublic: !isPrivateOrReservedIP(target),
      target,
      resolvedIps: [target],
    };
  }

  // Risoluzione DNS con controllo anti-SSRF su tutti gli IP restituiti
  try {
    const resolvedIps: string[] = [];
    try {
      const v4 = await dns.resolve4(target);
      resolvedIps.push(...v4);
    } catch {
      // Ignora se non ha record A
    }

    try {
      const v6 = await dns.resolve6(target);
      resolvedIps.push(...v6);
    } catch {
      // Ignora se non ha record AAAA
    }

    if (resolvedIps.length === 0) {
      return {
        isValid: false,
        isPublic: false,
        target,
        resolvedIps: [],
        error: `Impossibile risolvere il dominio "${target}" tramite DNS pubblico.`,
      };
    }

    // Controlla se almeno uno degli IP risolti è privato (SSRF / DNS Rebinding attack)
    for (const ip of resolvedIps) {
      if (isPrivateOrReservedIP(ip)) {
        return {
          isValid: false,
          isPublic: false,
          target,
          resolvedIps,
          error: `Accesso bloccato per sicurezza (SSRF / DNS Rebinding): Il dominio "${target}" risolve verso l'IP privato ${ip}.`,
        };
      }
    }

    return {
      isValid: true,
      isPublic: true,
      target,
      resolvedIps,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      isPublic: false,
      target,
      resolvedIps: [],
      error: `Errore durante la risoluzione del dominio: ${errMsg}`,
    };
  }
}
