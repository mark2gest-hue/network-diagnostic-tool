import { NextResponse } from 'next/server';
import { db, ensureTables } from '@/lib/db';
import { getSession } from '@/lib/auth';
import crypto from 'crypto';
import { WebhookConfig } from '@/types/assets';

export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureTables();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  }
  const userId = session.userId;

  try {
    const result = await db.execute({
      sql: 'SELECT * FROM webhook_configs WHERE user_id = ? OR user_id = ? ORDER BY created_at DESC',
      args: [userId, 'demo'],
    });

    const webhooks: WebhookConfig[] = result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      provider: (row.provider as WebhookConfig['provider']) || 'slack',
      url: row.url as string,
      enabled: Boolean(row.enabled),
      alertOnCritical: true,
      alertOnDrift: true,
      created_at: (row.created_at as string) || new Date().toISOString(),
    }));


    return NextResponse.json(webhooks);
  } catch (error) {
    console.error('Failed to fetch webhooks:', error);
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await ensureTables();
  const session = await getSession();

  try {
    const body = await req.json();
    const { action, name, url, provider = 'slack', target, driftData } = body;

    // Se è un test di invio notifica
    if (action === 'test_notification') {
      const webhookUrl = url;
      if (!webhookUrl) {
        return NextResponse.json({ error: 'URL webhook mancante' }, { status: 400 });
      }

      const payload = {
        title: `🚨 [SECURITY ALERT] Attack Surface Drift Rilevato`,
        target: target || 'shop.fashion-global.com',
        timestamp: new Date().toISOString(),
        scoreDelta: driftData?.scoreDelta ?? -63,
        details: driftData?.summary || 'Rilevate nuove porte aperte (6379) e file sensibili esposti (.env).',
        actionRequired: 'Verificare immediatamente la configurazione firewall del cluster.',
      };

      return NextResponse.json({
        success: true,
        message: `Notifica di simulazione ${provider.toUpperCase()} inviata con successo`,
        dispatchedPayload: payload,
      });
    }

    // Altrimenti è creazione di un webhook config
    if (!session) {
      return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
    }
    const userId = session.userId;

    if (!name || !url) {
      return NextResponse.json({ error: 'Nome e URL sono campi obbligatori' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO webhook_configs (id, user_id, name, provider, url, enabled, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?)`,
      args: [id, userId, name, provider, url, createdAt],
    });

    const newWebhook: WebhookConfig = {
      id,
      name,
      provider,
      url,
      enabled: true,
      alertOnCritical: true,
      alertOnDrift: true,
      created_at: createdAt,
    };

    return NextResponse.json(newWebhook, { status: 201 });
  } catch (error) {
    console.error('Failed to handle webhook:', error);
    return NextResponse.json({ error: 'Failed to handle webhook' }, { status: 500 });
  }
}
