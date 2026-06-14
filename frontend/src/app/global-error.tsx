'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Global Error Boundary — menangani error fatal yang terjadi di root layout.
 * File ini MENGGANTIKAN root layout saat aktif, sehingga WAJIB menyertakan
 * <html> dan <body> sendiri (lihat docs error.md #global-error).
 * Gunakan unstable_retry (konvensi Next.js 16.2).
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('Global error boundary:', error);
  }, [error]);

  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
          <div className="w-full max-w-md">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertTriangle size={40} />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-slate-900">
              Terjadi Kesalahan Sistem
            </h1>
            <p className="mb-1 text-sm text-slate-600">
              Aplikasi mengalami error yang tidak terduga dan perlu dimuat ulang.
            </p>
            {error.digest && (
              <p className="mb-6 font-mono text-xs text-slate-400">
                Kode error: {error.digest}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => unstable_retry()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <RefreshCw size={16} />
                Coba Lagi
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                <Home size={16} />
                Ke Beranda
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
