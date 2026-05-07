'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Pencil, Power, PowerOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { gamesApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const TYPE_COLORS: Record<string, string> = {
  slot:    'bg-violet-100 text-violet-700',
  fishing: 'bg-blue-100 text-blue-700',
  table:   'bg-amber-100 text-amber-700',
};

const STATUS_COLORS: Record<string, string> = {
  active:   'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-600',
  disabled: 'bg-red-100 text-red-600',
};

export default function GamesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['games'],
    queryFn: () => gamesApi.list().then(r => r.data.data),
  });

  const disableMutation = useMutation({
    mutationFn: (id: number) => gamesApi.disable(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['games'] }); toast.success('Game disabled.'); },
    onError: () => toast.error('Failed to disable game.'),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Games</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your game registry</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-3.5 w-3.5" />New Game
        </button>
      </div>

      {showCreate && <GameForm onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['games'] }); }} />}
      {editId   && <GameForm gameId={editId} onClose={() => setEditId(null)} onSaved={() => { setEditId(null); qc.invalidateQueries({ queryKey: ['games'] }); }} />}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading games…</div>
        ) : games.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No games yet. Create one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Game</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Type</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500">RTP</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500">Bet range</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g: any) => (
                <tr key={g.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-800">{g.name}</p>
                    <p className="text-xs text-slate-400">{g.slug}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full capitalize', TYPE_COLORS[g.type] ?? 'bg-slate-100 text-slate-600')}>
                      {g.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full capitalize', STATUS_COLORS[g.status] ?? 'bg-slate-100 text-slate-600')}>
                      {g.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-700 tabular-nums">{g.rtpTarget}%</td>
                  <td className="px-5 py-3.5 text-right text-slate-500 text-xs tabular-nums">${g.minBet}–${g.maxBet}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditId(g.id)} className="btn-ghost btn-sm">
                        <Pencil className="h-3.5 w-3.5" />Edit
                      </button>
                      {g.status !== 'disabled' && (
                        <button onClick={() => disableMutation.mutate(g.id)} className="btn-danger btn-sm">
                          <PowerOff className="h-3.5 w-3.5" />Disable
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function GameForm({ gameId, onClose, onSaved }: { gameId?: number; onClose: () => void; onSaved: () => void }) {
  const qc  = useQueryClient();
  const { data: existing } = useQuery({
    queryKey: ['game', gameId],
    queryFn:  () => gamesApi.get(gameId!).then(r => r.data.data),
    enabled:  !!gameId,
  });

  const [form, setForm] = useState({
    name: existing?.name ?? '',
    slug: existing?.slug ?? '',
    type: existing?.type ?? 'slot',
    status: existing?.status ?? 'active',
    rtpTarget: existing?.rtpTarget ?? '96',
    minBet: existing?.minBet ?? '0.10',
    maxBet: existing?.maxBet ?? '100.00',
    description: existing?.description ?? '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => gameId ? gamesApi.update(gameId, data) : gamesApi.create(data),
    onSuccess: () => { toast.success(gameId ? 'Game updated.' : 'Game created.'); onSaved(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to save game.'),
  });

  const f = (k: string) => (e: any) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-800 mb-4">{gameId ? 'Edit Game' : 'New Game'}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="label">Name</label><input className="input" value={form.name} onChange={f('name')} placeholder="Golden Fish" /></div>
        <div><label className="label">Slug</label><input className="input" value={form.slug} onChange={f('slug')} placeholder="golden-fish" /></div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={f('type')}>
            <option value="slot">Slot</option>
            <option value="fishing">Fishing</option>
            <option value="table">Table</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={f('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div><label className="label">RTP Target (%)</label><input className="input" type="number" min="1" max="100" step="0.01" value={form.rtpTarget} onChange={f('rtpTarget')} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Min Bet ($)</label><input className="input" type="number" min="0.01" step="0.01" value={form.minBet} onChange={f('minBet')} /></div>
          <div><label className="label">Max Bet ($)</label><input className="input" type="number" min="0.01" step="0.01" value={form.maxBet} onChange={f('maxBet')} /></div>
        </div>
        <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input h-20 resize-none" value={form.description} onChange={f('description')} /></div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
        <button onClick={() => mutation.mutate({ ...form, rtpTarget: parseFloat(form.rtpTarget), minBet: parseFloat(form.minBet), maxBet: parseFloat(form.maxBet) })} disabled={mutation.isPending} className="btn-primary btn-sm">
          {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
