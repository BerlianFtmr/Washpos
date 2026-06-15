'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListOrdered,
  Users,
  ShoppingBag,
  CreditCard,
  BarChart3,
  UserCog,
  X,
} from 'lucide-react';
import type { UserRole } from '@/types';

interface SidebarProps {
  role: UserRole;
  collapsed: boolean;
  onClose: () => void;
}

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: ListOrdered, label: 'Pesanan', href: '/orders' },
  { icon: Users, label: 'Pelanggan', href: '/customers' },
  { icon: ShoppingBag, label: 'Layanan', href: '/services' },
  { icon: CreditCard, label: 'Pembayaran', href: '/payments' },
  { icon: BarChart3, label: 'Rekap Penghasilan', href: '/reports/income', adminOnly: true },
  { icon: UserCog, label: 'Pengguna', href: '/users', adminOnly: true },
];

export default function Sidebar({ role, collapsed, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-64 flex flex-col bg-slate-900 text-white
          transition-transform duration-300 ease-in-out
          ${collapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <span className="text-xl font-bold tracking-wider text-blue-400">WASHPOS</span>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => {
              if (item.adminOnly && role !== 'admin') return null;

              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center w-full px-3 py-2.5 rounded-lg transition-colors
                      ${isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }
                    `}
                  >
                    <item.icon size={20} className="shrink-0" />
                    <span className="ml-3 font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
