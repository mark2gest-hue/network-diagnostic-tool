import { NextResponse } from 'next/server';
import { targetSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const SECURITY_HEADERS = [
  { name: 'Strict-Transport-Security', impact: 'Previene il downgrade dell\'attacco a HTTP.' },
  { name: 'Content-Security-Policy', impact: 'Protegge da XSS e iniezioni di dati.' },
  { name: 'X-Frame-Options', impact: 'Protegge dal clickjacking.' },
  { name: 'X-Content-Type-Options', impact: 'Previene il MIME sniffing.' },
  { name: 'Referrer-Policy', impact: 'Controlla quali informazioni di referral vengono inviate.' },
  { name: 'Permissions-Policy', impact: 'Controlla quali funzionalità del browser sono disponibili.' }
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target');
  const target = (rawTarget || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = targetSchema.safeParse(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  const validatedTarget = validation.data;
  const url = validatedTarget.startsWith('http') ? validatedTarget : `https://${validatedTarget}`;

  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    const headers = response.headers;

    const audit = SECURITY_HEADERS.map(header => {
      const value = headers.get(header.name);
      return {
        header: header.name,
        present: !!value,
        value: value || 'Mancante',
        status: value ? 'pass' : 'fail',
        impact: header.impact
      };
    });

    const missingCount = audit.filter(h => !h.present).length;

    return NextResponse.json({
      status: missingCount > 2 ? 'fail' : (missingCount > 0 ? 'warning' : 'pass'),
      message: missingCount === 0 ? 'Tutti gli header di sicurezza sono presenti' : `Mancano ${missingCount} header di sicurezza`,
      audit,
      recommendation: missingCount > 0 
        ? 'Configura gli header mancanti sul tuo server web (Nginx/Apache/Vercel) per migliorare la sicurezza.' 
        : 'Ottimo lavoro! Il tuo server web è configurato in modo sicuro.'
    });
  } catch {
    return NextResponse.json({ error: 'Impossibile connettersi al server per controllare gli header' }, { status: 500 });
  }
}
