import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: string | number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export function getApiError(error: any): string {
  return error?.response?.data?.message ?? error?.message ?? 'An error occurred.';
}

export function getFieldErrors(error: any): Record<string, string> {
  const raw: Record<string, string[]> = error?.response?.data?.errors ?? {};
  const out: Record<string, string>   = {};
  for (const [k, v] of Object.entries(raw)) out[k] = v[0];
  return out;
}
