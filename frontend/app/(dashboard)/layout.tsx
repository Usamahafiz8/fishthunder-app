'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, Wallet, ArrowRightLeft, LogOut, Menu, X, Gamepad2, Tv2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, roles: null },
  { href: '/users',        label: 'Users',        icon: Users,           roles: ['admin','agent','distributor','manager','cashier'] },
  { href: '/games',        label: 'Games',        icon: Gamepad2,        roles: ['admin','agent'] },
  { href: '/play',         label: 'Play',         icon: Tv2,             roles: null },
  { href: '/wallet',       label: 'My Wallet',    icon: Wallet,          roles: null },
  { href: '/transactions', label: 'Transactions', icon: ArrowRightLeft,  roles: null },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/login'); }, [isLoading, isAuthenticated, router]);
  useEffect(() => { setOpen(false); }, [pathname]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
    </div>
  );
  if (!isAuthenticated) return null;

  const role     = user?.role?.slug ?? '';
  const balance  = `$${parseFloat(user?.balance ?? '0').toFixed(2)}`;
  const navItems = NAV.filter(n => !n.roles || n.roles.includes(role));

  const SidebarInner = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-100">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-slate-100 flex-shrink-0">
        <span className="text-sm font-bold text-slate-900 tracking-tight">FishThunder</span>
        <span className="ml-2 text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon   = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
              active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
            )}>
              <Icon className="h-[15px] w-[15px] flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-100 flex-shrink-0 space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50">
          <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600 uppercase flex-shrink-0">
            {user?.username?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-slate-800 truncate">{user?.username}</p>
            <p className="text-[10px] text-slate-400 capitalize truncate">{user?.role?.name ?? role} · {balance}</p>
          </div>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
          <LogOut className="h-[14px] w-[14px] text-slate-400" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-52 flex-shrink-0"><SidebarInner /></div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-52 shadow-xl z-10"><SidebarInner /></div>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-4 lg:px-6 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(!open)} className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <span className="text-sm font-semibold text-slate-800">
              {NAV.find(n => n.href === pathname || (n.href !== '/dashboard' && pathname.startsWith(n.href)))?.label ?? 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden sm:inline font-medium text-emerald-600">{balance}</span>
            <span className="hidden sm:inline text-slate-300">·</span>
            <span className="hidden sm:inline capitalize">{user?.role?.name ?? role}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
