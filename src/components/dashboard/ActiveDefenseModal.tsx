'use client';

import React, { useState } from 'react';
import { ShieldAlert, Bell, Zap, X, Check, Lock, AlertTriangle, Send } from 'lucide-react';

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
        setTestStatusMessage('✅ Alert inviato con successo sul canale Telegram!');
      } else if (data.message) {
        setTestStatusMessage(`ℹ️ ${data.message}`);
      } else if (data.warning) {
        setTestStatusMessage(`⚠️ ${data.warning}: ${data.telegramError || ''}`);
      }
    } catch {
      setTestStatusMessage('❌ Errore durante l’invio dell’allarme di prova.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#0b101c] border border-[#1e2d45] rounded-lg max-w-xl w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#182338] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-[#450a0a] text-[#f87171] border border-[#b91c1c]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Sentinel: Active Defense & Alerting
              </h3>
              <p className="text-[11px] text-[#94a3b8]">
                Protezione attiva perimetrale e notifiche incidenti per {target}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Panic Mode / Lockdown */}
        <div className={`p-4 rounded border transition-all ${
          panicModeActive
            ? 'bg-[#450a0a]/30 border-[#b91c1c] shadow-[0_0_20px_rgba(239,68,68,0.2)]'
            : 'bg-[#0f172a] border-[#1e293b]'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Zap className={`w-4 h-4 ${panicModeActive ? 'text-[#ef4444] animate-pulse' : 'text-[#f59e0b]'}`} />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Panic Mode / Attacco in Corso
                </h4>
              </div>
              <p className="text-[11px] text-[#94a3b8] mt-1">
                Forza la modalità "Under Attack" WAF e blocca le connessioni da IP esteri/anomali.
              </p>
            </div>
            <button
              onClick={togglePanicMode}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all shrink-0 cursor-pointer ${
                panicModeActive
                  ? 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
                  : 'bg-[#1e293b] text-[#fbbf24] border border-[#d97706] hover:bg-[#b45309] hover:text-white'
              }`}
            >
              {panicModeActive ? 'Disattiva Blocco' : 'Attiva Lockdown'}
            </button>
          </div>
          {panicModeActive && (
            <div className="mt-3 p-2 bg-[#450a0a]/60 rounded text-[11px] text-[#fca5a5] flex items-center gap-2 border border-[#991b1b]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Protezione massima attiva: JavaScript challenge abilitato per tutti i visitatori.</span>
            </div>
          )}
        </div>

        {/* Section 2: Alert Telegram */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-4 rounded space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#00f0ff]" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Alert Istantanei Telegram (SOC / Sistemista)
            </h4>
          </div>
          <p className="text-[11px] text-[#94a3b8]">
            Ricevi un messaggio su Telegram appena viene rilevato un picco di traffico anomalo, una porta aperta o un disservizio DNS.
          </p>

          <form onSubmit={handleSaveTelegram} className="space-y-2.5">
            <div>
              <label className="text-[10px] uppercase font-bold text-[#64748b] block mb-1">
                Chat ID Telegram / Canale Alert
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="es. -100123456789"
                className="w-full bg-[#070b14] border border-[#1e2d45] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-[#64748b] block mb-1">
                Bot Token (Opzionale / Personalizzato)
              </label>
              <input
                type="password"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                className="w-full bg-[#070b14] border border-[#1e2d45] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f0ff]"
              />
            </div>

            {testStatusMessage && (
              <div className="p-2 rounded bg-[#070b14] border border-[#1e2d45] text-xs text-[#00f0ff] animate-in fade-in">
                {testStatusMessage}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={sendTestAlert}
                disabled={isSendingTest}
                className="bg-[#1e293b] hover:bg-[#334155] text-[#38bdf8] text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer border border-[#0284c7]/40 disabled:opacity-50"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{isSendingTest ? 'Invio in corso...' : 'Invia Alert di Prova'}</span>
              </button>

              <button
                type="submit"
                className="bg-[#00f0ff] hover:bg-[#38bdf8] text-black text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.3)] ml-auto"
              >
                {isSaved ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isSaved ? 'Configurazione Salvata!' : 'Salva Canale Alert'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#1e293b] hover:bg-[#334155] text-xs font-bold text-white transition-all cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
