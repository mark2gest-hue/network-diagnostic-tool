'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Activity, LogOut, LogIn, History } from 'lucide-react';
import { User } from '@/types/tests';

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
    <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
          <Activity className="text-blue-500 w-6 h-6" />
          <span>Network<span className="text-blue-500">Diag</span></span>
        </Link>

        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-zinc-500">Accesso come</span>
                <span className="text-sm font-medium text-zinc-200">{user.email}</span>
              </div>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" title="History">
                <History className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-zinc-800 hover:bg-zinc-900 border-zinc-700">
                <LogOut className="w-4 h-4 mr-2" />
                Scollegati
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-none">
                <LogIn className="w-4 h-4 mr-2" />
                Accedi
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
