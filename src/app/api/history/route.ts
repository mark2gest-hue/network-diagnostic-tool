import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('test_history')
    .select('*')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getSession();
  // We allow saving without auth if you just want to track it in memory, 
  // but for DB persistence we need session or we save as guest (null user_id)
  
  try {
    const { test_type, target, results } = await req.json();

    const { data, error } = await supabaseAdmin
      .from('test_history')
      .insert({
        user_id: session?.userId || null,
        test_type,
        target,
        results
      })
      .select()
      .single();

    if (error) {
      console.error('History save error:', error);
      return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
