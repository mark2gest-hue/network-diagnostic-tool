'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Activity, Lock, Mail, ArrowRight } from 'lucide-react';

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
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 p-4 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-purple-600/20 blur-3xl rounded-full pointer-events-none -z-10" />

      <Card className="w-full max-w-md glass-panel border border-zinc-800/80 text-white shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="space-y-3 pb-6 pt-8 px-8 text-center border-b border-zinc-800/50 bg-zinc-900/30">
          <div className="mx-auto p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 w-fit">
            <Activity className="w-6 h-6" />
          </div>

          <div>
            <CardTitle className="text-2xl font-black tracking-tight">
              {mode === 'login' ? 'Bentornato' : 'Crea Nuovo Account'}
            </CardTitle>
            <CardDescription className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
              {mode === 'login' 
                ? 'Accedi per sincronizzare lo storico dei test diagnostici su Turso'
                : 'Registrati in pochi secondi per salvare i report delle tue scansioni'}
            </CardDescription>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex p-1 rounded-xl bg-zinc-950/80 border border-zinc-800/80 mt-2">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'register' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Registrati
            </button>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 px-8 pt-6">
            {error && (
              <div className="rounded-xl bg-red-500/10 p-3.5 text-xs text-red-400 border border-red-500/20 leading-relaxed animate-in fade-in">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold text-zinc-300">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@azienda.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-zinc-900/90 border-zinc-700/70 pl-10 text-white text-sm focus:ring-2 focus:ring-blue-500 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-semibold text-zinc-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder={mode === 'register' ? 'Minimo 6 caratteri' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-zinc-900/90 border-zinc-700/70 pl-10 text-white text-sm focus:ring-2 focus:ring-blue-500 rounded-xl"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 px-8 pb-8 pt-2">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-5 rounded-xl shadow-lg shadow-blue-600/25 border border-blue-400/20 transition-all text-sm"
              disabled={loading}
            >
              {loading ? (
                <span>Elaborazione in corso...</span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {mode === 'login' ? 'Accedi alla Dashboard' : 'Crea Account'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            <div className="text-center text-xs text-zinc-400 pt-1">
              <Link href="/" className="hover:text-white transition-colors underline underline-offset-4">
                Oppure continua come ospite senza account
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
