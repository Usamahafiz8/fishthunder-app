'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { getApiError, getFieldErrors } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_OPTIONS = [
  { value: 'agent',       label: 'Agent' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'manager',     label: 'Manager' },
  { value: 'cashier',     label: 'Cashier' },
  { value: 'player',      label: 'Player' },
];

interface CreateForm {
  username:  string;
  email:     string;
  password:  string;
  role:      string;
  parent_id: string;
  shop_id:   string;
  status:    string;
}

export default function CreateUserPage() {
  const router      = useRouter();
  const { user: me } = useAuth();

  const { register, handleSubmit, setError, formState: { errors } } = useForm<CreateForm>({
    defaultValues: { status: 'active', role: 'player' },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => usersApi.create(data),
    onSuccess: (res) => {
      toast.success('User created successfully');
      router.push(`/users/${res.data.data.id}`);
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

  const onSubmit = handleSubmit((form) => {
    const payload: any = {
      username: form.username,
      email:    form.email,
      password: form.password,
      role:     form.role,
      status:   form.status,
    };
    if (form.parent_id) payload.parent_id = parseInt(form.parent_id);
    if (form.shop_id)   payload.shop_id   = parseInt(form.shop_id);
    mutation.mutate(payload);
  });

  const allowedRoles = ROLE_OPTIONS.filter((r) => {
    const mySlug = me?.role?.slug ?? 'player';
    const order  = ['admin','agent','distributor','manager','cashier','player'];
    const myIdx  = order.indexOf(mySlug);
    const rIdx   = order.indexOf(r.value);
    return rIdx > myIdx;
  });

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/users" className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <div>
          <h2 className="page-title">Create User</h2>
          <p className="page-subtitle">Add a new user to your network</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card">
        <div className="card-header">
          <h3 className="card-title">User Information</h3>
        </div>
        <div className="card-body space-y-5">
          {/* Username + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Username <span className="text-red-500">*</span></label>
              <input
                {...register('username', { required: 'Required', minLength: { value: 3, message: 'Min 3 chars' } })}
                className={`input ${errors.username ? 'input-error' : ''}`}
                placeholder="john_doe"
              />
              {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input
                {...register('email')}
                type="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="john@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="label">Password <span className="text-red-500">*</span></label>
            <input
              {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })}
              type="password"
              className={`input ${errors.password ? 'input-error' : ''}`}
              placeholder="Min 8 characters"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {/* Role + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Role <span className="text-red-500">*</span></label>
              <select {...register('role', { required: 'Required' })} className={`input ${errors.role ? 'input-error' : ''}`}>
                {allowedRoles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
            </div>
            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input">
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          {/* Parent + Shop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Parent ID <span className="text-slate-400">(optional)</span></label>
              <input {...register('parent_id')} type="number" className="input" placeholder="Defaults to your ID" />
            </div>
            <div>
              <label className="label">Shop ID <span className="text-slate-400">(optional)</span></label>
              <input {...register('shop_id')} type="number" className="input" placeholder="Leave blank" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/users" className="btn-secondary">Cancel</Link>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create User
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
