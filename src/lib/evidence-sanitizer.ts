/**
 * EVIDENCE SANITIZER
 * Modulo per il mascheramento e l'anonimizzazione preventiva di segreti,
 * token di autenticazione, chiavi API, cookie di sessione e PII.
 * Garantisce che nessun dato sensibile venga persistito o stampato nel report PDF.
 */

// Pattern di rilevamento e mascheramento segreti
const SECRET_PATTERNS: Array<{ name: string; regex: RegExp; mask: (...args: any[]) => string }> = [
  // Bearer token / JWT
  {
    name: 'JWT / Bearer Token',
    regex: /bearer\s+([a-zA-Z0-9_\-\.]{20,})/gi,
    mask: (_: string, token: string) => `Bearer ${(token || '').slice(0, 6)}...[REDACTED_JWT]`,
  },
  // Generic Authorization Header
  {
    name: 'Basic / Auth Token',
    regex: /basic\s+([a-zA-Z0-9+/=]{10,})/gi,
    mask: () => 'Basic [REDACTED_BASIC_AUTH]',
  },
  // Chiavi API OpenAI (sk-...)
  {
    name: 'OpenAI API Key',
    regex: /sk-[a-zA-Z0-9]{20,}/g,
    mask: (match) => `${match.slice(0, 5)}...[REDACTED_OPENAI_KEY]`,
  },
  // Chiavi Cloud AWS (AKIA...)
  {
    name: 'AWS Access Key ID',
    regex: /AKIA[0-9A-Z]{16}/g,
    mask: (match) => `${match.slice(0, 6)}...[REDACTED_AWS_KEY]`,
  },
  // AWS Secret Access Key
  {
    name: 'AWS Secret Key',
    regex: /(?:aws_secret_access_key|secret_key)\s*[:=]\s*['"]?([a-zA-Z0-9/+=]{40})['"]?/gi,
    mask: () => 'aws_secret_access_key=[REDACTED_AWS_SECRET]',
  },
  // Password / Secret in query o JSON
  {
    name: 'Password Parameter',
    regex: /(?:password|passwd|pwd|db_pass|secret|client_secret)\s*[:=]\s*['"]?([^'"&\s]{3,})['"]?/gi,
    mask: (match) => {
      const parts = match.split(/[:=]/);
      return `${parts[0]}=[REDACTED_PASSWORD]`;
    },
  },
  // Cookie di sessione noti (PHPSESSID, JSESSIONID, connect.sid, next-auth.session-token)
  {
    name: 'Session Cookie',
    regex: /(?:PHPSESSID|JSESSIONID|connect\.sid|next-auth\.session-token|session_id|token)=([a-zA-Z0-9_\-\.%]{10,})/gi,
    mask: (match) => {
      const name = match.split('=')[0];
      return `${name}=[REDACTED_SESSION_COOKIE]`;
    },
  },
  // Chiavi SSH Private (RSA / OpenSSH / EC)
  {
    name: 'SSH Private Key Header',
    regex: /-----BEGIN\s+(?:RSA|OPENSSH|DSA|EC)?\s*PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA|OPENSSH|DSA|EC)?\s*PRIVATE\s+KEY-----/gi,
    mask: () => '-----BEGIN PRIVATE KEY-----\n[REDACTED_PRIVATE_KEY_BLOCK]\n-----END PRIVATE KEY-----',
  },
];

/**
 * Sanifica una stringa di testo arbitraria (body, log, URL) rimuovendo o mascherando segreti.
 */
export function sanitizeString(content: string): string {
  if (!content || typeof content !== 'string') return '';
  let sanitized = content;

  for (const { regex, mask } of SECRET_PATTERNS) {
    sanitized = sanitized.replace(regex, mask as any);
  }

  return sanitized;
}

/**
 * Sanifica un set di header HTTP mascherando cookie, token di autenticazione e chiavi custom.
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  if (!headers || typeof headers !== 'object') return {};
  const cleaned: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();

    if (lowerKey === 'authorization' || lowerKey === 'proxy-authorization') {
      cleaned[key] = value.toLowerCase().startsWith('bearer ')
        ? `Bearer ${value.slice(7, 13)}...[REDACTED_AUTH_HEADER]`
        : '[REDACTED_AUTH_HEADER]';
    } else if (lowerKey === 'cookie' || lowerKey === 'set-cookie') {
      cleaned[key] = sanitizeString(value);
    } else if (lowerKey.includes('key') || lowerKey.includes('token') || lowerKey.includes('secret')) {
      cleaned[key] = '[REDACTED_SECRET_HEADER]';
    } else {
      cleaned[key] = sanitizeString(value);
    }
  }

  return cleaned;
}

/**
 * Estrae e tronca in modo controllato uno snippet di risposta HTTP sanificato.
 * Massima dimensione conservativa: 250 caratteri.
 */
export function extractSafeResponseSnippet(bodyText: string, maxLength = 250): string {
  if (!bodyText || typeof bodyText !== 'string') return '';
  const sanitized = sanitizeString(bodyText).trim();
  // Rimuove ritorni a capo multipli per mantenere il testo compatto
  const compacted = sanitized.replace(/\s+/g, ' ');
  return compacted.length > maxLength ? `${compacted.slice(0, maxLength)}... [TRUNCATED]` : compacted;
}
