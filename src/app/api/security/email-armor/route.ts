import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import net from 'net';
import tls from 'tls';
import { validateSafeTarget } from '@/lib/validators';
import { isPrivateOrReservedIP, ALLOW_LOCAL_DIAGNOSTICS, createPinnedLookup, type PinnedLookupFn } from '@/lib/security-guard';

export const dynamic = 'force-dynamic';

export interface MxStarttlsInfo {
  tested: boolean;
  mxHost: string;
  supportsStarttls: boolean;
  cert?: {
    issuer: string;
    validTo: string;
    daysRemaining: number;
    isExpired: boolean;
  };
  banner?: string;
  egressFiltered?: boolean;
  error?: string;
  opensslCommand: string;
}

export interface DaneInfo {
  enabled: boolean;
  record?: string;
  queryHost: string;
  dnssecValidated?: boolean;
  command: string;
}

function checkMxStarttls(mxHost: string, timeoutMs = 4000, lookup?: PinnedLookupFn): Promise<MxStarttlsInfo> {
  return new Promise((resolve) => {
    let settled = false;
    const socket = new net.Socket();

    const finish = (res: MxStarttlsInfo) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(res);
      }
    };

    socket.setTimeout(timeoutMs);

    socket.on('timeout', () => {
      finish({
        tested: false,
        mxHost,
        supportsStarttls: false,
        egressFiltered: true,
        error: 'Timeout porta 25 (porta filtrata da policy di sicurezza di rete o ISP)',
        opensslCommand: `openssl s_client -starttls smtp -connect ${mxHost}:25`,
      });
    });

    socket.on('error', (err) => {
      finish({
        tested: false,
        mxHost,
        supportsStarttls: false,
        egressFiltered: true,
        error: `Connessione porta 25 interrotta: ${err.message}`,
        opensslCommand: `openssl s_client -starttls smtp -connect ${mxHost}:25`,
      });
    });

    let state = 'BANNER';
    let banner = '';

    socket.connect({ port: 25, host: mxHost, lookup }, () => {
      // Attesa banner iniziale
    });

    socket.on('data', (chunk) => {
      const text = chunk.toString();
      if (state === 'BANNER') {
        banner = text.trim();
        if (text.startsWith('220')) {
          state = 'EHLO';
          socket.write('EHLO diagnostic.aiutiamoci.cloud\r\n');
        } else {
          finish({
            tested: true,
            mxHost,
            supportsStarttls: false,
            banner,
            opensslCommand: `openssl s_client -starttls smtp -connect ${mxHost}:25`,
          });
        }
      } else if (state === 'EHLO') {
        const hasStarttls = /STARTTLS/i.test(text);
        if (!hasStarttls) {
          finish({
            tested: true,
            mxHost,
            supportsStarttls: false,
            banner,
            opensslCommand: `openssl s_client -starttls smtp -connect ${mxHost}:25`,
          });
        } else {
          state = 'STARTTLS';
          socket.write('STARTTLS\r\n');
        }
      } else if (state === 'STARTTLS') {
        if (text.startsWith('220')) {
          try {
            const secureSocket = tls.connect({
              socket,
              servername: mxHost,
              rejectUnauthorized: false,
            }, () => {
              const peerCert = secureSocket.getPeerCertificate(true);
              let certInfo;
              if (peerCert && peerCert.valid_to) {
                const validTo = new Date(peerCert.valid_to).getTime();
                const days = Math.floor((validTo - Date.now()) / (1000 * 60 * 60 * 24));
                const issuerObj = peerCert.issuer as { O?: string; CN?: string };
                certInfo = {
                  issuer: issuerObj?.O || issuerObj?.CN || 'Sconosciuto',
                  validTo: peerCert.valid_to,
                  daysRemaining: days,
                  isExpired: days < 0,
                };
              }
              secureSocket.end();
              finish({
                tested: true,
                mxHost,
                supportsStarttls: true,
                banner,
                cert: certInfo,
                opensslCommand: `openssl s_client -starttls smtp -connect ${mxHost}:25`,
              });
            });

            secureSocket.on('error', () => {
              finish({
                tested: true,
                mxHost,
                supportsStarttls: true,
                banner,
                opensslCommand: `openssl s_client -starttls smtp -connect ${mxHost}:25`,
              });
            });
          } catch {
            finish({
              tested: true,
              mxHost,
              supportsStarttls: true,
              banner,
              opensslCommand: `openssl s_client -starttls smtp -connect ${mxHost}:25`,
            });
          }
        } else {
          finish({
            tested: true,
            mxHost,
            supportsStarttls: false,
            banner,
            opensslCommand: `openssl s_client -starttls smtp -connect ${mxHost}:25`,
          });
        }
      }
    });
  });
}

// Evita che un dominio controllato dall'attaccante faccia connettere il server verso IP interni (MX/NS -> IP privato)
async function hostIsPublic(host: string): Promise<string[] | null> {
  if (ALLOW_LOCAL_DIAGNOSTICS) {
    try {
      const addrs = await dns.lookup(host, { all: true });
      return addrs.map((a) => a.address);
    } catch {
      return null;
    }
  }
  try {
    const addrs = await dns.lookup(host, { all: true });
    if (addrs.length > 0 && addrs.every((a) => !isPrivateOrReservedIP(a.address))) {
      return addrs.map((a) => a.address);
    }
    return null;
  } catch {
    return null;
  }
}

async function checkDaneTlsa(host: string): Promise<DaneInfo> {
  const queryHost = `_25._tcp.${host}`;
  const command = `dig +dnssec +short TLSA ${queryHost}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(queryHost)}&type=TLSA`, {
      signal: controller.signal,
      headers: { Accept: 'application/dns-json' },
    });
    clearTimeout(timer);
    if (!res.ok) return { enabled: false, queryHost, command };
    const json = (await res.json()) as { AD?: boolean; Answer?: Array<{ type?: number; data: string }> };
    const tlsa = (json.Answer || []).filter((a) => a.type === 52);
    if (tlsa.length > 0) {
      const dnssecValidated = json.AD === true;
      return {
        // DANE è efficace solo se i record TLSA sono validati via DNSSEC
        enabled: dnssecValidated,
        dnssecValidated,
        record: tlsa[0].data,
        queryHost,
        command,
      };
    }
    return { enabled: false, queryHost, command };
  } catch {
    return { enabled: false, queryHost, command };
  }
}

function buildAxfrQuery(domain: string): Buffer {
  const parts = domain.split('.');
  const qnameParts: Buffer[] = [];
  for (const part of parts) {
    const partBuf = Buffer.from(part, 'ascii');
    qnameParts.push(Buffer.from([partBuf.length]));
    qnameParts.push(partBuf);
  }
  qnameParts.push(Buffer.from([0]));
  const qname = Buffer.concat(qnameParts);

  const header = Buffer.alloc(12);
  header.writeUInt16BE(0x1337, 0); // ID
  header.writeUInt16BE(0x0000, 2); // Opcode=0, RD=0
  header.writeUInt16BE(1, 4);      // QDCOUNT = 1
  header.writeUInt16BE(0, 6);      // ANCOUNT = 0
  header.writeUInt16BE(0, 8);      // NSCOUNT = 0
  header.writeUInt16BE(0, 10);     // ARCOUNT = 0

  const tail = Buffer.alloc(4);
  tail.writeUInt16BE(252, 0);      // QTYPE = AXFR
  tail.writeUInt16BE(1, 2);        // QCLASS = IN

  const dnsPayload = Buffer.concat([header, qname, tail]);

  const tcpMsg = Buffer.alloc(2 + dnsPayload.length);
  tcpMsg.writeUInt16BE(dnsPayload.length, 0);
  dnsPayload.copy(tcpMsg, 2);

  return tcpMsg;
}

function checkAxfr(domain: string, nsHost: string, timeoutMs = 2500, lookup?: PinnedLookupFn): Promise<{ protected: boolean; testedNs: string; message: string }> {
  return new Promise((resolve) => {
    let settled = false;
    const socket = new net.Socket();

    const finish = (result: { protected: boolean; testedNs: string; message: string }) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(timeoutMs);

    socket.on('timeout', () => {
      finish({
        protected: true,
        testedNs: nsHost,
        message: 'Timeout query AXFR su porta 53/TCP (accesso filtrato o negato)',
      });
    });

    socket.on('error', () => {
      finish({
        protected: true,
        testedNs: nsHost,
        message: 'Connessione TCP rifiutata o interrotta (AXFR protetto)',
      });
    });

    socket.connect({ port: 53, host: nsHost, lookup }, () => {
      try {
        const query = buildAxfrQuery(domain);
        socket.write(query);
      } catch {
        finish({
          protected: true,
          testedNs: nsHost,
          message: 'Invio pacchetto non riuscito (AXFR protetto)',
        });
      }
    });

    let buffer = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length >= 14) {
        const dnsPayload = buffer.subarray(2);
        const flags2 = dnsPayload.readUInt8(3);
        const rcode = flags2 & 0x0f;
        const ancount = dnsPayload.readUInt16BE(6);

        if (rcode === 0 && ancount > 0) {
          finish({
            protected: false,
            testedNs: nsHost,
            message: `AXFR vulnerabile su ${nsHost} (RCODE 0, ${ancount} record esposti)`,
          });
        } else {
          finish({
            protected: true,
            testedNs: nsHost,
            message: `AXFR correttamente rifiutato da ${nsHost} (RCODE: ${rcode === 5 ? 'REFUSED' : rcode})`,
          });
        }
      }
    });

    socket.on('close', () => {
      finish({
        protected: true,
        testedNs: nsHost,
        message: `Sessione TCP chiusa dal server ${nsHost} (Zone Transfer negato)`,
      });
    });
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawDomain = searchParams.get('domain');
  const domain = (rawDomain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = await validateSafeTarget(domain);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const validatedDomain = validation.target;

  try {
    // 1. MTA-STS (RFC 8461)
    let mtaStsEnabled = false;
    let mtaStsRecord = '';
    let mtaStsMode = 'none';
    let policyValid = false;

    try {
      const mtaTxts = await dns.resolveTxt(`_mta-sts.${validatedDomain}`).catch(() => []);
      const matched = mtaTxts.flat().find((r) => r.startsWith('v=STSv1'));
      if (matched) {
        mtaStsEnabled = true;
        mtaStsRecord = matched;

        // Verifica probing passivo HTTPS /.well-known/mta-sts.txt
        const policyUrl = `https://mta-sts.${validatedDomain}/.well-known/mta-sts.txt`;
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(policyUrl, { signal: controller.signal });
          clearTimeout(timer);

          if (res.ok) {
            const body = await res.text();
            policyValid = true;
            const modeMatch = body.match(/mode:\s*([a-zA-Z0-9]+)/i);
            if (modeMatch) {
              mtaStsMode = modeMatch[1].toLowerCase();
            }
          }
        } catch {
          policyValid = false;
        }
      }
    } catch {
      mtaStsEnabled = false;
    }

    // 2. BIMI (Brand Indicators for Message Identification)
    let bimiEnabled = false;
    let bimiRecord = '';
    let logoUrl = '';
    let vmcUrl = '';
    let hasVmc = false;

    try {
      const bimiTxts = await dns.resolveTxt(`default._bimi.${validatedDomain}`).catch(() => []);
      const matchedBimi = bimiTxts.flat().find((r) => r.startsWith('v=BIMI1'));
      if (matchedBimi) {
        bimiEnabled = true;
        bimiRecord = matchedBimi;
        const logoMatch = matchedBimi.match(/l=([^;]+)/);
        if (logoMatch) logoUrl = logoMatch[1].trim();
        const certMatch = matchedBimi.match(/a=([^;]+)/);
        if (certMatch && certMatch[1].trim()) {
          vmcUrl = certMatch[1].trim();
          hasVmc = true;
        }
      }
    } catch {
      bimiEnabled = false;
    }

    // 3. DNS Zone Transfer (AXFR) su Name Server primario autoritativo
    let axfrResult: { protected: boolean; testedNs: string; message: string; skipped?: boolean } = {
      protected: true,
      testedNs: 'N/A',
      message: 'Nessun Name Server autoritativo rilevato',
      skipped: true,
    };

    try {
      const nsRecords = await dns.resolveNs(validatedDomain).catch(() => []);
      if (nsRecords.length > 0) {
        const primaryNs = nsRecords[0];
        const nsIps = await hostIsPublic(primaryNs);
        if (nsIps) {
          const nsLookup = createPinnedLookup(nsIps);
          axfrResult = await checkAxfr(validatedDomain, primaryNs, 2500, nsLookup);
        } else {
          axfrResult = {
            protected: true,
            testedNs: primaryNs,
            message: 'Name Server non risolve a IP pubblico: test AXFR saltato',
            skipped: true,
          };
        }
      }
    } catch {
      axfrResult = {
        protected: true,
        testedNs: 'N/A',
        message: 'Risoluzione Name Server non riuscita (test AXFR non eseguibile)',
        skipped: true,
      };
    }

    // 4. MX Discovery, STARTTLS & DANE TLSA
    let mxStarttls: MxStarttlsInfo | null = null;
    let daneInfo: DaneInfo = { enabled: false, queryHost: '', command: '' };
    let primaryMx = '';
    const danglingMxList: Array<{ exchange: string; priority: number }> = [];

    try {
      const mxRecords = await dns.resolveMx(validatedDomain).catch(() => []);
      if (mxRecords.length > 0) {
        // Ordina per priorità ascendente (priorità minore = MX preferito)
        const sortedMx = [...mxRecords].sort((a, b) => a.priority - b.priority);
        primaryMx = sortedMx[0].exchange;

        // Verifica Dangling MX: solo NXDOMAIN (ENOTFOUND) su A e AAAA; timeout/SERVFAIL/NODATA non sono prova di orfano; null MX (RFC 7505) escluso
        await Promise.all(
          sortedMx.map(async (mx) => {
            if (!mx.exchange || mx.exchange === '.') return;
            const nx = (p: Promise<unknown>) => p.then(() => false).catch((e: NodeJS.ErrnoException) => e.code === 'ENOTFOUND');
            const [nx4, nx6] = await Promise.all([nx(dns.resolve4(mx.exchange)), nx(dns.resolve6(mx.exchange))]);
            if (nx4 && nx6) {
              danglingMxList.push({ exchange: mx.exchange, priority: mx.priority });
            }
          })
        );

        // Esegue verifica STARTTLS (solo su MX con IP pubblico) e DANE su host MX primario
        const mxIps = primaryMx && primaryMx !== '.' ? await hostIsPublic(primaryMx) : null;
        const mxLookup = mxIps ? createPinnedLookup(mxIps) : undefined;
        const [starttlsRes, daneRes] = await Promise.all([
          mxIps
            ? checkMxStarttls(primaryMx, 4000, mxLookup)
            : Promise.resolve<MxStarttlsInfo>({
              tested: false,
              mxHost: primaryMx,
              supportsStarttls: false,
              error: 'MX assente o non risolto a IP pubblico: probe porta 25 saltato',
              opensslCommand: `openssl s_client -starttls smtp -connect ${primaryMx}:25`,
            }),
          checkDaneTlsa(primaryMx),
        ]);
        mxStarttls = starttlsRes;
        daneInfo = daneRes;
      }
    } catch {
      // Ignora errori di parsing secondari
    }

    // 5. Calcolo Punteggio Ponderato (0-100)
    let score = 0;

    // AXFR: 25 punti (solo se il test è stato eseguito)
    if (axfrResult.protected && !axfrResult.skipped) {
      score += 25;
    }

    // MTA-STS: 25 punti
    if (mtaStsEnabled && policyValid && mtaStsMode === 'enforce') {
      score += 25;
    } else if (mtaStsEnabled) {
      score += 15;
    }

    // STARTTLS su MX: 25 punti solo se verificato (porta 25 filtrata/non testabile = nessun punto)
    if (mxStarttls?.supportsStarttls) {
      score += 25;
    }

    // BIMI: 15 punti
    if (bimiEnabled && hasVmc) {
      score += 15;
    } else if (bimiEnabled) {
      score += 10;
    }

    // DANE TLSA: 10 punti
    if (daneInfo.enabled) {
      score += 10;
    }

    // Determina stato e raccomandazioni
    let status: 'pass' | 'warning' | 'fail' = 'pass';
    let message = 'Hardening trasporto email e crittografia mail server conformi';
    let recommendation = 'Tutti i controlli di hardening Mail Server e DNS Access Control sono protetti.';

    if (danglingMxList.length > 0) {
      status = 'fail';
      message = `Rilevato record MX orfano/dangling (${danglingMxList.map((m) => m.exchange).join(', ')})`;
      recommendation = 'Rimuovi immediatamente i record MX orfani che puntano a host non registrati per prevenire il dirottamento totale delle email.';
    } else if (!axfrResult.protected) {
      status = 'fail';
      message = `Zone Transfer AXFR esposto su ${axfrResult.testedNs}`;
      recommendation = 'Disabilita immediatamente il trasferimento di zona DNS non autenticato per prevenire reconnaissance esterna.';
    } else if (mxStarttls && mxStarttls.tested && !mxStarttls.supportsStarttls) {
      status = 'warning';
      message = `Server MX primario (${primaryMx}) non supporta STARTTLS`;
      recommendation = 'Abilita la crittografia opportunistica STARTTLS sul server di posta per proteggere le comunicazioni in transito.';
    } else if (score < 50) {
      status = 'warning';
      message = 'MTA-STS o BIMI non configurati; AXFR e MX protetti';
      recommendation = 'Implementa MTA-STS (RFC 8461) e record BIMI con certificato VMC per proteggere il recapito email.';
    } else if (score < 80) {
      status = 'warning';
      message = 'Hardening parziale: configurazione email avanzata incompleta';
      recommendation = mtaStsMode !== 'enforce'
        ? 'Passa la policy MTA-STS da testing a enforce per bloccare attacchi di downgrade TLS.'
        : 'Associa un certificato VMC valido al record BIMI per la verifica del marchio.';
    }

    return NextResponse.json({
      status,
      score,
      message,
      recommendation,
      mtaSts: {
        enabled: mtaStsEnabled,
        mode: mtaStsMode,
        record: mtaStsRecord,
        policyValid,
      },
      bimi: {
        enabled: bimiEnabled,
        record: bimiRecord,
        logoUrl,
        vmcUrl,
        hasVmc,
      },
      starttls: mxStarttls,
      scoreNote: mxStarttls && !mxStarttls.tested ? 'STARTTLS non verificabile (porta 25 filtrata o MX non testabile): 25 punti non assegnati' : undefined,
      dane: daneInfo,
      danglingMx: {
        detected: danglingMxList.length > 0,
        count: danglingMxList.length,
        danglingList: danglingMxList,
      },
      axfr: axfrResult,
      mitre: {
        mha: 'D3-MHA (Mail Server Hardening & STARTTLS Enforcement)',
        dnsa: 'D3-DNSA (DNS Access Control & Dangling MX Protection)',
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Errore durante la verifica Email Armor';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
