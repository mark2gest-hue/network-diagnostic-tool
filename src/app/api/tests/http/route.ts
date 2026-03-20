import { NextResponse } from 'next/server';
import { targetSchema } from '@/lib/validators';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('target');
  const url = target!.startsWith('http') ? target! : `https://${target}`;

  const validation = targetSchema.safeParse(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'NetworkDiagTool/1.0',
      },
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
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 5000);
            const startTime = Date.now();
            const response = await fetch(url.replace('https', 'http'), { 
              signal: controller.signal 
            });
            clearTimeout(id);
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
