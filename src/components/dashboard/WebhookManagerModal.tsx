'use client';

import React, { useState, useEffect } from 'react';
import { WebhookConfig, WebhookProvider } from '@/types/assets';
import { X, Bell, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WebhookManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: string;
}

export const WebhookManagerModal: React.FC<WebhookManagerModalProps> = ({
  isOpen,
  onClose,
  target,
}) => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const [testStatus, setTestStatus] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newProvider, setNewProvider] = useState<WebhookProvider>('slack');

  useEffect(() => {
    if (isOpen) {
      fetchWebhooks();
    }
  }, [isOpen]);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data);
      }
    } catch (err) {
      console.error('Error fetching webhooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUrl) return;

    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          url: newUrl,
          provider: newProvider,
        }),
      });

      if (res.ok) {
        setNewName('');
        setNewUrl('');
        fetchWebhooks();
      }
    } catch (err) {
      console.error('Error adding webhook:', err);
    }
  };

  const handleTestNotification = async (webhookUrl: string, provider: WebhookProvider) => {
    setTestStatus('Invio in corso...');
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_notification',
          url: webhookUrl,
          provider,
          target,
          driftData: {
            scoreDelta: -63,
            summary: 'Rilevata nuova porta Redis 6379 esposta e file .env leakato!',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTestStatus(`✓ ${data.message}`);
        setTimeout(() => setTestStatus(null), 4000);
      }
    } catch {
      setTestStatus('Errore invio notifica');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Alert Dispatcher & Webhooks (Slack / Discord)
              </h2>
              <p className="text-xs text-slate-400">
                Invia notifiche automatiche in tempo reale al verificarsi di un drift negativo o nuove vulnerabilità.
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

        {/* Form */}
        <form onSubmit={handleAddWebhook} className="p-4 border-b border-slate-800 bg-slate-950/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Nome Canale</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Es. #security-alerts"
                required
                className="bg-slate-900 border-slate-800 h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Provider</label>
              <select
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value as WebhookProvider)}
                className="w-full bg-slate-900 border border-slate-800 rounded-md h-8 text-xs text-slate-200 px-2"
              >
                <option value="slack">Slack Incoming Webhook</option>
                <option value="discord">Discord Webhook</option>
                <option value="teams">Microsoft Teams</option>
                <option value="generic">Generic JSON Webhook</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Webhook URL</label>
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                required
                className="bg-slate-900 border-slate-800 h-8 text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex justify-between items-center pt-1">
            {testStatus && <span className="text-xs text-emerald-400 font-mono">{testStatus}</span>}
            <div className="ml-auto">
              <Button type="submit" size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-8 gap-1.5 rounded-xl">
                <Plus className="w-4 h-4" />
                Registra Webhook
              </Button>
            </div>
          </div>
        </form>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-16 text-xs text-slate-500">Caricamento webhooks...</div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-500">
              Nessun webhook registrato. Aggiungi il webhook Slack o Discord del tuo team per ricevere alert immediati.
            </div>
          ) : (

            webhooks.map((wh) => (
              <div
                key={wh.id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{wh.name}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase">
                      {wh.provider}
                    </span>
                  </div>
                  <p className="font-mono text-slate-500 text-[11px] truncate max-w-md mt-0.5">{wh.url}</p>
                </div>
                <Button
                  onClick={() => handleTestNotification(wh.url, wh.provider)}
                  size="sm"
                  variant="outline"
                  className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs h-7 gap-1.5 rounded-lg"
                >
                  <Send className="w-3 h-3" />
                  Simula Alert
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
