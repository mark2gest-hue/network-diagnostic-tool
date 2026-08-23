import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import { targetSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('target');

  const validation = targetSchema.safeParse(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  const cleanTarget = validation.data;

  try {
    let ipToLookup = cleanTarget;

    // Se l'input è un nome a dominio, risolviamo prima il suo IP
    const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(cleanTarget);
    if (!isIp) {
      const resolved = await dns.resolve4(cleanTarget);
      if (resolved.length > 0) {
        ipToLookup = resolved[0];
      }
    }

    let ptrHostnames: string[] = [];
    try {
      ptrHostnames = await dns.reverse(ipToLookup);
    } catch {
      ptrHostnames = [];
    }

    const hasPtr = ptrHostnames.length > 0;

    return NextResponse.json({
      target: cleanTarget,
      ip: ipToLookup,
      hasPtr,
      hostnames: ptrHostnames,
      status: hasPtr ? 'pass' : 'warning',
      message: hasPtr
        ? `Record PTR Reverse DNS valido: ${ptrHostnames.join(', ')}.`
        : `Nessun record PTR (Reverse DNS) configurato per l'IP ${ipToLookup}.`,
      recommendation: hasPtr
        ? 'Configurazione Reverse DNS valida e conforme alle policy anti-spam.'
        : 'Configura un record PTR (rDNS) presso il provider dell\'IP, specialmente per mail server e host di produzione.'
    });
  } catch {
    return NextResponse.json({ error: 'Risoluzione Reverse DNS fallita' }, { status: 500 });
  }
}
