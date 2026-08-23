import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import { domainSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');

  const validation = domainSchema.safeParse(domain);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  try {
    let caaRecords: unknown[] = [];
    try {
      caaRecords = await dns.resolveCaa(domain!);
    } catch {
      // Nessun record CAA trovato
      caaRecords = [];
    }

    const hasCaa = caaRecords && caaRecords.length > 0;

    return NextResponse.json({
      status: hasCaa ? 'pass' : 'warning',
      hasCaa,
      records: caaRecords,
      message: hasCaa 
        ? `Trovati ${caaRecords.length} record DNS CAA. Le Certificate Authority autorizzate sono esplicitamente dichiarate.`
        : 'Nessun record DNS CAA configurato. Qualsiasi CA pubblica valida potrebbe emettere certificati per il dominio.',
      recommendation: hasCaa
        ? 'Record CAA validati con successo.'
        : 'Aggiungi un record DNS CAA (es. issue "letsencrypt.org" o "digicert.com") per impedire emissioni non autorizzate di certificati SSL/TLS.'
    });
  } catch {
    return NextResponse.json({ error: 'Verifica record CAA fallita' }, { status: 500 });
  }
}
