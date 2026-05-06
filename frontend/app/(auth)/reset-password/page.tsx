'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getApiError } from '@/lib/utils';

interface ResetForm {
  password:              string;
  password_confirmation: string;
}

export default function ResetPasswordPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token') ?? '';
  const email        = searchParams.get('email') ?? '';
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetForm>();
  const password = watch('password');

  const onSubmit = async (data: ResetForm) => {
    if (!token || !email) { toast.error('Invalid reset link.'); return; }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, email, ...data });
      toast.success('Password reset successfully!');
      router.replace('/login');
    } catch (err: any) {
      toast.error(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">FishThunder</h1>
          <p className="mt-2 text-primary-200 text-sm">Set your new password</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">New Password</label>
              <input
                {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })}
                type="password"
                className={`input ${errors.password ? 'input-error' : ''}`}
                placeholder="••••••••"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <input
                {...register('password_confirmation', { required: 'Please confirm password', validate: (v) => v === password || 'Passwords do not match' })}
                type="password"
                className={`input ${errors.password_confirmation ? 'input-error' : ''}`}
                placeholder="••••••••"
              />
              {errors.password_confirmation && <p className="mt-1 text-xs text-red-600">{errors.password_confirmation.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href="/login" className="text-primary-600 hover:underline">Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
