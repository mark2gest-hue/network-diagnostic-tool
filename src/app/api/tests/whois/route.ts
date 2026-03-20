import { NextResponse } from 'next/server';
import net from 'net';
import { domainSchema } from '@/lib/validators';

function queryWhois(domain: string, server: string = 'whois.iana.org'): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = net.connect(43, server, () => {
      client.write(domain + '\r\n');
    });

    let data = '';
    client.on('data', (chunk) => {
      data += chunk.toString();
    });

    client.on('end', () => {
      resolve(data);
    });

    client.on('error', (err) => {
      reject(err);
    });

    client.setTimeout(10000, () => {
      client.destroy();
      reject(new Error('Whois query timed out'));
    });
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');

  const validation = domainSchema.safeParse(domain);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  try {
    // Basic multi-hop whois: query IANA first to find the regional whois server
    const ianaResult = await queryWhois(domain!);
    
    // Simple parsing to find "whois:" or "refer:" server
    const referMatch = ianaResult.match(/(?:refer|whois):\s*([a-z0-9.-]+)/i);
    let finalResult = ianaResult;
    
    if (referMatch && referMatch[1]) {
      try {
        finalResult = await queryWhois(domain!, referMatch[1]);
      } catch {
        // Fallback to IANA if regional fails
      }
    }

    // Basic extraction
    const registrar = finalResult.match(/Registrar:\s*(.*)/i)?.[1]?.trim() || 'Unknown';
    const expiry = finalResult.match(/(?:Expiry Date|Expiration Date|free-date):\s*(.*)/i)?.[1]?.trim() || 'Unknown';
    const nameservers = Array.from(finalResult.matchAll(/Name Server:\s*([a-z0-9.-]+)/gi)).map(m => m[1]);

    return NextResponse.json({
      raw: finalResult,
      registrar,
      expiry,
      nameservers
    });
  } catch (error) {
    console.error('Whois error:', error);
    return NextResponse.json({ error: 'Whois lookup failed' }, { status: 500 });
  }
}
