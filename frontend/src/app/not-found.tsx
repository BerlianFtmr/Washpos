import Link from 'next/link';
import { Home, FileQuestion } from 'lucide-react';

/**
 * Not Found (404) — menangani URL yang tidak cocok dengan route manapun.
 * Root app/not-found.tsx berlaku global untuk seluruh aplikasi.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 text-center">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <FileQuestion size={40} />
        </div>
        <p className="mb-2 text-6xl font-extrabold text-slate-300">404</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Halaman Tidak Ditemukan
        </h1>
        <p className="mb-8 text-sm text-slate-600">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Home size={16} />
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
