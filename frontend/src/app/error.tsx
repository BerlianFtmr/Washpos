'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary level root — menangani error di route di bawah root layout
 * (mis. /login). Root layout (AuthProvider + Toaster) tetap dirender.
 * TIDAK menggantikan root layout, jadi tidak perlu <html>/<body>.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('Root error boundary:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 text-center">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <AlertTriangle size={40} />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Terjadi Kesalahan
        </h1>
        <p className="mb-6 text-sm text-slate-600">
          Maaf, terjadi error saat memuat halaman. Silakan coba lagi.
        </p>
        {error.digest && (
          <p className="mb-6 font-mono text-xs text-slate-400">
            Kode error: {error.digest}
          </p>
        )}
        <button
          onClick={() => unstable_retry()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
