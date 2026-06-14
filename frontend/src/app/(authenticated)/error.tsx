'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary area authenticated — menangani error di semua halaman
 * di dalam route group (authenticated). Layout (sidebar + topbar) tetap
 * dirender, sehingga pengguna tetap bisa navigasi saat error terjadi.
 */
export default function AuthenticatedError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('Authenticated error boundary:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <AlertTriangle size={32} />
        </div>
        <h1 className="mb-2 text-xl font-bold text-slate-900">
          Gagal Memuat Halaman
        </h1>
        <p className="mb-6 text-sm text-slate-600">
          Terjadi kesalahan saat memuat data. Periksa koneksi Anda lalu coba lagi.
        </p>
        {error.digest && (
          <p className="mb-6 font-mono text-xs text-slate-400">
            Kode error: {error.digest}
          </p>
        )}
        <button
          onClick={() => unstable_retry()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
