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

  const cleanTarget = validation.data;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Eseguiamo la richiesta in HTTP puro (porta 80)
    const res = await fetch(`http://${cleanTarget}`, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal
    });
    clearTimeout(timeout);

    const status = res.status;
    const location = res.headers.get('location') || '';
    const isRedirect = status === 301 || status === 302 || status === 307 || status === 308;
    const redirectsToHttps = isRedirect && location.toLowerCase().startsWith('https://');
    const isPermanent = status === 301 || status === 308;

    let evalStatus: 'pass' | 'warning' | 'fail' = 'fail';
    let message = '';

    if (redirectsToHttps && isPermanent) {
      evalStatus = 'pass';
      message = `Redirect permanente HTTP -> HTTPS attivo (${status} -> ${location}).`;
    } else if (redirectsToHttps) {
      evalStatus = 'warning';
      message = `Redirect a HTTPS presente ma temporaneo (${status} -> ${location}). È consigliato un 301/308 permanente.`;
    } else {
      evalStatus = 'fail';
      message = `Il server risponde su HTTP (${status}) senza reindirizzare automaticamente a HTTPS!`;
    }

    return NextResponse.json({
      status: evalStatus,
      httpStatus: status,
      locationHeader: location || 'Nessun redirect',
      redirectsToHttps,
      isPermanent,
      message,
      recommendation: evalStatus === 'pass'
        ? 'Configurazione HTTPS enforcing ottimale.'
        : 'Configura il web server o il reverse proxy per reindirizzare tutte le richieste HTTP in chiaro a HTTPS con codice di stato 301.'
    });
  } catch {
    return NextResponse.json({ 
      status: 'warning',
      message: 'Porta HTTP (80) non accessibile o chiusa. Il server potrebbe accettare solo connessioni dirette HTTPS.',
      recommendation: 'Verifica che il redirect da HTTP standard sia attivo per i client che digitano l\'URL senza prefisso https://.'
    });
  }
}
