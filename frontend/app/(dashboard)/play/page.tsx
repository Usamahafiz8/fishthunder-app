'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, Play, StopCircle, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { gamesApi, sessionsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, cn } from '@/lib/utils';

export default function PlayPage() {
  const { user } = useAuth();
  const qc       = useQueryClient();

  const { data: games = [] } = useQuery({
    queryKey: ['games', 'active'],
    queryFn:  () => gamesApi.list({ status: 'active' }).then(r => r.data.data),
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['sessions', 'active'],
    queryFn:  () => sessionsApi.active().then(r => r.data.data),
  });

  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [activeSession, setActiveSession] = useState<any>(null);
  const [bet, setBet] = useState('');
  const [lastSpin, setLastSpin] = useState<any>(null);

  // Pick up any existing active session when game is selected
  const handleSelectGame = (game: any) => {
    setSelectedGame(game);
    const existing = activeSessions.find((s: any) => s.gameId === game.id);
    setActiveSession(existing ?? null);
    setBet(game.minBet);
    setLastSpin(null);
  };

  const startMutation = useMutation({
    mutationFn: ({ gameId, amount }: { gameId: number; amount: number }) =>
      sessionsApi.start({ gameId, transferAmount: amount }),
    onSuccess: (res) => {
      const session = res.data.data;
      setActiveSession(session);
      setTransferAmount('');
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(`Session started — $${parseFloat(session.sessionBalance).toFixed(2)} loaded.`);
    },
    onError: (e: any) => {
      const err = e.response?.data;
      if (err?.error === 'session_exists') {
        toast.error('You already have an active session for this game.');
        qc.invalidateQueries({ queryKey: ['sessions'] });
      } else {
        toast.error(err?.message ?? 'Failed to start session.');
      }
    },
  });

  const endMutation = useMutation({
    mutationFn: (sessionId: string) => sessionsApi.end(sessionId, 'Player cashed out'),
    onSuccess: (res) => {
      const returned = parseFloat(res.data.data?.sessionBalance ?? '0');
      setActiveSession(null);
      setLastSpin(null);
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(`Session ended — balance returned to wallet.`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to end session.'),
  });

  const spinMutation = useMutation({
    mutationFn: ({ sessionId, betAmount }: { sessionId: string; betAmount: number }) =>
      sessionsApi.spin(sessionId, betAmount, uuidv4()),
    onSuccess: (res) => {
      const spin = res.data.data;
      setLastSpin(spin);
      setActiveSession((prev: any) => prev ? { ...prev, sessionBalance: spin.balanceAfter } : prev);
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Spin failed.'),
  });

  const handleSpin = () => {
    if (!activeSession || !bet) return;
    spinMutation.mutate({ sessionId: activeSession.sessionId, betAmount: parseFloat(bet) });
  };

  const isSpinning = spinMutation.isPending;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-base font-semibold text-slate-900">Play</h1>
        <p className="text-sm text-slate-500 mt-0.5">Select a game, load your balance, and play</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Game picker */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-3">Available Games</p>
          {games.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No active games</p>
          ) : (
            <div className="space-y-1.5">
              {games.map((g: any) => (
                <button
                  key={g.id}
                  onClick={() => handleSelectGame(g)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg border transition-colors text-sm',
                    selectedGame?.id === g.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700',
                  )}
                >
                  <p className="font-medium">{g.name}</p>
                  <p className={cn('text-xs mt-0.5', selectedGame?.id === g.id ? 'text-slate-300' : 'text-slate-400')}>
                    {g.type} · RTP {g.rtpTarget}% · ${g.minBet}–${g.maxBet}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Session + spin area */}
        <div className="lg:col-span-2 space-y-4">

          {!selectedGame ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-400">
              Select a game to get started
            </div>
          ) : !activeSession ? (
            /* Load session */
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-800 mb-1">{selectedGame.name}</p>
              <p className="text-xs text-slate-400 mb-4">Load balance from your wallet to start playing</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label">Transfer amount ($)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={e => setTransferAmount(e.target.value)}
                    className="input"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Wallet balance: {formatCurrency(user?.balance ?? '0')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => startMutation.mutate({ gameId: selectedGame.id, amount: parseFloat(transferAmount) })}
                disabled={!transferAmount || parseFloat(transferAmount) <= 0 || startMutation.isPending}
                className="btn-primary w-full mt-4"
              >
                {startMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting…</> : <><Play className="h-4 w-4" /> Start Session</>}
              </button>
            </div>
          ) : (
            /* Active session — spin interface */
            <div className="space-y-4">

              {/* Session info bar */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Session balance</p>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">
                    {formatCurrency(activeSession.sessionBalance)}
                  </p>
                </div>
                <button
                  onClick={() => endMutation.mutate(activeSession.sessionId)}
                  disabled={endMutation.isPending}
                  className="btn-danger"
                >
                  {endMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
                  Cash Out
                </button>
              </div>

              {/* Spin result display */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                {lastSpin ? (
                  <div>
                    <div className="text-4xl tracking-widest mb-3">
                      {lastSpin.outcomeData?.symbols?.join(' ') ?? '? ? ?'}
                    </div>
                    {lastSpin.outcomeData?.isWin ? (
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-emerald-600">
                          +{formatCurrency(lastSpin.winAmount)} — {lastSpin.outcomeData?.label}
                        </p>
                        <p className="text-xs text-slate-400">New balance: {formatCurrency(lastSpin.balanceAfter)}</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">No win this time</p>
                        <p className="text-xs text-slate-400">Balance: {formatCurrency(lastSpin.balanceAfter)}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-300 text-sm">Press spin to play</p>
                )}
              </div>

              {/* Bet + spin controls */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="label">Bet amount ($)</label>
                    <input
                      type="number"
                      min={selectedGame.minBet}
                      max={selectedGame.maxBet}
                      step="0.01"
                      value={bet}
                      onChange={e => setBet(e.target.value)}
                      className="input"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Min {formatCurrency(selectedGame.minBet)} · Max {formatCurrency(selectedGame.maxBet)}
                    </p>
                  </div>
                  <div className="flex gap-2 pb-6">
                    {['0.10','0.50','1.00','5.00'].map(v => (
                      <button key={v} onClick={() => setBet(v)} className={cn('btn-sm text-xs', bet === v ? 'btn-primary' : 'btn-secondary')}>
                        ${v}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleSpin}
                  disabled={isSpinning || !bet || parseFloat(bet) <= 0 || parseFloat(bet) > parseFloat(activeSession.sessionBalance)}
                  className="btn-primary w-full h-12 text-base mt-2"
                >
                  {isSpinning
                    ? <><Loader2 className="h-5 w-5 animate-spin" /> Spinning…</>
                    : <><Coins className="h-5 w-5" /> SPIN — Bet {bet ? formatCurrency(bet) : '$0.00'}</>}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
