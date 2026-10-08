import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import net from 'net';
import { domainSchema, formatZodError } from '@/lib/validators';

export const dynamic = 'force-dynamic';

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

function checkAxfr(domain: string, nsHost: string, timeoutMs = 2500): Promise<{ protected: boolean; testedNs: string; message: string }> {
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

    socket.connect(53, nsHost, () => {
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

  const validation = domainSchema.safeParse(domain);
  if (!validation.success) {
    return NextResponse.json({ error: formatZodError(validation.error) }, { status: 400 });
  }

  const validatedDomain = validation.data;

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
    let axfrResult = {
      protected: true,
      testedNs: 'N/A',
      message: 'Nessun Name Server autoritativo rilevato',
    };

    try {
      const nsRecords = await dns.resolveNs(validatedDomain).catch(() => []);
      if (nsRecords.length > 0) {
        const primaryNs = nsRecords[0];
        axfrResult = await checkAxfr(validatedDomain, primaryNs);
      }
    } catch {
      axfrResult = {
        protected: true,
        testedNs: 'N/A',
        message: 'Risoluzione Name Server non riuscita (test AXFR non eseguibile)',
      };
    }

    // 4. Calcolo Punteggio Ponderato (0-100)
    let score = 0;

    // AXFR: 35 punti
    if (axfrResult.protected) {
      score += 35;
    }

    // MTA-STS: 35 punti
    if (mtaStsEnabled && policyValid && mtaStsMode === 'enforce') {
      score += 35;
    } else if (mtaStsEnabled) {
      score += 20;
    }

    // BIMI: 30 punti
    if (bimiEnabled && hasVmc) {
      score += 30;
    } else if (bimiEnabled) {
      score += 20;
    }

    // Determina stato e raccomandazioni
    let status: 'pass' | 'warning' | 'fail' = 'pass';
    let message = 'Hardening trasporto email e protezione DNS conformi';
    let recommendation = 'Tutti i controlli di hardening Mail Server e DNS Access Control sono protetti.';

    if (!axfrResult.protected) {
      status = 'fail';
      message = `Zone Transfer AXFR esposto su ${axfrResult.testedNs}`;
      recommendation = 'Disabilita immediatamente il trasferimento di zona DNS non autenticato per prevenire reconnaissance esterna.';
    } else if (score < 50) {
      status = 'warning';
      message = 'MTA-STS o BIMI non configurati; AXFR protetto';
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
      axfr: axfrResult,
      mitre: {
        mha: 'D3-MHA (Mail Server Hardening)',
        dnsa: 'D3-DNSA (DNS Access Control)',
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Errore durante la verifica Email Armor';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
