'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, Users, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi, transactionsApi } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-400', agent: 'bg-orange-400', distributor: 'bg-amber-400',
  manager: 'bg-green-400', cashier: 'bg-blue-400', player: 'bg-violet-400',
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white border border-slate-200 shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500 capitalize">{p.name}</span>
          <span className="font-semibold text-slate-900 ml-auto">${p.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const canManage = ['admin','agent','distributor','manager','cashier'].includes(user?.role?.slug ?? '');

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn:  () => adminApi.stats().then(r => r.data.data),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const { data: chart } = useQuery({
    queryKey: ['chart'],
    queryFn:  () => adminApi.chartData().then(r => r.data.data),
    enabled: !!user,
  });

  const { data: txRes } = useQuery({
    queryKey: ['dash-tx'],
    queryFn:  () => transactionsApi.myTransactions({ per_page: 8 }).then(r => r.data),
    enabled: !!user,
  });

  const tx30    = stats?.transactions_30d ?? {};
  const byRole  = stats?.users_by_role   ?? {};
  const total   = stats?.total_users     ?? 0;
  const txs     = txRes?.data            ?? [];
  const chartPts = Array.isArray(chart) ? chart : [];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Welcome back, {user?.username}</p>
        </div>
        {canManage && (
          <Link href="/users/create" className="btn-primary">
            <Plus className="h-3.5 w-3.5" />
            New User
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Total Users"
          value={total.toLocaleString()}
          sub="In your hierarchy"
        />
        <Stat
          label="Network Balance"
          value={formatCurrency(stats?.total_balance ?? '0')}
          sub="All wallets"
        />
        <Stat
          label="Credits (30d)"
          value={formatCurrency(tx30.credit_amount ?? '0')}
          sub={`${tx30.credits ?? 0} transactions`}
        />
        <Stat
          label="Debits (30d)"
          value={formatCurrency(tx30.debit_amount ?? '0')}
          sub={`${tx30.debits ?? 0} transactions`}
        />
      </div>

      {/* Chart + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-800">Transaction Volume</p>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-800 inline-block" />Credits
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 inline-block" />Debits
              </span>
            </div>
          </div>
          {chartPts.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-slate-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartPts} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#0f172a" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#94a3b8" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<ChartTip />} cursor={{ stroke: '#e2e8f0' }} />
                <Area type="monotone" dataKey="credits" name="Credits" stroke="#0f172a" strokeWidth={1.5} fill="url(#g1)" dot={false} activeDot={{ r: 3, fill: '#0f172a', strokeWidth: 0 }} />
                <Area type="monotone" dataKey="debits"  name="Debits"  stroke="#94a3b8" strokeWidth={1.5} fill="url(#g2)" dot={false} activeDot={{ r: 3, fill: '#94a3b8', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Users by role */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-800">Users by role</p>
            <Link href="/users" className="text-[11px] text-slate-500 hover:text-slate-900 transition-colors">View all</Link>
          </div>
          <div className="space-y-3.5">
            {Object.keys(byRole).length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No data</p>
            ) : (
              Object.entries(byRole)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([r, count]) => {
                  const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
                  return (
                    <div key={r}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="capitalize text-slate-700 font-medium">{r}</span>
                        <span className="text-slate-400 tabular-nums">{count as number}</span>
                      </div>
                      <div className="h-1 rounded-full bg-slate-100">
                        <div className={cn('h-full rounded-full', ROLE_COLORS[r] ?? 'bg-slate-400')} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Recent Transactions</p>
            <Link href="/transactions" className="text-[11px] text-slate-500 hover:text-slate-900 transition-colors">View all</Link>
          </div>
          {txs.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No transactions yet</div>
          ) : (
            <div>
              {txs.map((tx: any) => (
                <div key={tx.transaction_id} className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <div className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0',
                    tx.type === 'credit' ? 'bg-emerald-50' : 'bg-red-50',
                  )}>
                    {tx.type === 'credit'
                      ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                      : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 capitalize">{tx.type}</p>
                    <p className="text-xs text-slate-400 truncate">{tx.reason}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('text-sm font-semibold tabular-nums', tx.type === 'credit' ? 'text-emerald-600' : 'text-red-500')}>
                      {tx.type === 'credit' ? '+' : '−'}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(tx.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My wallet + quick links */}
        <div className="flex flex-col gap-4">
          {/* Wallet */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 mb-2">My balance</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(user?.balance ?? '0')}
            </p>
            <p className="text-xs text-slate-400 mt-1">{user?.currency ?? 'USD'}</p>
            <Link href="/wallet" className="mt-4 block text-center btn-secondary w-full text-xs h-8">
              View wallet
            </Link>
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 mb-3">Quick links</p>
            <div className="space-y-1">
              {canManage && (
                <Link href="/users/create" className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 py-1.5 hover:bg-slate-50 px-2 rounded-lg transition-colors">
                  <Plus className="h-3.5 w-3.5 text-slate-400" />Create user
                </Link>
              )}
              <Link href="/users" className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 py-1.5 hover:bg-slate-50 px-2 rounded-lg transition-colors">
                <Users className="h-3.5 w-3.5 text-slate-400" />Manage users
              </Link>
              <Link href="/transactions" className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 py-1.5 hover:bg-slate-50 px-2 rounded-lg transition-colors">
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />All transactions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
