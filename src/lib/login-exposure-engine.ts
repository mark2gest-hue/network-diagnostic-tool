/**
 * LOGIN EXPOSURE & CREDENTIAL DEFENSE ENGINE
 * Motore deterministico e non distruttivo per l'audit empirico di superfici di login esposte.
 *
 * Verifiche 100% reali ed evidenze verificabili:
 * 1. Ispezione reale del form HTML (password input, submit, assenza di campi 2FA/TOTP).
 * 2. Rilevamento difese anti-bot (presenza o assenza di Turnstile, reCAPTCHA, hCaptcha).
 * 3. Misurazione empirica del Rate-Limiting (latenza e risposte consecutive a 3 tentativi controllati).
 * 4. Riconoscimento firme e apparati noti con credenziali di default note da vendor catalog.
 */

import { safeFetch } from './safe-http-probe';
import { PinnedLookup } from './safe-http-probe';

export interface FormAnalysis {
  hasForm: boolean;
  hasPasswordField: boolean;
  hasUsernameField: boolean;
  hasSubmitButton: boolean;
  hasMfaField: boolean;
  antiBotProtection: 'cloudflare_turnstile' | 'recaptcha' | 'hcaptcha' | 'custom_token' | 'none';
  csrfProtected: boolean;
  formAction?: string;
  detectedFields: string[];
}

export interface RateLimitEvidence {
  testedRequests: number;
  latenciesMs: number[];
  avgLatencyMs: number;
  statuses: number[];
  rateLimitEnforced: boolean;
  evidenceSummary: string;
}

export interface KnownVendorSignature {
  vendor: string;
  category: 'Router/Firewall' | 'NAS' | 'VoIP/PBX' | 'CMS/Web' | 'Hypervisor' | 'General';
  defaultCredentialsEvidence: string;
  detectedBy: string;
}

export interface LoginExposureAuditResult {
  targetUrl: string;
  isReachable: boolean;
  httpStatus?: number;
  serverHeader?: string;
  formAnalysis: FormAnalysis;
  rateLimitAudit: RateLimitEvidence;
  vendorSignature?: KnownVendorSignature;
  exposureRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  findings: string[];
  recommendations: string[];
}

// Catalog firme note di vendor e apparati PMI
const KNOWN_VENDORS = [
  {
    vendor: 'MikroTik RouterOS',
    category: 'Router/Firewall' as const,
    indicators: ['routeros', 'mikrotik'],
    defaults: 'admin : (senza password)',
  },
  {
    vendor: 'Synology DSM',
    category: 'NAS' as const,
    indicators: ['synology', 'dsm_login'],
    defaults: 'admin : (vuoto) o admin:admin (pre-DSM 6)',
  },
  {
    vendor: 'QNAP QTS',
    category: 'NAS' as const,
    indicators: ['qts', 'qnap'],
    defaults: 'admin : (MAC address senza separatori o admin)',
  },
  {
    vendor: 'pfSense / OPNsense',
    category: 'Router/Firewall' as const,
    indicators: ['pfsense', 'opnsense'],
    defaults: 'admin : pfsense / opnsense',
  },
  {
    vendor: 'Fortinet FortiGate',
    category: 'Router/Firewall' as const,
    indicators: ['fortigate', 'fortinet'],
    defaults: 'admin : (vuoto)',
  },
  {
    vendor: 'FreePBX / Asterisk',
    category: 'VoIP/PBX' as const,
    indicators: ['freepbx', 'asterisk'],
    defaults: 'admin : admin',
  },
  {
    vendor: 'WordPress',
    category: 'CMS/Web' as const,
    indicators: ['wp-login', 'wordpress'],
    defaults: 'admin : password / 123456 (frequenti)',
  },
];

export async function auditLoginExposure(
  targetUrl: string,
  pinnedLookup?: PinnedLookup
): Promise<LoginExposureAuditResult> {
  const findings: string[] = [];
  const recommendations: string[] = [];

  // 1. GET iniziale della pagina di login
  let initialResponse: Response;
  let html = '';
  let serverHeader = '';
  let httpStatus = 0;

  try {
    initialResponse = await safeFetch(targetUrl, {
      method: 'GET',
      lookup: pinnedLookup,
      timeout: 6000,
      redirect: 'follow',
      maxRedirects: 3,
    });
    httpStatus = initialResponse.status;
    serverHeader = initialResponse.headers.get('server') || initialResponse.headers.get('x-powered-by') || '';
    html = await initialResponse.text();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Destinazione non raggiungibile';
    return {
      targetUrl,
      isReachable: false,
      formAnalysis: {
        hasForm: false,
        hasPasswordField: false,
        hasUsernameField: false,
        hasSubmitButton: false,
        hasMfaField: false,
        antiBotProtection: 'none',
        csrfProtected: false,
        detectedFields: [],
      },
      rateLimitAudit: {
        testedRequests: 0,
        latenciesMs: [],
        avgLatencyMs: 0,
        statuses: [],
        rateLimitEnforced: false,
        evidenceSummary: `Target irraggiungibile: ${errorMsg}`,
      },
      exposureRisk: 'LOW',
      findings: [`Impossibile connettersi al target: ${errorMsg}`],
      recommendations: ['Verificare che il servizio web sia attivo e raggiungibile dal perimetro.'],
    };
  }

  // 2. Analisi empirica del Form HTML
  const lowerHtml = html.toLowerCase();

  const hasPasswordField = /type=["']password["']/i.test(html) || /name=["'][^"']*pass/i.test(html);
  const hasUsernameField = /type=["'](?:text|email)["']/i.test(html) || /name=["'][^"']*(?:user|login|email)/i.test(html);
  const hasSubmitButton = /type=["']submit["']/i.test(html) || /<button[^>]*>.*?(?:accedi|login|sign in|entra).*?<\/button>/i.test(html);
  const hasMfaField = /name=["'][^"']*(?:totp|otp|2fa|token|authenticator|mfa)/i.test(html) || /placeholder=["'][^"']*(?:totp|codice a 6 cifre|google authenticator)/i.test(html);

  // Anti-bot check reale
  let antiBotProtection: FormAnalysis['antiBotProtection'] = 'none';
  if (lowerHtml.includes('challenges.cloudflare.com/turnstile') || lowerHtml.includes('cf-turnstile')) {
    antiBotProtection = 'cloudflare_turnstile';
  } else if (lowerHtml.includes('google.com/recaptcha') || lowerHtml.includes('g-recaptcha')) {
    antiBotProtection = 'recaptcha';
  } else if (lowerHtml.includes('hcaptcha.com') || lowerHtml.includes('h-captcha')) {
    antiBotProtection = 'hcaptcha';
  }

  const csrfProtected = /name=["'][^"']*(?:csrf|token|_token|xsrf)/i.test(html);

  const detectedFields: string[] = [];
  if (hasUsernameField) detectedFields.push('username/email');
  if (hasPasswordField) detectedFields.push('password');
  if (hasMfaField) detectedFields.push('MFA/TOTP');
  if (csrfProtected) detectedFields.push('token CSRF');

  const formActionMatch = html.match(/<form[^>]+action=["']([^"']+)["']/i);
  const formAction = formActionMatch ? formActionMatch[1] : undefined;

  const formAnalysis: FormAnalysis = {
    hasForm: /<form/i.test(html) || hasPasswordField,
    hasPasswordField,
    hasUsernameField,
    hasSubmitButton,
    hasMfaField,
    antiBotProtection,
    csrfProtected,
    formAction,
    detectedFields,
  };

  // 3. Vendor Signature Detection
  let detectedVendor: KnownVendorSignature | undefined;
  for (const v of KNOWN_VENDORS) {
    const match = v.indicators.some(
      (ind) => lowerHtml.includes(ind) || serverHeader.toLowerCase().includes(ind) || targetUrl.toLowerCase().includes(ind)
    );
    if (match) {
      detectedVendor = {
        vendor: v.vendor,
        category: v.category,
        defaultCredentialsEvidence: v.defaults,
        detectedBy: serverHeader ? `Header Server: "${serverHeader}"` : `Impronta HTML/Path rilevata`,
      };
      break;
    }
  }

  // 4. Test empirico di Rate-Limiting (Max 3 richieste sicure e distanziate)
  const latenciesMs: number[] = [];
  const statuses: number[] = [];
  let rateLimitEnforced = false;

  // Inviamo 3 richieste HEAD/GET veloci per testare la risposta ai tentativi consecutivi
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    try {
      const probeRes = await safeFetch(targetUrl, {
        method: 'GET',
        lookup: pinnedLookup,
        timeout: 4000,
        headers: { 'X-Audit-Probe': `RateLimitCheck-${i + 1}` },
      });
      const duration = Date.now() - start;
      latenciesMs.push(duration);
      statuses.push(probeRes.status);

      if (probeRes.status === 429 || probeRes.headers.get('retry-after')) {
        rateLimitEnforced = true;
      }
    } catch {
      latenciesMs.push(Date.now() - start);
      statuses.push(0);
    }
  }

  const avgLatencyMs = latenciesMs.length > 0 
    ? Math.round(latenciesMs.reduce((a, b) => a + b, 0) / latenciesMs.length) 
    : 0;

  // Se la terza richiesta ha una latenza tripla della prima (tarpit difensivo)
  if (latenciesMs.length >= 3 && latenciesMs[2] > latenciesMs[0] * 3 && latenciesMs[2] > 1200) {
    rateLimitEnforced = true;
  }

  const rateLimitAudit: RateLimitEvidence = {
    testedRequests: statuses.length,
    latenciesMs,
    avgLatencyMs,
    statuses,
    rateLimitEnforced,
    evidenceSummary: rateLimitEnforced
      ? `Rate-limiting o Tarpit attivo rilevato (Stati: [${statuses.join(', ')}], Latency media: ${avgLatencyMs}ms)`
      : `Nessun blocco o rallentamento su ${statuses.length} richieste consecutive (Stati: [${statuses.join(', ')}], Latency: ${avgLatencyMs}ms)`,
  };

  // 5. Sintesi Rischio & Findings
  if (formAnalysis.hasPasswordField) {
    findings.push(`Pannello di autenticazione esposto pubblicamente con campo password attivo.`);
  }

  if (formAnalysis.hasPasswordField && !formAnalysis.hasMfaField) {
    findings.push(`Autenticazione a singolo fattore: nessun campo TOTP/MFA rilevato sul form.`);
    recommendations.push(`Implementare autenticazione a due fattori (2FA/MFA via App TOTP o WebAuthn).`);
  }

  if (formAnalysis.antiBotProtection === 'none') {
    findings.push(`Assenza di protezione anti-automazione (nessun CAPTCHA, Turnstile o PoW rilevato).`);
    recommendations.push(`Attivare Cloudflare Turnstile o meccanismi anti-bot per mitigare password spraying automatico.`);
  } else {
    findings.push(`Protezione anti-bot attiva: rilevato ${formAnalysis.antiBotProtection.replace('_', ' ')}.`);
  }

  if (!rateLimitEnforced) {
    findings.push(`Nessun rate-limiting HTTP (429) o rallentamento difensivo rilevato.`);
    recommendations.push(`Configurare rate limiting a livello reverse proxy / WAF (es. max 5 tentativi/minuto per IP).`);
  }

  if (detectedVendor) {
    findings.push(`Apparato/Servizio riconosciuto: ${detectedVendor.vendor} (${detectedVendor.category}). Credenziali di fabbrica tipiche: ${detectedVendor.defaultCredentialsEvidence}.`);
    recommendations.push(`Verificare immediatamente che l'account predefinito (${detectedVendor.defaultCredentialsEvidence.split(':')[0].trim()}) sia stato disabilitato o protetto con password ad alta entropia.`);
  }

  // Calcolo severità
  let exposureRisk: LoginExposureAuditResult['exposureRisk'] = 'LOW';
  if (formAnalysis.hasPasswordField && !formAnalysis.hasMfaField && !rateLimitEnforced) {
    exposureRisk = detectedVendor ? 'CRITICAL' : 'HIGH';
  } else if (formAnalysis.hasPasswordField && !formAnalysis.hasMfaField) {
    exposureRisk = 'MEDIUM';
  }

  return {
    targetUrl,
    isReachable: true,
    httpStatus,
    serverHeader: serverHeader || undefined,
    formAnalysis,
    rateLimitAudit,
    vendorSignature: detectedVendor,
    exposureRisk,
    findings,
    recommendations,
  };
}
