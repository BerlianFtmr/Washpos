'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Guard untuk halaman admin-only. Pegawai yang mengakses langsung via URL
 * akan di-redirect ke dashboard (`/`).
 *
 * Gunakan setelah semua hook lain, lalu early-return berdasarkan hasilnya:
 *
 *   const { loading, authorized } = useAdminGuard();
 *   if (loading) return <PageLoading />;
 *   if (!authorized) return null;
 */
export function useAdminGuard(): { loading: boolean; authorized: boolean } {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/');
    }
  }, [loading, isAdmin, router]);

  return { loading, authorized: isAdmin };
}
