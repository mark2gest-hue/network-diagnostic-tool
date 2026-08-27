import { z } from 'zod';
import { isPrivateOrReservedIP, isInternalHostname } from './security-guard';

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

