'use client';

import React, { useState } from 'react';
import { X, Bell, ShieldAlert, AlertTriangle, CheckCircle2, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SecurityAlert {
  id: string;
  fingerprint: string;
  type: 'ssl_expiry' | 'port_exposure' | 'file_leak' | 'score_drop' | 'dns_drift';
  severity: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  target: string;
  message: string;
  timestamp: string;
  read: boolean;
  occurrences: number;
}

const DEFAULT_ALERTS: SecurityAlert[] = [
  {
    id: 'alt-1',
    fingerprint: 'fp-port-6379-shop',
    type: 'port_exposure',
    severity: 'critical',
    title: 'Porta Critica Redis Esposta su IP Pubblico',
    target: 'shop.fashion-global.com',
    message: 'Porta 6379/TCP aperta senza autenticazione rilevata durante l’ultimo deploy #148.',
    timestamp: '27 Agosto 2026 - 18:30 UTC',
    read: false,
    occurrences: 3,
  },
  {
    id: 'alt-2',
    fingerprint: 'fp-file-env-shop',
    type: 'file_leak',
    severity: 'critical',
    title: 'Leak File Sensibile: /.env Rilevato',
    target: 'shop.fashion-global.com',
    message: 'File di configurazione contenente credenziali DB e chiavi API scaricabile pubblicamente (HTTP 200).',
    timestamp: '27 Agosto 2026 - 18:30 UTC',
    read: false,
    occurrences: 2,
  },
  {
    id: 'alt-3',
    fingerprint: 'fp-ssl-k8s-stage',
    type: 'ssl_expiry',
    severity: 'high',
    title: 'Certificato SSL in Scadenza Imminente (3 Giorni)',
    target: 'k8s-stage.internal-dev.net',
    message: 'Certificato Let’s Encrypt in scadenza il 30 Agosto 2026. Necessario rinnovo ACME cert-manager.',
    timestamp: '27 Agosto 2026 - 12:00 UTC',
    read: false,
    occurrences: 5,
  },
  {
    id: 'alt-4',
    fingerprint: 'fp-drift-ecom',
    type: 'score_drop',
    severity: 'high',
    title: 'Crollo Postura EASM (Delta: -67 pt)',
    target: 'shop.fashion-global.com',
    message: 'Il punteggio di sicurezza è crollato da 95 (A) a 28 (F) a seguito delle modifiche introdotte nella release.',
    timestamp: '27 Agosto 2026 - 18:30 UTC',
    read: true,
    occurrences: 1,
  },
];

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>(DEFAULT_ALERTS);

  if (!isOpen) return null;

  const markAllAsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const getSeverityBadge = (sev: SecurityAlert['severity']) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl flex flex-col max-h-[85vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Centro Notifiche & Alert Deduplicati
                {unreadCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono font-bold">
                    {unreadCount} non letti
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Monitoraggio proattivo degli eventi perimetrali con deduplicazione automatica dei falsi allarmi.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 px-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Totale alert unici: <strong className="text-slate-200">{alerts.length}</strong>
          </span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-indigo-300 hover:text-white h-7 px-2.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                Segna tutti come letti
              </Button>
            )}
            {alerts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllAlerts}
                className="text-xs text-slate-400 hover:text-rose-300 h-7 px-2.5"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Svuota
              </Button>
            )}
          </div>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {alerts.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
              <span>Nessuna notifica presente. Il perimetro infrastrutturale è presidiato.</span>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all text-xs space-y-2 ${
                  alert.read
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-75'
                    : 'bg-slate-950/80 border-slate-800 shadow-md ring-1 ring-indigo-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1">
                    {alert.severity === 'critical' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    )}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-sm">{alert.title}</span>
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded border font-mono font-bold uppercase ${getSeverityBadge(
                            alert.severity
                          )}`}
                        >
                          {alert.severity}
                        </span>
                        {alert.occurrences > 1 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                            Deduplicato {alert.occurrences}x
                          </span>
                        )}
                      </div>
                      <p className="text-indigo-300 font-mono text-[11px]">{alert.target}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-slate-500 hover:text-slate-300 p-1 transition-colors"
                    title="Rimuovi alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-slate-300 leading-relaxed pl-6.5">{alert.message}</p>

                <div className="flex items-center justify-between pl-6.5 pt-1 text-[10px] text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    {alert.timestamp}
                  </span>
                  <span>Fingerprint: {alert.fingerprint}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
