import dns from 'dns/promises';
import net from 'net';

export interface NormalizedTarget {
  rawInput: string;
  scheme: 'http' | 'https' | null;
  hostname: string;
  port: number;
  pathname: string;
  search: string;
  isIp: boolean;
  ipVersion: 4 | 6 | null;
  resolvedIpv4: string[];
  resolvedIpv6: string[];
  canonicalUrl: string;
}

/**
 * Normalizza e decompone in modo rigoroso l'input dell'utente.
 * Separa protocollo, hostname, porta, path e query string, risolvendo gli IP associati.
 */
export async function normalizeTarget(raw: string): Promise<NormalizedTarget> {
  const trimmed = (raw || '').trim();
  let candidate = trimmed;
  let explicitScheme: 'http' | 'https' | null = null;

  if (/^https?:\/\//i.test(candidate)) {
    explicitScheme = candidate.toLowerCase().startsWith('https://') ? 'https' : 'http';
  } else {
    // Default di analisi a HTTPS se non specificato
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    // Se fallisce il parsing standard dell'URL, prova a estrarre hostname e porta
    const cleanNoProto = trimmed.replace(/^[a-zA-Z]+:\/\//, '');
    const slashIdx = cleanNoProto.indexOf('/');
    const hostPort = slashIdx !== -1 ? cleanNoProto.slice(0, slashIdx) : cleanNoProto;
    const pathPart = slashIdx !== -1 ? cleanNoProto.slice(slashIdx) : '/';
    parsed = new URL(`https://${hostPort}${pathPart}`);
  }

  const hostname = parsed.hostname.toLowerCase();
  const isIp = net.isIP(hostname) !== 0;
  const ipVersion = isIp ? (net.isIPv4(hostname) ? 4 : 6) : null;

  let port = parsed.port ? parseInt(parsed.port, 10) : (explicitScheme === 'http' ? 80 : 443);
  if (isNaN(port) || port <= 0 || port > 65535) {
    port = 443;
  }

  let resolvedIpv4: string[] = [];
  let resolvedIpv6: string[] = [];

  if (isIp) {
    if (ipVersion === 4) resolvedIpv4 = [hostname];
    if (ipVersion === 6) resolvedIpv6 = [hostname];
  } else {
    // Risoluzione DNS sia per IPv4 che per IPv6
    try {
      resolvedIpv4 = await dns.resolve4(hostname);
    } catch {
      resolvedIpv4 = [];
    }
    try {
      resolvedIpv6 = await dns.resolve6(hostname);
    } catch {
      resolvedIpv6 = [];
    }
  }

  const scheme = explicitScheme || 'https';
  const portSuffix = (scheme === 'https' && port === 443) || (scheme === 'http' && port === 80)
    ? ''
    : `:${port}`;
  const canonicalUrl = `${scheme}://${hostname}${portSuffix}${parsed.pathname || '/'}${parsed.search || ''}`;

  return {
    rawInput: trimmed,
    scheme,
    hostname,
    port,
    pathname: parsed.pathname || '/',
    search: parsed.search || '',
    isIp,
    ipVersion,
    resolvedIpv4,
    resolvedIpv6,
    canonicalUrl,
  };
}
