import { NextResponse } from 'next/server';
import { validateSafeTarget } from '@/lib/validators';
import { createPinnedLookup } from '@/lib/security-guard';
import { safeFetch } from '@/lib/safe-http-probe';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('target');

  // Risolve il DNS e blocca target privati/riservati (anti-SSRF), non solo il formato stringa.
  const validation = await validateSafeTarget(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const cleanTarget = validation.target;
  const url = cleanTarget.startsWith('http') ? cleanTarget : `https://${cleanTarget}`;
  // Pinna il DNS agli IP validati: elimina la finestra TOCTOU/DNS Rebinding
  const lookup = createPinnedLookup(validation.resolvedIps);

  try {
    const startTime = Date.now();
    const response = await safeFetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'NetworkDiagTool/1.0',
      },
      lookup,
      redirect: 'manual', // We want to track the chain
    });
    const endTime = Date.now();

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const redirectChain = [];
    if (response.status >= 300 && response.status < 400) {
      redirectChain.push(headers['location'] || 'Unknown redirect');
    }

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      responseTime: endTime - startTime,
      headers,
      redirectChain
    });
  } catch (error) {
    console.error('HTTP error:', error);
    // Try fallback to http if https failed
    if (url.startsWith('https://')) {
      try {
        const startTime = Date.now();
        const response = await safeFetch(url.replace('https', 'http'), {
          lookup,
          redirect: 'manual' // non seguire redirect verso target interni
        });
        const endTime = Date.now();
        return NextResponse.json({
          status: response.status,
          statusText: response.statusText,
          responseTime: endTime - startTime,
          headers: Object.fromEntries(response.headers.entries()),
          redirectChain: []
        });
      } catch {
        // Both https and http failed
      }
    }
    return NextResponse.json({ error: 'HTTP request failed' }, { status: 500 });
  }
}
