import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await db.execute({
      sql: 'SELECT id, user_id, test_type, target, results, created_at FROM test_history WHERE user_id = ? ORDER BY created_at DESC',
      args: [session.userId]
    });

    const history = result.rows.map((row) => {
      let parsedResults = row.results;
      if (typeof row.results === 'string') {
        try {
          parsedResults = JSON.parse(row.results);
        } catch {
          parsedResults = row.results;
        }
      }
      return {
        id: row.id,
        user_id: row.user_id,
        test_type: row.test_type,
        target: row.target,
        results: parsedResults,
        created_at: row.created_at
      };
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Failed to fetch history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  
  try {
    const { test_type, target, results } = await req.json();
    const id = crypto.randomUUID();
    const resultsJson = typeof results === 'string' ? results : JSON.stringify(results);
    const userId = session?.userId || null;
    const createdAt = new Date().toISOString();

    await db.execute({
      sql: 'INSERT INTO test_history (id, user_id, test_type, target, results, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, userId, test_type, target || null, resultsJson, createdAt]
    });

    return NextResponse.json({
      id,
      user_id: userId,
      test_type,
      target,
      results,
      created_at: createdAt
    });
  } catch (error) {
    console.error('History save error:', error);
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}
