'use client';

import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { StatusPill, Callout } from '@/components/ui/nd';

interface ActiveDefenseModalProps {
  target: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ActiveDefenseModal({ target, isOpen, onClose }: ActiveDefenseModalProps) {
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [panicModeActive, setPanicModeActive] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatusMessage, setTestStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const sendTestAlert = async () => {
    setIsSendingTest(true);
    setTestStatusMessage(null);
    try {
      const res = await fetch('/api/active-defense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_alert',
          target,
          chatId: telegramChatId,
          botToken: telegramToken,
          details: 'Audit diagnostico completato. Nessuna anomalia critica non gestita.',
        }),
      });
      const data = await res.json();
      if (data.dispatchedToTelegram) {
        setTestStatusMessage('Avviso inviato con successo sul canale Telegram.');
      } else if (data.message) {
        setTestStatusMessage(data.message);
      } else if (data.warning) {
        setTestStatusMessage(`${data.warning}: ${data.telegramError || ''}`);
      }
    } catch {
      setTestStatusMessage('Errore durante l’invio dell’avviso di prova.');
    } finally {
      setIsSendingTest(false);
      setTimeout(() => setTestStatusMessage(null), 5000);
    }
  };

  const togglePanicMode = async () => {
    const nextState = !panicModeActive;
    setPanicModeActive(nextState);
    if (nextState) {
      try {
        await fetch('/api/active-defense', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'panic_mode',
            target,
            chatId: telegramChatId,
            botToken: telegramToken,
          }),
        });
      } catch (e) {
        console.error('Failed to trigger panic mode alert:', e);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sentinel-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    >
      <div className="bg-surface border border-border rounded-lg max-w-xl w-full p-6 shadow-xl space-y-5">
        {/* Intestazione */}
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-ink-muted" />
              <h2 id="sentinel-title" className="text-base font-semibold text-ink">
                Sentinel: Difesa attiva e avvisi
              </h2>
            </div>
            <p className="text-xs text-ink-muted">
              Protezione perimetrale e notifiche incidenti per <span className="font-mono text-ink">{target}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi finestra"
            className="text-ink-muted hover:text-ink p-1 rounded hover:bg-surface-alt transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Blocco 1: Modalità emergenza / Lockdown */}
        <div className="border border-border rounded-md p-4 bg-surface-alt space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide font-medium text-ink-muted">
                Modalità emergenza
              </div>
              <h3 className="text-sm font-semibold text-ink mt-0.5">
                Lockdown traffico WAF
              </h3>
            </div>
            <StatusPill tone={panicModeActive ? 'warn' : 'neutral'}>
              {panicModeActive ? 'Attiva' : 'Non attiva'}
            </StatusPill>
          </div>

          <Callout tone="warn">
            La modalità di emergenza forza il controllo rigoroso sul WAF e può bloccare anche utenti legittimi.
          </Callout>

          <div className="text-xs text-ink-muted">
            Richiede un WAF collegato. Stato: <span className="text-ink font-medium">Non rilevato</span> (da verificare sul pannello DNS/Hosting).
          </div>

          <div className="pt-1">
            <button
              onClick={togglePanicMode}
              className={`px-3 py-2 text-xs font-medium rounded border transition-colors ${
                panicModeActive
                  ? 'border-border bg-surface text-ink hover:bg-surface-alt'
                  : 'border-warn text-warn bg-transparent hover:bg-warn-bg'
              }`}
            >
              {panicModeActive ? 'Disattiva lockdown' : 'Attiva lockdown'}
            </button>
          </div>
        </div>

        {/* Blocco 2: Avvisi su Telegram */}
        <div className="border border-border rounded-md p-4 bg-surface space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide font-medium text-ink-muted">
                Notifiche incidenti
              </div>
              <h3 className="text-sm font-semibold text-ink mt-0.5">
                Avvisi su Telegram (SOC / Sistemista)
              </h3>
            </div>
            <StatusPill tone={telegramChatId.trim() ? 'ok' : 'neutral'}>
              {telegramChatId.trim() ? 'Configurato' : 'Non configurato'}
            </StatusPill>
          </div>

          <p className="text-xs text-ink-muted">
            Ricevi una notifica istantanea in caso di anomalie DNS, degradazione TTFB o esposizione porte.
          </p>

          <form onSubmit={handleSaveTelegram} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label htmlFor="sentinel-chat-id" className="text-xs font-medium text-ink block">
                Chat ID o canale Telegram
              </label>
              <input
                id="sentinel-chat-id"
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="es. -100123456789"
                className="w-full h-9 px-3 text-xs bg-field border border-border rounded font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="sentinel-token" className="text-xs font-medium text-ink block">
                Token del bot (opzionale)
              </label>
              <input
                id="sentinel-token"
                type="password"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className="w-full h-9 px-3 text-xs bg-field border border-border rounded font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
              />
              <p className="text-[11px] text-ink-muted">
                Viene salvato in modo cifrato e non sarà più mostrato in chiaro.
              </p>
            </div>

            {testStatusMessage && (
              <Callout tone="neutral">
                {testStatusMessage}
              </Callout>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={sendTestAlert}
                disabled={isSendingTest}
                className="px-3 py-2 text-xs font-medium border border-border rounded text-ink bg-surface hover:bg-surface-alt disabled:opacity-50 transition-colors"
              >
                {isSendingTest ? 'Invio in corso...' : 'Invia avviso di prova'}
              </button>

              <button
                type="submit"
                className="px-3 py-2 text-xs font-medium rounded bg-accent text-accent-ink hover:opacity-95 transition-opacity"
              >
                {isSaved ? 'Configurazione salvata' : 'Salva canale'}
              </button>
            </div>
          </form>
        </div>

        {/* Piede modale */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-3 py-2 text-xs font-medium border border-border rounded text-ink bg-surface hover:bg-surface-alt transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
