'use client';

import React, { useState, useEffect } from 'react';
import { Asset, AssetEnvironment, AssetCriticality } from '@/types/assets';
import { X, Server, Plus, Trash2, Search, Tag, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AssetInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTarget: (target: string) => void;
}

export const AssetInventoryModal: React.FC<AssetInventoryModalProps> = ({
  isOpen,
  onClose,
  onSelectTarget,
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newEnv, setNewEnv] = useState<AssetEnvironment>('production');
  const [newCrit, setNewCrit] = useState<AssetCriticality>('high');
  const [newOwner, setNewOwner] = useState('');
  const [newTags, setNewTags] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (err) {
      console.error('Error fetching assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newTarget) return;

    const tagsArray = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          target: newTarget,
          environment: newEnv,
          criticality: newCrit,
          owner: newOwner,
          tags: tagsArray,
        }),
      });

      if (res.ok) {
        setNewName('');
        setNewTarget('');
        setNewOwner('');
        setNewTags('');
        setShowAddForm(false);
        fetchAssets();
      }
    } catch (err) {
      console.error('Error adding asset:', err);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      const res = await fetch(`/api/assets?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error('Error deleting asset:', err);
    }
  };

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.target.toLowerCase().includes(search.toLowerCase()) ||
      a.environment.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Enterprise Asset Inventory & Criticality Matrix
              </h2>
              <p className="text-xs text-slate-400">
                Gestisci e monitora i tuoi perimetri raggruppati per ambiente, criticità e owner.
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

        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/30">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca asset per nome, dominio o ambiente..."
              className="bg-slate-950/60 border-slate-800 pl-9 text-xs font-mono h-9"
            />
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 gap-1.5 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Aggiungi Nuovo Asset
          </Button>
        </div>

        {/* Add Form Expandable */}
        {showAddForm && (
          <form onSubmit={handleAddAsset} className="p-4 bg-slate-950/90 border-b border-indigo-500/30 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nome Asset</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Es. API Core Banking"
                  required
                  className="bg-slate-900 border-slate-800 h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Target (Dominio / IP)</label>
                <Input
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="Es. api.example.com"
                  required
                  className="bg-slate-900 border-slate-800 h-8 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Ambiente</label>
                <select
                  value={newEnv}
                  onChange={(e) => setNewEnv(e.target.value as AssetEnvironment)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md h-8 text-xs text-slate-200 px-2"
                >
                  <option value="production">Production (Moltiplicatore 1.5x)</option>
                  <option value="staging">Staging (1.0x)</option>
                  <option value="development">Development (0.6x)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Livello di Criticità</label>
                <select
                  value={newCrit}
                  onChange={(e) => setNewCrit(e.target.value as AssetCriticality)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md h-8 text-xs text-slate-200 px-2"
                >
                  <option value="critical">Critical (Tier 1)</option>
                  <option value="high">High (Tier 2)</option>
                  <option value="medium">Medium (Tier 3)</option>
                  <option value="low">Low (Tier 4)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Owner / Team Responsabile</label>
                <Input
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  placeholder="Es. SecOps Team (secops@domain.com)"
                  className="bg-slate-900 border-slate-800 h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Tag (separati da virgola)</label>
                <Input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Es. PCI-DSS, E-Commerce, Kubernetes"
                  className="bg-slate-900 border-slate-800 h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="text-xs h-7">
                Annulla
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7">
                Salva Asset
              </Button>
            </div>
          </form>
        )}

        {/* Assets List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs">Caricamento catalogo asset...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              Nessun asset registrato. Aggiungi il tuo primo dominio o IP per catalogarlo.
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-100 text-sm">{asset.name}</span>
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        asset.environment === 'production'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : asset.environment === 'staging'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}
                    >
                      {asset.environment}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        asset.criticality === 'critical'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      Tier: {asset.criticality}
                    </span>
                  </div>

                  <p className="font-mono text-indigo-300">{asset.target}</p>

                  <div className="flex items-center gap-4 text-slate-400 text-[11px] flex-wrap">
                    {asset.owner && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" /> {asset.owner}
                      </span>
                    )}
                    {asset.tags && asset.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-500" />
                        {asset.tags.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    onClick={() => {
                      onSelectTarget(asset.target);
                      onClose();
                    }}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 rounded-lg"
                  >
                    Avvia Audit
                  </Button>
                  <button
                    onClick={() => handleDeleteAsset(asset.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Elimina asset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
