'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';
import { User } from '@/types';

interface AuthContextValue {
  user:          User | null;
  token:         string | null;
  isLoading:     boolean;
  isAuthenticated: boolean;
  login:         (identifier: string, password: string) => Promise<void>;
  logout:        () => Promise<void>;
  register:      (data: { username: string; email: string; password: string; password_confirmation: string }) => Promise<void>;
  refreshUser:   (u: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [token,     setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from cookie on mount
  useEffect(() => {
    const saved      = Cookies.get('auth_token');
    const savedUser  = localStorage.getItem('auth_user');
    if (saved && savedUser) {
      setToken(saved);
      try { setUser(JSON.parse(savedUser)); } catch {}
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res  = await authApi.login({ identifier, password });
    const data = res.data.data;
    Cookies.set('auth_token', data.token, { expires: 1, secure: true, sameSite: 'strict' });
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch {}
    Cookies.remove('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  }, []);

  const register = useCallback(async (data: { username: string; email: string; password: string; password_confirmation: string }) => {
    const res   = await authApi.register(data);
    const body  = res.data.data;
    Cookies.set('auth_token', body.token, { expires: 1, secure: true, sameSite: 'strict' });
    localStorage.setItem('auth_user', JSON.stringify(body.user));
    setToken(body.token);
    setUser(body.user);
  }, []);

  const refreshUser = useCallback((u: User) => {
    setUser(u);
    localStorage.setItem('auth_user', JSON.stringify(u));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated: !!token && !!user, login, logout, register, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
