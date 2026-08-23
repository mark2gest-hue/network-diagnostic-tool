'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Activity, LogOut, LogIn } from 'lucide-react';
import { User } from '@/types/tests';
import { HistoryDrawer } from './HistoryDrawer';
import { ManualModal } from './ManualModal';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.refresh();
  };

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50 transition-all">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-black text-xl text-white tracking-tight group">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <span className="flex items-center">
            Network<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Diag</span>
          </span>
          <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Ops Pro
          </span>
        </Link>

        {/* Live Status indicator & Navigation */}
        <nav className="flex items-center gap-2.5 sm:gap-3">
          <ManualModal />
          <HistoryDrawer />

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px]">Engine Online</span>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Account</span>
                <span className="text-xs font-mono font-medium text-zinc-200">{user.email}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout} 
                className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Esci</span>
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 border border-blue-400/20 px-4 transition-all"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Accedi / Registrati
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
