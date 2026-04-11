'use client';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } }
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <TopBar />
      <Sidebar />
      <main
        style={{ marginLeft: 240, marginTop: 56 }}
        className="min-h-[calc(100vh-56px)] bg-[#0E0620]"
      >
        {children}
      </main>
    </QueryClientProvider>
  );
}
