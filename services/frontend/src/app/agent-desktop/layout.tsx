'use client';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Standalone layout for the Agent Desktop — does NOT use AppShell.
 * Provides its own QueryClient and takes over the full viewport.
 */
export default function AgentDesktopLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1 } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen w-screen overflow-hidden bg-[#0E0620] text-white">
        {children}
      </div>
    </QueryClientProvider>
  );
}
