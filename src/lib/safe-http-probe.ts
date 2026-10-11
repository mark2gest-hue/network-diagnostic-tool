import https from 'https';
import http from 'http';

export interface SafeProbeResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

export interface SafeProbeOptions {
  method?: string;
  headers?: Record<string, string>;
  timeout?: number;
  maxRedirects?: number;
}

/**
 * Esegue probe HTTP/HTTPS sicuri verso target esterni per verifiche di sicurezza.
 * Supporta target con certificati SSL self-signed/staging/incompleti (rejectUnauthorized: false)
 * e include timeout deterministico per evitare hanging socket.
 */
export function safeHttpProbe(urlStr: string, options: SafeProbeOptions = {}): Promise<SafeProbeResponse> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request(parsed, {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'NetworkDiag-SecurityScanner/1.0 (+https://aiutiamoci.cloud)',
          ...(options.headers || {})
        },
        agent: isHttps ? new https.Agent({ rejectUnauthorized: false, keepAlive: false }) : undefined,
        timeout: options.timeout || 5000,
      }, (res) => {
        let body = '';
        res.on('data', chunk => {
          body += chunk;
          if (body.length > 500000) { // Limit body to 500KB
            req.destroy();
            resolve({
              status: res.statusCode || 200,
              headers: res.headers,
              body
            });
          }
        });
        res.on('end', () => resolve({
          status: res.statusCode || 200,
          headers: res.headers,
          body
        }));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout durante la connessione al target'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    } catch (e) {
      reject(e);
    }
  });
}
