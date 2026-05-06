'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  ArrowLeft, Edit, Shield, ShieldOff, Wallet,
  ArrowUpRight, ArrowDownRight, Loader2, User,
  Calendar, Mail, Hash, Building,
} from 'lucide-react';
import { usersApi, walletApi, transactionsApi } from '@/lib/api';
import { formatDate, formatCurrency, getApiError, cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_BADGES: Record<string, string> = {
  admin:       'badge-red',
  agent:       'badge-yellow',
  distributor: 'badge-purple',
  manager:     'badge-green',
  cashier:     'badge-blue',
  player:      'badge-gray',
};

export default function UserDetailPage() {
  const { id }     = useParams<{ id: string }>();
  const router     = useRouter();
  const qc         = useQueryClient();
  const { user: me } = useAuth();
  const [tab, setTab] = useState<'info' | 'transactions'>('info');

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn:  () => usersApi.get(Number(id)).then((r) => r.data.data),
  });

  const { data: txData } = useQuery({
    queryKey: ['user-transactions', id],
    queryFn:  () => transactionsApi.adminList({ user_id: id, per_page: 20 }).then((r) => r.data),
    enabled:  tab === 'transactions',
  });

  const blockMut = useMutation({
    mutationFn: () => usersApi.block(Number(id)),
    onSuccess:  () => { toast.success('User blocked');   qc.invalidateQueries({ queryKey: ['user', id] }); },
    onError:    () => toast.error('Failed to block user'),
  });

  const unblockMut = useMutation({
    mutationFn: () => usersApi.unblock(Number(id)),
    onSuccess:  () => { toast.success('User unblocked'); qc.invalidateQueries({ queryKey: ['user', id] }); },
    onError:    () => toast.error('Failed to unblock user'),
  });

  const canManage = ['admin','agent','distributor','manager','cashier'].includes(me?.role?.slug ?? '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!user) return <p className="text-slate-500">User not found.</p>;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/users" className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </Link>
          <div>
            <h2 className="page-title">@{user.username}</h2>
            <p className="page-subtitle">User ID #{user.id}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Link href={`/users/${id}/edit`} className="btn-secondary gap-2">
              <Edit className="h-4 w-4" /> Edit
            </Link>
            {user.status === 'active' ? (
              <button onClick={() => blockMut.mutate()} disabled={blockMut.isPending} className="btn-danger gap-2">
                {blockMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                Block
              </button>
            ) : (
              <button onClick={() => unblockMut.mutate()} disabled={unblockMut.isPending} className="btn-success gap-2">
                {unblockMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Unblock
              </button>
            )}
          </div>
        )}
      </div>

      {/* Profile card */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold uppercase flex-shrink-0">
              {user.username?.[0] ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-bold text-slate-900">{user.username}</h3>
                <span className={cn(ROLE_BADGES[user.role?.slug ?? ''] ?? 'badge-gray', 'capitalize')}>
                  {user.role?.name ?? '—'}
                </span>
                <span className={user.status === 'active' ? 'badge-green' : 'badge-red'}>
                  {user.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{user.email ?? <em>No email</em>}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-400">Balance</p>
              <p className="text-2xl font-bold tabular-nums text-emerald-600">
                ${parseFloat(user.balance ?? '0').toFixed(2)}
              </p>
              <p className="text-xs text-slate-400">{user.currency ?? 'USD'}</p>
            </div>
          </div>

          {/* Metadata grid */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Hash,     label: 'User ID',    value: `#${user.id}` },
              { icon: Calendar, label: 'Joined',      value: user.created_at ? formatDate(user.created_at) : '—' },
              { icon: Calendar, label: 'Last Login',  value: user.last_login ? formatDate(user.last_login) : 'Never' },
              { icon: Building, label: 'Shop ID',     value: user.shop_id ? `#${user.shop_id}` : '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
                <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Hierarchy path */}
          {user.parents && user.parents.length > 0 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <p className="text-xs text-slate-400">Hierarchy:</p>
              {user.parents.map((p: any, i: number) => (
                <span key={p.id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-slate-300">›</span>}
                  <Link href={`/users/${p.id}`} className="text-xs text-blue-600 hover:underline">
                    {p.username}
                  </Link>
                </span>
              ))}
              <span className="text-slate-300">›</span>
              <span className="text-xs font-semibold text-slate-700">{user.username}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {(['info', 'transactions'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors capitalize',
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'info' && (
        <div className="card card-body">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Account Details</h4>
          <dl className="space-y-3">
            {[
              { label: 'Username',   value: user.username },
              { label: 'Email',      value: user.email ?? '—' },
              { label: 'Role',       value: `${user.role?.name ?? '—'} (level ${user.role?.slug})` },
              { label: 'Status',     value: user.status },
              { label: 'Balance',    value: `$${parseFloat(user.balance ?? '0').toFixed(2)} ${user.currency}` },
              { label: 'Parent ID',  value: user.parent_id ? `#${user.parent_id}` : '—' },
              { label: 'Shop ID',    value: user.shop_id  ? `#${user.shop_id}`  : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="text-sm font-medium text-slate-900 capitalize">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {tab === 'transactions' && (
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
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {(!txData?.data || txData.data.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">No transactions found.</td>
                </tr>
              )}
              {txData?.data?.map((tx: any) => (
                <tr key={tx.transaction_id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0',
                        tx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600',
                      )}>
                        {tx.type === 'credit' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      </div>
                      <span className="capitalize text-sm font-medium">{tx.type}</span>
                    </div>
                  </td>
                  <td className={cn('font-mono font-semibold', tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600')}>
                    {tx.type === 'credit' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                  </td>
                  <td className="font-mono text-slate-500">${parseFloat(tx.balance_before).toFixed(2)}</td>
                  <td className="font-mono text-slate-500">${parseFloat(tx.balance_after).toFixed(2)}</td>
                  <td className="max-w-[160px] truncate text-slate-600">{tx.reason}</td>
                  <td><span className="badge-green capitalize">{tx.status}</span></td>
                  <td className="text-xs text-slate-400 whitespace-nowrap">{formatDate(tx.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
