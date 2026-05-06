'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { walletApi, transactionsApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Wallet, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function WalletPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data: balance } = useQuery({
    queryKey: ['wallet-balance', user?.id],
    queryFn:  () => walletApi.getBalance(user!.id).then((r) => r.data.data),
    enabled:  !!user,
    refetchInterval: 15_000,
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['my-wallet-txs', page],
    queryFn:  () => transactionsApi.myTransactions({ page, per_page: perPage }).then((r) => r.data),
    enabled:  !!user,
    placeholderData: (prev: any) => prev,
  });

  const txs: any[]  = txData?.data ?? [];
  const meta        = txData?.meta  ?? { total: 0, last_page: 1, current_page: 1 };
  const bal         = parseFloat(balance?.balance ?? user?.balance ?? '0');
  const currency    = balance?.currency ?? user?.currency ?? 'USD';

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">My Wallet</h2>
          <p className="page-subtitle">Your balance and transaction history</p>
        </div>
      </div>

      {/* Balance card */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Available Balance</p>
              <p className="text-white/70 text-xs">{user?.username} · {currency}</p>
            </div>
          </div>
          <p className="text-5xl font-bold text-white tabular-nums">
            ${bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Quick stats */}
        {txData && (
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
            {[
              {
                label: 'Total Credits',
                value: txs.filter((t) => t.type === 'credit').reduce((s, t) => s + parseFloat(t.amount), 0),
                color: 'text-emerald-600',
              },
              {
                label: 'Total Debits',
                value: txs.filter((t) => t.type === 'debit').reduce((s, t) => s + parseFloat(t.amount), 0),
                color: 'text-red-600',
              },
              {
                label: 'Transactions',
                value: meta.total,
                isCount: true,
                color: 'text-blue-600',
              },
            ].map(({ label, value, color, isCount }) => (
              <div key={label} className="p-4 text-center">
                <p className={cn('text-lg font-bold tabular-nums', color)}>
                  {isCount ? value : `$${(value as number).toFixed(2)}`}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Transaction History</h3>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance After</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {txLoading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="h-7 w-7 animate-spin text-slate-300 mx-auto mb-2" />
                  </td>
                </tr>
              )}
              {!txLoading && txs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Wallet className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No transactions yet</p>
                  </td>
                </tr>
              )}
              {txs.map((tx: any) => (
                <tr key={tx.transaction_id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0',
                        tx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600',
                      )}>
                        {tx.type === 'credit'
                          ? <ArrowUpRight className="h-3.5 w-3.5" />
                          : <ArrowDownRight className="h-3.5 w-3.5" />}
                      </div>
                      <span className="capitalize text-sm font-medium">{tx.type}</span>
                    </div>
                  </td>
                  <td>
                    <span className={cn(
                      'font-mono font-bold',
                      tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600',
                    )}>
                      {tx.type === 'credit' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                    </span>
                  </td>
                  <td className="font-mono text-slate-500">${parseFloat(tx.balance_after).toFixed(2)}</td>
                  <td className="max-w-[200px]">
                    <p className="truncate text-sm text-slate-600">{tx.reason}</p>
                  </td>
                  <td>
                    <span className={cn(
                      'badge capitalize',
                      tx.status === 'completed' ? 'badge-green' :
                      tx.status === 'failed'    ? 'badge-red'   : 'badge-yellow',
                    )}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="text-xs text-slate-400 whitespace-nowrap">{formatDate(tx.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta.last_page > 1 && (
          <div className="flex items-center justify-end gap-2 mt-4">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm gap-1">
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-sm text-slate-600 px-2">{page} / {meta.last_page}</span>
            <button onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} className="btn-secondary btn-sm gap-1">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
