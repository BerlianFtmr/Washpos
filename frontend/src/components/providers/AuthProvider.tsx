'use client';

import { AuthContextProvider } from '@/contexts/AuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContextProvider>{children}</AuthContextProvider>;
}
