'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Toaster } from 'sonner';
import { removeToken } from '@/lib/auth';
import type { AuthUser } from '@/types';

interface AppLayoutProps {
  user: AuthUser;
  children: React.ReactNode;
}

export default function AppLayout({ user, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  function handleLogout() {
    removeToken();
    router.push('/login');
  }

  return (
    <>
      <Toaster position="top-right" richColors closeButton toastOptions={{ duration: 4000 }} />
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar
          role={user.role}
          collapsed={!sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar
            user={user}
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            onLogout={handleLogout}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
