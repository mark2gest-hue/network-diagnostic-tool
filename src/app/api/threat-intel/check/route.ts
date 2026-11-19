import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkStackWithOsvAndKev, StackCheckItem } from '@/lib/threat-intel-engine';

export const dynamic = 'force-dynamic';

const stackItemSchema = z.object({
  ecosystem: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(80),
});

const requestBodySchema = z.object({
  items: z.array(stackItemSchema).max(50).optional(),
  packageJson: z.string().max(250000).optional(),
});

function cleanSemverRange(raw: string): string | null {
  const trimmed = raw.trim();
  if (
    !trimmed ||
    trimmed === '*' ||
    trimmed === 'latest' ||
    trimmed.startsWith('workspace:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('git') ||
    trimmed.startsWith('http')
  ) {
    return null;
  }
  const match = trimmed.match(/(\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9.+~-]+)?)/);
  return match ? match[1] : null;
}

function extractItemsFromPackageJson(rawJson: string): StackCheckItem[] {
  const parsed = JSON.parse(rawJson) as {
    dependencies?: Record<string, unknown>;
    devDependencies?: Record<string, unknown>;
  };
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSON package.json non valido');
  }
  const items: StackCheckItem[] = [];
  const seen = new Set<string>();
  const addMap = (deps?: Record<string, unknown>) => {
    if (!deps || typeof deps !== 'object') return;
    for (const [name, rawVer] of Object.entries(deps)) {
      if (items.length >= 50) break;
      if (typeof rawVer !== 'string') continue;
      const ver = cleanSemverRange(rawVer);
      if (!ver) continue;
      const key = `npm::${name}::${ver}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ ecosystem: 'npm', name, version: ver });
    }
  };
  addMap(parsed.dependencies);
  addMap(parsed.devDependencies);
  return items;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Payload JSON non valido' }, { status: 400 });
  }

  const parsed = requestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parametri non validi: invia una lista items oppure packageJson.' },
      { status: 400 }
    );
  }

  let items: StackCheckItem[] = parsed.data.items ? [...parsed.data.items] : [];

  if (parsed.data.packageJson && parsed.data.packageJson.trim().length > 0) {
    try {
      const fromPkg = extractItemsFromPackageJson(parsed.data.packageJson);
      items = [...items, ...fromPkg].slice(0, 50);
    } catch {
      return NextResponse.json(
        { error: 'Impossibile leggere packageJson: verifica che sia un JSON valido.' },
        { status: 400 }
      );
    }
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: 'Nessun pacchetto con versione valida da analizzare.' },
      { status: 400 }
    );
  }

  try {
    const result = await checkStackWithOsvAndKev(items);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore analisi Threat Intelligence';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
