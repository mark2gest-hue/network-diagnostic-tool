import https from 'https';
import http from 'http';

/**
 * Funzione lookup compatibile con net.connect / tls.connect / http.request.
 * Forza la risoluzione DNS verso IP già validati (anti TOCTOU / DNS Rebinding).
 */
export type PinnedLookup = (hostname: string, options: unknown, callback: unknown) => void;

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
  lookup?: PinnedLookup;
}

/**
 * Esegue probe HTTP/HTTPS sicuri verso target esterni per verifiche di sicurezza.
 * Supporta target con certificati SSL self-signed/staging/incompleti (rejectUnauthorized: false)
 * e include timeout deterministico per evitare hanging socket.
 *
 * `lookup` opzionale: permette il pinning dell'IP risolto (anti DNS Rebinding).
 */
export function safeHttpProbe(urlStr: string, options: SafeProbeOptions = {}): Promise<SafeProbeResponse> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions: http.RequestOptions = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'NetworkDiag-SecurityScanner/1.0 (+https://aiutiamoci.cloud)',
          ...(options.headers || {})
        },
        timeout: options.timeout || 5000,
      };

      if (isHttps) {
        (requestOptions as https.RequestOptions).rejectUnauthorized = false;
      }
      if (options.lookup) {
        requestOptions.lookup = options.lookup as http.RequestOptions['lookup'];
      }

      const req = client.request(requestOptions, (res) => {
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

export interface SafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  lookup?: PinnedLookup;
  timeout?: number;
  redirect?: 'manual' | 'follow';
  maxRedirects?: number;
}

/**
 * Drop-in replacement di `fetch` con pinning DNS opzionale (anti TOCTOU/DNS Rebinding).
 * Ritorna un vero oggetto `Response`.
 *
 * Sicurezza SSRF: NON segue redirect verso host diversi da quello originario validato.
 * I redirect same-host (es. http -> https) vengono seguiti solo se `redirect: 'follow'`.
 */
export function safeFetch(urlStr: string, options: SafeFetchOptions = {}): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? 3;
  const follow = options.redirect === 'follow';

  return new Promise<Response>((resolve, reject) => {
    const originalHost = (() => {
      try {
        return new URL(urlStr).hostname.toLowerCase();
      } catch {
        return '';
      }
    })();

    const doRequest = (currentUrl: string, redirectsLeft: number) => {
      let parsed: URL;
      try {
        parsed = new URL(currentUrl);
      } catch (e) {
        reject(e);
        return;
      }

      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions: http.RequestOptions = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'NetworkDiagTool/1.0',
          ...(options.headers || {})
        },
        timeout: options.timeout || 5000,
      };

      if (isHttps) {
        (requestOptions as https.RequestOptions).rejectUnauthorized = false;
      }
      // Il pinning si applica solo all'host originario (quello validato): qui il redirect
      // same-host riusa lo stesso lookup, gli host diversi non vengono seguiti del tutto.
      if (options.lookup) {
        requestOptions.lookup = options.lookup as http.RequestOptions['lookup'];
      }

      const req = client.request(requestOptions, (res) => {
        const status = res.statusCode || 200;
        const statusText = res.statusMessage || '';
        const location = res.headers.location;

        if (follow && redirectsLeft > 0 && status >= 300 && status < 400 && location) {
          let nextUrl: URL;
          try {
            nextUrl = new URL(location, currentUrl);
          } catch {
            nextUrl = parsed;
          }
          if (nextUrl.hostname.toLowerCase() === originalHost) {
            res.resume(); // scarta il corpo del 3xx
            doRequest(nextUrl.toString(), redirectsLeft - 1);
            return;
          }
          // Redirect cross-host: NON seguito (anti-SSRF) — restituisce il 3xx al chiamante
        }

        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => {
          chunks.push(c);
          if (chunks.reduce((a, b) => a + b.length, 0) > 500000) {
            req.destroy();
          }
        });
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          const headers = new Headers();
          for (const [k, v] of Object.entries(res.headers)) {
            if (Array.isArray(v)) {
              for (const item of v) headers.append(k, item);
            } else if (v !== undefined) {
              headers.set(k, String(v));
            }
          }
          resolve(new Response(body, { status, statusText, headers }));
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout durante la connessione al target'));
      });
      req.on('error', reject);
      req.end();
    };

    doRequest(urlStr, maxRedirects);
  });
}
