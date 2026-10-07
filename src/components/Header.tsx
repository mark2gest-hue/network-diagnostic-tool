'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, LogIn, Bell } from 'lucide-react';
import { User } from '@/types/tests';
import { HistoryDrawer } from './HistoryDrawer';
import { NotificationCenterModal } from './dashboard/NotificationCenterModal';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);
  const router = useRouter();

  const updateAlertsCount = () => {
    try {
      const saved = localStorage.getItem('networkdiag_alerts_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setUnreadAlerts(parsed.filter((a: { read?: boolean }) => !a.read).length);
          return;
        }
      }
      setUnreadAlerts(0);
    } catch {
      setUnreadAlerts(0);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null));

    updateAlertsCount();
    window.addEventListener('storage', updateAlertsCount);
    const interval = setInterval(updateAlertsCount, 3000);
    return () => {
      window.removeEventListener('storage', updateAlertsCount);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.refresh();
  };

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50 transition-all">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Aiutiamoci Impresa Badge */}
        <Link href="/" className="flex items-center gap-3 font-black text-xl text-white tracking-tight group">
          <div className="relative flex items-center justify-center p-1 rounded-xl bg-slate-900 border border-slate-800 shadow-md group-hover:scale-105 transition-transform">
            <img
              src="/images/logo_icon_dark.png"
              alt="Aiutiamoci Impresa"
              className="h-8 w-8 object-contain shrink-0"
            />
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-black text-lg tracking-tight text-white flex items-center">
                Network<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Diag</span>
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30">
                Ops Pro
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wide mt-1 flex items-center gap-1">
              by <span className="text-slate-200 font-bold">aiutiamoci</span> <span className="text-[8.5px] font-bold uppercase text-blue-400 bg-blue-500/15 border border-blue-500/25 px-1 py-0.2 rounded">Impresa</span>
            </span>
          </div>
        </Link>

        {/* Live Status indicator & Navigation */}
        <nav className="flex items-center gap-2 sm:gap-3">
          {/* Notification Center Trigger */}
          <button
            onClick={() => {
              setNotificationsOpen(true);
              setTimeout(updateAlertsCount, 300);
            }}
            className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="Centro Notifiche & Alert di Sicurezza"
          >
            <Bell className="w-4 h-4 text-violet-400" />
            {unreadAlerts > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-md animate-pulse">
                {unreadAlerts}
              </span>
            )}
          </button>

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

      {/* Notification Center Modal */}
      <NotificationCenterModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </header>
  );
}

