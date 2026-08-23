'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // non-json response
      }

      if (res.ok) {
        window.location.assign('/');
      } else {
        setError(data.error || `Errore HTTP ${res.status}: Impossibile completare l'operazione`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-white shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-center mb-2">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {mode === 'login' ? 'Accesso' : 'Crea Account'}
            </CardTitle>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
            </button>
          </div>
          <CardDescription className="text-zinc-400">
            {mode === 'login' 
              ? 'Inserisci le tue credenziali per visualizzare e salvare la cronologia dei test'
              : 'Crea un account per iniziare a salvare la cronologia dei test'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder={mode === 'register' ? 'Minimo 6 caratteri' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 focus:ring-blue-500"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
              disabled={loading}
            >
              {loading 
                ? (mode === 'login' ? 'Accesso in corso...' : 'Creazione account...') 
                : (mode === 'login' ? 'Accedi' : 'Registrati')}
            </Button>
            <div className="text-center text-sm text-zinc-400">
              <Link href="/" className="hover:text-white transition-colors">
                Continua come ospite
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
