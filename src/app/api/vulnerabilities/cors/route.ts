import { NextResponse } from 'next/server';
import { targetSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target');
  const target = (rawTarget || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = targetSchema.safeParse(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  const validatedTarget = validation.data;
  const baseUrl = validatedTarget.startsWith('http') ? validatedTarget : `https://${validatedTarget}`;

  try {
    const testOrigin = 'https://evil-attacker-website.com';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'Origin': testOrigin,
        'Access-Control-Request-Method': 'GET'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    const allowOrigin = res.headers.get('access-control-allow-origin');
    const allowCredentials = res.headers.get('access-control-allow-credentials');
    const allowMethods = res.headers.get('access-control-allow-methods');

    let status: 'pass' | 'warning' | 'fail' = 'pass';
    let riskLevel = 'Basso / Sicuro';
    let message = 'La policy CORS è configurata correttamente o non espone endpoint sensibili.';

    if (allowOrigin === testOrigin && allowCredentials === 'true') {
      status = 'fail';
      riskLevel = 'Critico (Origin Reflection + Credentials)';
      message = 'Vulnerabilità CORS Grave: Il server riflette l\'header Origin arbitrario e accetta credenziali (cookie/token di sessione).';
    } else if (allowOrigin === '*') {
      if (allowCredentials === 'true') {
        status = 'fail';
        riskLevel = 'Alto (Wildcard con Credenziali)';
        message = 'Misconfigurazione CORS: Wildcard origin (*) associato a credenziali.';
      } else {
        status = 'warning';
        riskLevel = 'Informativo / Aperto';
        message = 'Policy CORS pubblica aperta a tutti gli Origin (Access-Control-Allow-Origin: *). Adatto per API pubbliche, rischioso per dashboard o dati privati.';
      }
    } else if (allowOrigin === testOrigin) {
      status = 'warning';
      riskLevel = 'Medio (Origin Reflection)';
      message = 'Il server riflette l\'Origin inviato dal client.';
    }

    return NextResponse.json({
      status,
      allowOrigin: allowOrigin || 'Nessuno (Restrittivo)',
      allowCredentials: allowCredentials || 'false',
      allowMethods: allowMethods || 'N/A',
      riskLevel,
      message,
      recommendation: status === 'pass'
        ? 'Nessuna azione necessaria. CORS protetto.'
        : 'Restringi la whitelist dei domini permessi in Access-Control-Allow-Origin a soli host fidati.'
    });
  } catch {
    return NextResponse.json({ error: 'Verifica policy CORS fallita' }, { status: 500 });
  }
}
