'use client';

import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, User as UserIcon, CalendarDays } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/** SCR-14: Profil Saya — menampilkan info user + tombol logout ke SCR-01 */
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // S14-02: Logout — hapus token, redirect ke login
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  return (
    <div className="flex justify-center pt-10 sm:pt-16">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* Header / Cover */}
          <div className="relative h-32 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 rounded-2xl bg-white p-1 shadow-lg">
              <div
                className={`flex h-full w-full items-center justify-center rounded-xl text-3xl font-bold text-white ${
                  isAdmin ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: 68, height: 68 }}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Info Utama */}
          <div className="border-b border-slate-100 px-8 pb-8 pt-14 text-center">
            {/* S14-01: Username */}
            <h1 className="mb-2 text-2xl font-bold text-slate-900">
              {user.username}
            </h1>

            {/* S14-01: Role badge */}
            <div className="mb-6 flex justify-center">
              {isAdmin ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">
                  <ShieldCheck size={14} /> Administrator
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                  <UserIcon size={14} /> Pegawai
                </span>
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <CalendarDays size={14} /> Terdaftar Sejak
                </p>
                <p className="text-sm font-medium text-slate-800">-</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <UserIcon size={14} /> Role
                </p>
                <p className="text-sm font-medium capitalize text-slate-800">
                  {user.role}
                </p>
              </div>
            </div>
          </div>

          {/* S14-02: Action area with logout */}
          <div className="bg-slate-50 p-8">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 font-bold text-red-600 shadow-sm transition-all hover:border-red-300 hover:bg-red-50 focus:ring-4 focus:ring-red-50"
            >
              <LogOut size={18} />
              Keluar dari Sistem (Logout)
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Washpos App v1.0 &copy; 2026
          <br />
          Tim 03 Rekayasa Web
        </p>
      </div>
    </div>
  );
}
