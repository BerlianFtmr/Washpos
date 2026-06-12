'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ListOrdered,
  Users,
  ShoppingBag,
  CreditCard,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// --- Navigation items ---
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'pegawai'] },
  { label: 'Pesanan', href: '/orders', icon: ListOrdered, roles: ['admin', 'pegawai'] },
  { label: 'Pelanggan', href: '/customers', icon: Users, roles: ['admin', 'pegawai'] },
  { label: 'Layanan', href: '/services', icon: ShoppingBag, roles: ['admin', 'pegawai'] },
  { label: 'Pembayaran', href: '/payments', icon: CreditCard, roles: ['admin', 'pegawai'] },
  { label: 'Pengguna', href: '/users', icon: Users, roles: ['admin'] },
];

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClick() {
      setUserDropdownOpen(false);
    }
    if (userDropdownOpen) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [userDropdownOpen]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="text-sm text-slate-500">Memuat...</span>
        </div>
      </div>
    );
  }

  // Fallback: if proxy didn't redirect (e.g. client-side navigation), redirect manually
  if (!user) {
    router.push('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role)
  );

  const roleLabel = user.role === 'admin' ? 'Admin' : 'Pegawai';
  const roleBadgeClass =
    user.role === 'admin'
      ? 'bg-orange-100 text-orange-700'
      : 'bg-blue-100 text-blue-700';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-white transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-slate-800">
          <span className="text-xl font-bold tracking-wider text-blue-400">
            WASHPOS
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center w-full gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon size={20} className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          {/* Left: mobile hamburger + breadcrumb area */}
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Right: user menu */}
          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
              onClick={(e) => {
                e.stopPropagation();
                setUserDropdownOpen(!userDropdownOpen);
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="hidden font-medium text-slate-700 md:inline">
                {user.username}
              </span>
              <span
                className={`hidden rounded-full px-2 py-0.5 text-xs font-medium md:inline ${roleBadgeClass}`}
              >
                {roleLabel}
              </span>
              <ChevronDown size={16} className="text-slate-400" />
            </button>

            {/* Dropdown */}
            {userDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <Link
                  href="/profile"
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  Profil Saya
                </Link>
                <hr className="my-1 border-slate-100" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
