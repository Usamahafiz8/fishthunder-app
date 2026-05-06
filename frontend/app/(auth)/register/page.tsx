'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getApiError, getFieldErrors } from '@/lib/utils';

interface RegisterForm {
  username:              string;
  email:                 string;
  password:              string;
  password_confirmation: string;
}

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const router   = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm<RegisterForm>();
  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await registerUser(data);
      toast.success('Account created!');
      router.replace('/dashboard');
    } catch (err: any) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        for (const [f, msg] of Object.entries(fieldErrors)) setError(f as any, { message: msg });
      } else {
        toast.error(getApiError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">FishThunder</h1>
          <p className="mt-2 text-primary-200 text-sm">Create your account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                {...register('username', { required: 'Username is required', minLength: { value: 3, message: 'Min 3 characters' }, pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'Letters, numbers and underscores only' } })}
                className={`input ${errors.username ? 'input-error' : ''}`}
                placeholder="your_username"
              />
              {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>}
            </div>

            <div>
              <label className="label">Email</label>
              <input
                {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })}
                type="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <input
                {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })}
                type="password"
                className={`input ${errors.password ? 'input-error' : ''}`}
                placeholder="••••••••"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input
                {...register('password_confirmation', { required: 'Please confirm password', validate: (v) => v === password || 'Passwords do not match' })}
                type="password"
                className={`input ${errors.password_confirmation ? 'input-error' : ''}`}
                placeholder="••••••••"
              />
              {errors.password_confirmation && <p className="mt-1 text-xs text-red-600">{errors.password_confirmation.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
