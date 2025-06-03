
"use client";
import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { QueryClientProvider } from '@/lib/query-provider';
import { Toaster } from '@/components/ui/toaster';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <QueryClientProvider>
        {children}
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}
