'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { transactionsApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Loader2, ArrowRightLeft } from 'lucide-react';

export default function TransactionsPage() {
  const { user } = useAuth();
  const isAdmin  = ['admin','agent','distributor','manager','cashier'].includes(user?.role?.slug ?? '');

  const [type,   setType]   = useState('');
  const [status, setStatus] = useState('');
  const [from,   setFrom]   = useState('');
  const [to,     setTo]     = useState('');
  const [page,   setPage]   = useState(1);
  const perPage = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', { type, status, from, to, page, perPage, isAdmin }],
    queryFn: () => {
      const params = {
        type:     type   || undefined,
        status:   status || undefined,
        from:     from   || undefined,
        to:       to     || undefined,
        page,
        per_page: perPage,
      };
      return isAdmin
        ? transactionsApi.adminList(params).then((r) => r.data)
        : transactionsApi.myTransactions(params).then((r) => r.data);
    },
    placeholderData: (prev: any) => prev,
  });

  const txs: any[] = data?.data ?? [];
  const meta       = data?.meta  ?? { total: 0, last_page: 1, current_page: 1 };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h2 className="page-title">Transactions</h2>
          <p className="page-subtitle">{meta.total} total transaction{meta.total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card card-body !py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="input w-full sm:w-36">
            <option value="">All types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
            <option value="adjustment">Adjustment</option>
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input w-full sm:w-36">
            <option value="">All status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="input w-full sm:w-40"
            placeholder="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="input w-full sm:w-40"
            placeholder="To date"
          />
          {(type || status || from || to) && (
            <button
              onClick={() => { setType(''); setStatus(''); setFrom(''); setTo(''); setPage(1); }}
              className="btn-secondary !px-3 whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Amount</th>
              <th>Balance Before</th>
              <th>Balance After</th>
              <th>Reason</th>
              <th>Status</th>
              {isAdmin && <th>User ID</th>}
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="py-14 text-center">
                  <Loader2 className="h-7 w-7 animate-spin text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Loading transactions…</p>
                </td>
              </tr>
            )}
            {!isLoading && txs.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="py-14 text-center">
                  <ArrowRightLeft className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No transactions found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting the date filters</p>
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
                    <span className="capitalize text-sm font-medium text-slate-700">{tx.type}</span>
                  </div>
                </td>
                <td>
                  <span className={cn(
                    'font-mono font-bold tabular-nums',
                    tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600',
                  )}>
                    {tx.type === 'credit' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                  </span>
                </td>
                <td className="font-mono text-slate-500 text-sm">${parseFloat(tx.balance_before).toFixed(2)}</td>
                <td className="font-mono text-slate-500 text-sm">${parseFloat(tx.balance_after).toFixed(2)}</td>
                <td className="max-w-[200px]">
                  <p className="truncate text-sm text-slate-600" title={tx.reason}>{tx.reason}</p>
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
                {isAdmin && (
                  <td className="text-slate-500 text-xs font-mono">#{tx.user_id}</td>
                )}
                <td className="text-xs text-slate-400 whitespace-nowrap">{formatDate(tx.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600 px-1">
          <span className="text-slate-500">
            Showing {(meta.current_page - 1) * perPage + 1}–{Math.min(meta.current_page * perPage, meta.total)} of {meta.total}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm gap-1">
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-medium text-slate-700">
              {page} / {meta.last_page}
            </span>
            <button onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} className="btn-secondary btn-sm gap-1">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
