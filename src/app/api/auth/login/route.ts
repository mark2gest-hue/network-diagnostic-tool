import { NextResponse } from 'next/server';
import { db, ensureTables } from '@/lib/db';
import { verifyPassword, signJwt } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password sono obbligatori' }, { status: 400 });
    }

    await ensureTables();

    const result = await db.execute({
      sql: 'SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1',
      args: [email.toLowerCase().trim()]
    });

    const user = result.rows[0] as unknown as { id: string; email: string; password_hash: string } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 });
    }

    const token = await signJwt({ userId: user.id, email: user.email });

    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
    
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Errore interno del server';
    return NextResponse.json({ error: `Errore database: ${message}` }, { status: 500 });
  }
}
