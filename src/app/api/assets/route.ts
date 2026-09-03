import { NextResponse } from 'next/server';
import { db, ensureTables } from '@/lib/db';
import { getSession } from '@/lib/auth';
import crypto from 'crypto';
import { Asset } from '@/types/assets';

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
      sql: 'SELECT * FROM assets WHERE user_id = ? OR user_id = ? ORDER BY created_at DESC',
      args: [userId, 'demo'],
    });

    const assets: Asset[] = result.rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      target: row.target as string,
      environment: (row.environment as Asset['environment']) || 'production',
      criticality: (row.criticality as Asset['criticality']) || 'high',
      owner: (row.owner as string) || undefined,
      tags: row.tags ? JSON.parse(row.tags as string) : [],
      notes: (row.notes as string) || undefined,
      created_at: (row.created_at as string) || new Date().toISOString(),
    }));


    return NextResponse.json(assets);
  } catch (error) {
    console.error('Failed to fetch assets:', error);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await ensureTables();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  }
  const userId = session.userId;

  try {
    const body = await req.json();
    const { name, target, environment = 'production', criticality = 'high', owner, tags = [], notes } = body;

    if (!name || !target) {
      return NextResponse.json({ error: 'Nome e Target sono campi obbligatori' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const tagsJson = JSON.stringify(tags);

    await db.execute({
      sql: `INSERT INTO assets (id, user_id, name, target, environment, criticality, owner, tags, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, name, target, environment, criticality, owner || null, tagsJson, notes || null, createdAt],
    });

    const newAsset: Asset = {
      id,
      name,
      target,
      environment,
      criticality,
      owner,
      tags,
      notes,
      created_at: createdAt,
    };

    return NextResponse.json(newAsset, { status: 201 });
  } catch (error) {
    console.error('Failed to create asset:', error);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  await ensureTables();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  }
  const userId = session.userId;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID asset mancante' }, { status: 400 });
    }

    // Un utente può cancellare solo i propri asset, mai quelli demo
    await db.execute({
      sql: 'DELETE FROM assets WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Failed to delete asset:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
