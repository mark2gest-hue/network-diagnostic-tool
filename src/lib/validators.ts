import { z } from 'zod';
import { isPrivateOrReservedIP, isInternalHostname, validateExternalTarget, ALLOW_LOCAL_DIAGNOSTICS } from './security-guard';

function sanitizeInput(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let str = raw.trim();
  // Rimuove protocolli http://, https://, ftp://
  if (/^[a-zA-Z]+:\/\//i.test(str)) {
    try {
      const parsed = new URL(str);
      str = parsed.hostname;
    } catch {
      str = str.replace(/^[a-zA-Z]+:\/\//i, '');
    }
  }
  // Rimuove eventuale path finale (/qualcosa)
  str = str.split('/')[0];
  // Rimuove eventuale porta (:443, :3100)
  str = str.split(':')[0];
  return str.trim();
}

// Regex flessibile: supporta FQDN pubblici (bot.mark2.cloud), domini locali (nas.local, router.lan) e singoli host (localhost, router, server)
const HOSTNAME_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/i;

export const domainSchema = z.preprocess(
  (val) => sanitizeInput(val),
  z
    .string()
    .min(1, 'Inserisci un dominio')
    .regex(
      HOSTNAME_REGEX,
      'Formato dominio non valido (es. bot.mark2.cloud)'
    )
    .refine((val) => ALLOW_LOCAL_DIAGNOSTICS || !isInternalHostname(val), {
      message: 'Protezione SSRF: Gli host locali non sono consentiti.',
    })
    .refine((val) => ALLOW_LOCAL_DIAGNOSTICS || !isPrivateOrReservedIP(val), {
      message: 'Protezione SSRF: Dotted-quad IP non consentito come dominio.',
    })
);

export const ipSchema = z.preprocess(
  (val) => sanitizeInput(val),
  z
    .string()
    .regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      'Indirizzo IPv4 non valido'
    )
    .refine((val) => ALLOW_LOCAL_DIAGNOSTICS || !isPrivateOrReservedIP(val), {
      message: 'Protezione SSRF: Gli indirizzi IP privati non sono consentiti.',
    })
);

export const targetSchema = z.preprocess(
  (val) => sanitizeInput(val),
  z.string().min(1, 'Inserisci un dominio o indirizzo IP').superRefine((val, ctx) => {
    const isIp = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(val) || val.includes(':');
    
    if (isIp) {
      if (!ALLOW_LOCAL_DIAGNOSTICS && isPrivateOrReservedIP(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Protezione SSRF: Gli indirizzi IP privati non sono consentiti.',
        });
      }
      return;
    }

    if (!HOSTNAME_REGEX.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Formato target non valido (es. bot.mark2.cloud, 192.168.1.1, localhost)',
      });
      return;
    }

    if (!ALLOW_LOCAL_DIAGNOSTICS && isInternalHostname(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Protezione SSRF: Gli host locali non sono consentiti in questa modalità.',
      });
    }
  })
);

/**
 * Converte gli errori Zod in un messaggio di testo chiaro e leggibile dall'utente,
 * evitando la visualizzazione del raw dump JSON con regex.
 */
export function formatZodError(error: z.ZodError): string {
  if (!error || !error.issues || error.issues.length === 0) {
    return 'Dati di input non validi.';
  }
  const first = error.issues[0];
  if (first.message && !first.message.includes('invalid_union')) {
    return first.message;
  }
  return 'Inserisci un dominio valido (es. bot.mark2.cloud) o un indirizzo IP pubblico.';
}

export async function validateSafeTarget(rawTarget: unknown): Promise<
  | { success: true; target: string; resolvedIps: string[] }
  | { success: false; error: string }
> {
  const parseResult = targetSchema.safeParse(rawTarget);
  if (!parseResult.success) {
    return { success: false, error: formatZodError(parseResult.error) };
  }
  const cleanTarget = parseResult.data;
  const validation = await validateExternalTarget(cleanTarget);
  if (!validation.isValid) {
    return { success: false, error: validation.error || 'SSRF Protection: target non consentito' };
  }
  return { success: true, target: cleanTarget, resolvedIps: validation.resolvedIps };
}

