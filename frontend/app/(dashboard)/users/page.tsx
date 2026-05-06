'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Plus, Search, RefreshCw, Shield, ShieldOff,
  Eye, Edit, ChevronLeft, ChevronRight, Users, Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

const ROLE_BADGES: Record<string, string> = {
  admin:       'badge-red',
  agent:       'badge-yellow',
  distributor: 'badge-purple',
  manager:     'badge-green',
  cashier:     'badge-blue',
  player:      'badge-gray',
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const qc           = useQueryClient();

  const [search, setSearch] = useState('');
  const [role,   setRole]   = useState('');
  const [status, setStatus] = useState('');
  const [page,   setPage]   = useState(1);
  const perPage = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users', { search, role, status, page, perPage }],
    queryFn:  () => usersApi.list({
      search:    search   || undefined,
      role:      role     || undefined,
      status:    status   || undefined,
      page,
      per_page:  perPage,
    }).then((r) => r.data),
    placeholderData: (prev: any) => prev,
  });

  const users: any[] = data?.data ?? [];
  const meta         = data?.meta  ?? { total: 0, last_page: 1, current_page: 1 };

  const blockMut = useMutation({
    mutationFn: (id: number) => usersApi.block(id),
    onSuccess:  () => { toast.success('User blocked');   qc.invalidateQueries({ queryKey: ['users'] }); },
    onError:    () => toast.error('Failed to block user'),
  });

  const unblockMut = useMutation({
    mutationFn: (id: number) => usersApi.unblock(id),
    onSuccess:  () => { toast.success('User unblocked'); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError:    () => toast.error('Failed to unblock user'),
  });

  const canManage = ['admin','agent','distributor','manager','cashier'].includes(me?.role?.slug ?? '');

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h2 className="page-title">Users</h2>
          <p className="page-subtitle">{meta.total} user{meta.total !== 1 ? 's' : ''} in your network</p>
        </div>
        {canManage && (
          <Link href="/users/create" className="btn-primary">
            <Plus className="h-4 w-4" /> Create User
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card card-body !py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search username or email…"
              className="input pl-9"
            />
          </div>
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="input w-full sm:w-40">
            <option value="">All roles</option>
            {['admin','agent','distributor','manager','cashier','player'].map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input w-full sm:w-36">
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
          <button onClick={() => refetch()} className="btn-secondary !px-3">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Last Login</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="py-14 text-center">
                  <Loader2 className="h-7 w-7 animate-spin text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Loading users…</p>
                </td>
              </tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="py-14 text-center">
                  <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No users found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
                </td>
              </tr>
            )}
            {users.map((u: any) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 uppercase flex-shrink-0">
                      {u.username?.[0] ?? '?'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{u.username}</p>
                      <p className="text-xs text-slate-400">{u.email ?? <em>no email</em>}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={cn(ROLE_BADGES[u.role?.slug ?? ''] ?? 'badge-gray', 'capitalize')}>
                    {u.role?.name ?? '—'}
                  </span>
                </td>
                <td>
                  <span className="font-mono text-sm font-semibold text-slate-800">
                    ${parseFloat(u.balance ?? '0').toFixed(2)}
                  </span>
                </td>
                <td>
                  <span className={u.status === 'active' ? 'badge-green' : 'badge-red'}>
                    {u.status}
                  </span>
                </td>
                <td className="text-slate-500 text-xs whitespace-nowrap">
                  {u.created_at ? formatDate(u.created_at) : '—'}
                </td>
                <td className="text-slate-500 text-xs whitespace-nowrap">
                  {u.last_login ? formatDate(u.last_login) : 'Never'}
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/users/${u.id}`}
                      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      title="View details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    {canManage && (
                      <Link
                        href={`/users/${u.id}/edit`}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        title="Edit user"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {canManage && u.status === 'active' && (
                      <button
                        onClick={() => blockMut.mutate(u.id)}
                        disabled={blockMut.isPending}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Block user"
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canManage && u.status === 'blocked' && (
                      <button
                        onClick={() => unblockMut.mutate(u.id)}
                        disabled={unblockMut.isPending}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                        title="Unblock user"
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
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
