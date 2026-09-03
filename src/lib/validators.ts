import { z } from 'zod';
import { isPrivateOrReservedIP, isInternalHostname, validateExternalTarget } from './security-guard';

export const domainSchema = z.preprocess(
  (val) => val ?? '',
  z
    .string()
    .trim()
    .min(3)
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
      'Invalid domain name'
    )
    .refine((val) => !isInternalHostname(val), {
      message: 'SSRF Protection: Internal and reserved domains are not allowed.',
    })
);

export const ipSchema = z.preprocess(
  (val) => val ?? '',
  z
    .string()
    .trim()
    .regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      'Invalid IPv4 address'
    )
    .refine((val) => !isPrivateOrReservedIP(val), {
      message: 'SSRF Protection: Private and reserved IP addresses are not allowed for external scans.',
    })
);

export const targetSchema = z.union([domainSchema, ipSchema]);

export async function validateSafeTarget(rawTarget: unknown): Promise<
  | { success: true; target: string; resolvedIps: string[] }
  | { success: false; error: string }
> {
  const parseResult = targetSchema.safeParse(rawTarget);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues?.[0]?.message || 'Target non valido' };
  }
  const cleanTarget = parseResult.data;
  const validation = await validateExternalTarget(cleanTarget);
  if (!validation.isValid) {
    return { success: false, error: validation.error || 'SSRF Protection: target non consentito' };
  }
  return { success: true, target: cleanTarget, resolvedIps: validation.resolvedIps };
}

