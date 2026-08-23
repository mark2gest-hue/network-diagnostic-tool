import { NextResponse } from 'next/server';
import { targetSchema } from '@/lib/validators';
import https from 'https';

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
    const timings = await new Promise<{
      dnsMs: number;
      tcpMs: number;
      tlsMs: number;
      ttfbMs: number;
      totalMs: number;
      statusCode: number;
      httpVersion: string;
    }>((resolve, reject) => {
      const startTime = performance.now();
      let dnsTime = 0;
      let tcpTime = 0;
      let tlsTime = 0;
      let ttfbTime = 0;

      const request = https.request({
        host: cleanTarget,
        port: 443,
        method: 'GET',
        path: '/',
        timeout: 7000,
        headers: {
          'User-Agent': 'NetworkDiagOps/1.0',
          'Accept': '*/*'
        }
      }, (res) => {
        ttfbTime = performance.now() - startTime;
        res.on('data', () => {});
        res.on('end', () => {
          const totalTime = performance.now() - startTime;
          resolve({
            dnsMs: Math.round(dnsTime),
            tcpMs: Math.round(Math.max(0, tcpTime - dnsTime)),
            tlsMs: Math.round(Math.max(0, tlsTime - tcpTime)),
            ttfbMs: Math.round(Math.max(0, ttfbTime - (tlsTime || tcpTime))),
            totalMs: Math.round(totalTime),
            statusCode: res.statusCode || 200,
            httpVersion: res.httpVersion || '1.1'
          });
        });
      });

      request.on('socket', (socket) => {
        socket.on('lookup', () => {
          dnsTime = performance.now() - startTime;
        });
        socket.on('connect', () => {
          tcpTime = performance.now() - startTime;
        });
        socket.on('secureConnect', () => {
          tlsTime = performance.now() - startTime;
        });
      });

      request.on('error', (err) => reject(err));
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Timeout durante la misurazione TTFB'));
      });

      request.end();
    });

    return NextResponse.json({
      target: cleanTarget,
      ...timings,
      status: timings.ttfbMs < 200 ? 'pass' : timings.ttfbMs < 600 ? 'warning' : 'fail',
      quality: timings.ttfbMs < 200 ? 'Eccellente (<200ms)' : timings.ttfbMs < 600 ? 'Buono (<600ms)' : 'Lento (>600ms)'
    });
  } catch {
    return NextResponse.json({ error: 'Misurazione TTFB fallita' }, { status: 500 });
  }
}
