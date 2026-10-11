import dns from 'dns/promises';

/**
 * Risolve record DNS interrogando prioritariamente i Nameserver Autoritativi del dominio.
 * In caso di fallimento o timeout, effettua fallback su resolver Anycast veloci (Cloudflare 1.1.1.1)
 * e successivamente sul resolver di sistema, eliminando i ritardi da cache TTL locale.
 */
export async function resolveAuthoritativeTxt(domain: string, recordQuery: string): Promise<string[][]> {
  try {
    const nsList = await dns.resolveNs(domain);
    if (nsList && nsList.length > 0) {
      const nsIps = await dns.resolve4(nsList[0]).catch(() => []);
      if (nsIps.length > 0) {
        const authResolver = new dns.Resolver({ timeout: 2500, tries: 1 });
        authResolver.setServers(nsIps);
        const res = await authResolver.resolveTxt(recordQuery);
        if (res && res.length > 0) {
          return res;
        }
      }
    }
  } catch {
    // Prosegui al fallback Anycast
  }

  // Fallback 1: Cloudflare Anycast (1.1.1.1) con aggiornamento istantaneo
  try {
    const cfResolver = new dns.Resolver({ timeout: 2500, tries: 1 });
    cfResolver.setServers(['1.1.1.1', '1.0.0.1']);
    return await cfResolver.resolveTxt(recordQuery);
  } catch {
    // Fallback 2: Resolver di sistema
    return await dns.resolveTxt(recordQuery);
  }
}
