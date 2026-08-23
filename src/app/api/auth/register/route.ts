import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signJwt } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email e password sono obbligatori' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La password deve contenere almeno 6 caratteri' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Controlla se l'utente esiste già
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ? LIMIT 1',
      args: [cleanEmail]
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Un utente con questa email esiste già' }, { status: 409 });
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const createdAt = new Date().toISOString();

    await db.execute({
      sql: 'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
      args: [id, cleanEmail, passwordHash, createdAt]
    });

    const token = await signJwt({ userId: id, email: cleanEmail });

    const response = NextResponse.json({ success: true, user: { id, email: cleanEmail } }, { status: 201 });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Errore durante la registrazione' }, { status: 500 });
  }
}
