'use client';

import { useState, useEffect } from 'react';
import { 
  History, 
  X, 
  Calendar, 
  ShieldCheck, 
  Flame, 
  Globe, 
  Wifi,
  RefreshCw,
  GitCompare
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScanDiffViewer } from './dashboard/ScanDiffViewer';
import { ScanDiffResult } from '@/types/findings';

interface HistoryEntry {
  id: string;
  test_type: string;
  target: string;
  results: Record<string, unknown>;
  created_at: string;
}

export function HistoryDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffResult, setDiffResult] = useState<ScanDiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch {
      // Ignora errore non bloccante
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (selectedIds.length !== 2) return;
    setDiffLoading(true);
    setDiffOpen(true);
    try {
      const res = await fetch('/api/history/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previousId: selectedIds[1],
          currentId: selectedIds[0],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDiffResult(data);
      }
    } catch (err) {
      console.error('Diff error:', err);
    } finally {
      setDiffLoading(false);
    }
  };

  const getTestIcon = (type: string) => {
    if (type.includes('vulnerabilit')) return Flame;
    if (type.includes('security')) return ShieldCheck;
    if (type.includes('internal') || type.includes('wifi')) return Wifi;
    return Globe;
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs rounded-xl px-3.5 h-8 gap-1.5 transition-all"
      >
        <History className="w-3.5 h-3.5 text-blue-400" />
        <span>Cronologia</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Storico Test & Diffing</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Compare Bar if items selected */}
            {selectedIds.length > 0 && (
              <div className="p-3 bg-blue-950/40 border-b border-blue-900/50 flex items-center justify-between text-xs">
                <span className="text-blue-300 font-medium">
                  {selectedIds.length}/2 scansioni selezionate per il diffing
                </span>
                <Button
                  onClick={handleCompare}
                  disabled={selectedIds.length !== 2}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white h-7 text-xs gap-1.5 rounded-lg disabled:opacity-40"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  Confronta (Diff)
                </Button>
              </div>
            )}

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                  <span className="text-xs">Caricamento storico da Turso...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-20 text-zinc-500 space-y-2">
                  <Calendar className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-sm font-medium">Nessun test salvato</p>
                  <p className="text-xs text-zinc-600">I test eseguiti compariranno qui per il confronto temporale.</p>
                </div>
              ) : (
                history.map((item) => {
                  const Icon = getTestIcon(item.test_type);
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/50' 
                          : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-0"
                          />
                          <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-xs text-zinc-200 capitalize truncate max-w-[160px]">
                            {item.test_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono bg-zinc-900 border-zinc-800 text-zinc-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pl-6">
                        <span className="text-blue-300 truncate max-w-[200px]">{item.target}</span>
                        <span className="text-[10px] text-zinc-600">
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 flex justify-between items-center bg-zinc-950 text-xs text-zinc-500">
              <span>{history.length} scansioni registrate</span>
              <Button
                onClick={fetchHistory}
                size="sm"
                variant="ghost"
                className="text-zinc-400 hover:text-white h-7 text-xs"
              >
                Aggiorna
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Diff Viewer Modal */}
      <ScanDiffViewer
        isOpen={diffOpen}
        onClose={() => setDiffOpen(false)}
        diffResult={diffResult}
        loading={diffLoading}
      />
    </>
  );
}

