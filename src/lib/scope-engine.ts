import net from 'net';
import { EngagementScope, ExecutionPoint } from '@/types/assessment';
import { isPrivateOrReservedIP, isInternalHostname, ALLOW_LOCAL_DIAGNOSTICS } from './security-guard';
import { NormalizedTarget } from './target-normalizer';

export interface ScopeValidationResult {
  inScope: boolean;
  reason: string;
  matchedRule?: string;
  requiresLanAuthorization?: boolean;
}

/**
 * Motore di validazione del perimetro di sicurezza (Scope Engine).
 * Impedisce l'estensione non autorizzata dei test verso provider terzi,
 * CDN, tenant condivisi o subnet non esplicitamente autorizzate.
 */
export class ScopeEngine {
  private scope: EngagementScope | null;

  constructor(scope?: EngagementScope | null) {
    this.scope = scope || null;
  }

  /**
   * Verifica se un target normalizzato o una destinazione di redirect rientra nel perimetro autorizzato.
   */
  public isTargetInScope(target: NormalizedTarget, point: ExecutionPoint): ScopeValidationResult {
    // 1. Controllo di sicurezza preventivo (SSRF Protection)
    if (point === 'external' && !ALLOW_LOCAL_DIAGNOSTICS) {
      if (target.isIp && isPrivateOrReservedIP(target.hostname)) {
        return {
          inScope: false,
          reason: 'L’indirizzo appartiene a uno spazio IP privato o riservato (RFC 1918 / Cloud Metadata). Non consentito in test esterni.',
        };
      }
      if (isInternalHostname(target.hostname)) {
        return {
          inScope: false,
          reason: `L’hostname "${target.hostname}" è un nome locale interno (.local, .internal, localhost). Non consentito in test esterni.`,
        };
      }
      for (const ip of [...target.resolvedIpv4, ...target.resolvedIpv6]) {
        if (isPrivateOrReservedIP(ip)) {
          return {
            inScope: false,
            reason: `L’hostname risolve su IP privato/riservato (${ip}). Esecuzione bloccata per sicurezza.`,
          };
        }
      }
    }

    // Se non è stato configurato un engagement scope esplicito, opera in modalità perimetro singolo
    if (!this.scope) {
      return {
        inScope: true,
        reason: 'Target autorizzato come perimetro singolo standard.',
      };
    }

    // 2. Controllo finestra temporale
    const now = Date.now();
    if (this.scope.authorizedPeriod) {
      if (now < this.scope.authorizedPeriod.start) {
        return {
          inScope: false,
          reason: 'La finestra temporale di autorizzazione non è ancora iniziata.',
        };
      }
      if (now > this.scope.authorizedPeriod.end) {
        return {
          inScope: false,
          reason: 'La finestra temporale di autorizzazione è scaduta.',
        };
      }
    }

    // 3. Controllo Esclusioni esplicite
    for (const excl of this.scope.exclusions || []) {
      const cleanExcl = excl.toLowerCase().trim();
      if (target.hostname === cleanExcl || target.hostname.endsWith(`.${cleanExcl}`)) {
        return {
          inScope: false,
          reason: `Il target coincide o appartiene a un perimetro esplicitamente escluso (${excl}).`,
        };
      }
      if (target.canonicalUrl.startsWith(cleanExcl)) {
        return {
          inScope: false,
          reason: `L’URL coincide con un percorso escluso (${excl}).`,
        };
      }
    }

    // 4. Se il test è LAN interno, richiede che le subnet/IP siano incluse
    if (point === 'internal_lan') {
      const hasLanScope = (this.scope.includedSubnets && this.scope.includedSubnets.length > 0) ||
                          (this.scope.includedIps && this.scope.includedIps.length > 0);
      if (!hasLanScope) {
        return {
          inScope: false,
          reason: 'I test LAN interni richiedono una lista esplicita di subnet o IP autorizzati.',
          requiresLanAuthorization: true,
        };
      }
    }

    // 5. Verifica inclusioni per domini o URL
    const targetHost = target.hostname.toLowerCase();
    for (const dom of this.scope.includedDomains || []) {
      const cleanDom = dom.toLowerCase().trim();
      const isWildcard = cleanDom.startsWith('*.');
      const baseDom = isWildcard ? cleanDom.slice(2) : cleanDom;

      if (isWildcard) {
        if (targetHost === baseDom || targetHost.endsWith(`.${baseDom}`)) {
          return {
            inScope: true,
            reason: `Target corrispondente al dominio wildcard autorizzato: ${dom}`,
            matchedRule: dom,
          };
        }
      } else {
        // Match esatto di dominio/FQDN per evitare scope drift non autorizzato sui sottodomini
        if (targetHost === baseDom) {
          return {
            inScope: true,
            reason: `Target corrispondente al dominio esatto autorizzato: ${dom}`,
            matchedRule: dom,
          };
        }
      }
    }

    // 6. Verifica inclusioni per IP
    const allTargetIps = [...target.resolvedIpv4, ...target.resolvedIpv6];
    if (target.isIp) allTargetIps.push(target.hostname);

    for (const ipRule of this.scope.includedIps || []) {
      if (allTargetIps.includes(ipRule.trim())) {
        return {
          inScope: true,
          reason: `Target corrispondente all'indirizzo IP autorizzato: ${ipRule}`,
          matchedRule: ipRule,
        };
      }
    }

    // 7. Se non corrisponde a nessuna regola esplicita
    return {
      inScope: false,
      reason: `Il target (${target.hostname}) non è presente nella lista dei domini o IP inclusi nell’autorizzazione.`,
    };
  }

  /**
   * Verifica se un redirect verso una nuova URL rientra nel perimetro autorizzato
   * per prevenire SSRF o test involontari di CDN / IdP (es. auth0, cloudflare, azure).
   */
  public async isRedirectInScope(sourceTarget: NormalizedTarget, redirectUrl: string, point: ExecutionPoint): Promise<ScopeValidationResult> {
    try {
      const parsedRedirect = new URL(redirectUrl, sourceTarget.canonicalUrl);
      const redirectHost = parsedRedirect.hostname.toLowerCase();

      // Se il redirect rimane sullo stesso hostname o dominio principale del target autorizzato
      if (redirectHost === sourceTarget.hostname || redirectHost.endsWith(`.${sourceTarget.hostname}`)) {
        return {
          inScope: true,
          reason: `Redirect interno autorizzato verso ${redirectHost}`,
        };
      }

      // Se non è lo stesso host, delega alla verifica generale di scope
      const { normalizeTarget } = await import('./target-normalizer');
      const normalizedRedirect = await normalizeTarget(parsedRedirect.href);
      return this.isTargetInScope(normalizedRedirect, point);
    } catch {
      return {
        inScope: false,
        reason: `URL di redirect non valida o malformata: ${redirectUrl}`,
      };
    }
  }
}
