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
    <div className="flex flex-col gap-1 [&_button]:w-full [&_button]:justify-start">
      <HistoryDrawer />

      <button
        type="button"
        onClick={() => {
          setNotificationsOpen(true);
          setTimeout(updateAlertsCount, 300);
        }}
        className="flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.875rem] font-medium text-ink-2 hover:bg-hover hover:text-foreground"
      >
        <Bell className="size-4 shrink-0" aria-hidden="true" />
        Notifiche
        {unreadAlerts > 0 && (
          <span className="ml-auto rounded-full bg-accent-bg px-2 text-[0.8125rem] font-semibold text-accent">
            {unreadAlerts}<span className="sr-only"> non lette</span>
          </span>
        )}
      </button>

      {user ? (
        <div className="px-3 pt-1">
          <div className="truncate font-mono text-[0.8125rem] text-ink-3">{user.email}</div>
          <Button variant="ghost" onClick={handleLogout} className="-mx-3 text-[0.875rem] font-medium">
            <LogOut className="size-4" aria-hidden="true" />
            Esci
          </Button>
        </div>
      ) : (
        <Link
          href="/login"
          className="flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.875rem] font-medium text-ink-2 hover:bg-hover hover:text-foreground"
        >
          <LogIn className="size-4 shrink-0" aria-hidden="true" />
          Accedi / Registrati
        </Link>
      )}

      <NotificationCenterModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
}

