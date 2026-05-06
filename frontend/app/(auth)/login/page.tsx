'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getApiError, getFieldErrors } from '@/lib/utils';

export default function LoginPage() {
  const { login } = useAuth();
  const router    = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const { register, handleSubmit, setError, formState: { errors } } = useForm<{ identifier: string; password: string }>();

  const onSubmit = async (data: { identifier: string; password: string }) => {
    setLoading(true);
    try {
      await login(data.identifier, data.password);
      router.replace('/dashboard');
    } catch (err: any) {
      const fields = getFieldErrors(err);
      if (Object.keys(fields).length) {
        for (const [f, m] of Object.entries(fields)) setError(f as any, { message: m });
      } else {
        toast.error(getApiError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
      <div className="w-full max-w-[360px]">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 mb-4">
            <span className="text-white text-sm font-bold">FT</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-500 mt-1">FishThunder Admin Panel</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Username or email</label>
              <input
                {...register('identifier', { required: 'Required' })}
                className={`input ${errors.identifier ? 'input-error' : ''}`}
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
              />
              {errors.identifier && <p className="text-xs text-red-600 mt-1">{errors.identifier.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Required' })}
                  type={showPw ? 'text' : 'password'}
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-slate-500 hover:text-slate-900 transition-colors">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full h-10 text-sm">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-5">
          No account?{' '}
          <Link href="/register" className="text-slate-900 font-medium hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
