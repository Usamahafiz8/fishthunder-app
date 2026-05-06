'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { usersApi, walletApi } from '@/lib/api';
import { getApiError, getFieldErrors } from '@/lib/utils';

interface EditForm {
  username: string;
  email:    string;
  status:   'active' | 'blocked';
  shop_id?: number | '';
  amount?:  string;
  reason?:  string;
  action?:  'add' | 'remove' | '';
}

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc     = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn:  () => usersApi.get(Number(id)).then((r) => r.data.data),
  });

  const { register, handleSubmit, reset, setError, formState: { errors, isDirty } } = useForm<EditForm>();

  useEffect(() => {
    if (data) {
      reset({
        username: data.username ?? '',
        email:    data.email    ?? '',
        status:   data.status   ?? 'active',
        shop_id:  data.shop_id  ?? '',
        amount:   '',
        reason:   '',
        action:   '',
      });
    }
  }, [data, reset]);

  const updateMut = useMutation({
    mutationFn: (body: any) => usersApi.update(Number(id), body),
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      const fields = getFieldErrors(err);
      if (Object.keys(fields).length > 0) {
        for (const [f, msg] of Object.entries(fields)) setError(f as any, { message: msg });
      } else {
        toast.error(getApiError(err));
      }
    },
  });

  const walletMut = useMutation({
    mutationFn: ({ action, amount, reason }: { action: string; amount: string; reason: string }) =>
      action === 'add'
        ? walletApi.addBalance(Number(id), { amount, reason })
        : walletApi.removeBalance(Number(id), { amount, reason }),
    onSuccess: () => {
      toast.success('Balance updated');
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
      reset((v) => ({ ...v, amount: '', reason: '', action: '' }));
    },
    onError: (err: any) => toast.error(getApiError(err)),
  });

  const onSaveUser = handleSubmit((form) => {
    const payload: any = {};
    if (form.username !== data?.username) payload.username = form.username;
    if (form.email    !== data?.email)    payload.email    = form.email;
    if (form.status   !== data?.status)   payload.status   = form.status;
    const sid = form.shop_id === '' ? null : Number(form.shop_id);
    if (sid !== data?.shop_id) payload.shop_id = sid;
    if (Object.keys(payload).length === 0) { toast('No changes to save.'); return; }
    updateMut.mutate(payload);
  });

  const onWallet = handleSubmit((form) => {
    if (!form.action) { toast.error('Select add or remove'); return; }
    if (!form.amount || !form.reason) { toast.error('Amount and reason are required'); return; }
    walletMut.mutate({ action: form.action, amount: form.amount, reason: form.reason! });
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!data) return <p className="text-slate-500">User not found.</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/users/${id}`} className="btn-ghost !p-2">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="page-title">Edit User</h2>
          <p className="page-subtitle">@{data.username}</p>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={onSaveUser} className="card">
        <div className="card-header">
          <h3 className="card-title">Profile Information</h3>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Username</label>
              <input {...register('username', { required: 'Required', minLength: { value: 3, message: 'Min 3 chars' } })} className={`input ${errors.username ? 'input-error' : ''}`} />
              {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className={`input ${errors.email ? 'input-error' : ''}`} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input">
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div>
              <label className="label">Shop ID <span className="text-slate-400">(optional)</span></label>
              <input {...register('shop_id')} type="number" className="input" placeholder="Leave blank to unset" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={updateMut.isPending} className="btn-primary">
              {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </div>
      </form>

      {/* Wallet form */}
      <form onSubmit={onWallet} className="card">
        <div className="card-header">
          <h3 className="card-title">Adjust Balance</h3>
          <span className="text-xl font-bold tabular-nums text-emerald-600">
            ${parseFloat(data.balance ?? '0').toFixed(2)}
          </span>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Action</label>
              <select {...register('action')} className="input">
                <option value="">Select…</option>
                <option value="add">Add funds</option>
                <option value="remove">Remove funds</option>
              </select>
            </div>
            <div>
              <label className="label">Amount (USD)</label>
              <input {...register('amount')} placeholder="0.00" className="input" />
            </div>
            <div>
              <label className="label">Reason</label>
              <input {...register('reason')} placeholder="e.g. Top-up" className="input" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={walletMut.isPending} className="btn-success">
              {walletMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Apply Balance Change
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
