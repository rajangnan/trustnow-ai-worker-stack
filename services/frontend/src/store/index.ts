import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Agent } from '@/types';

interface AppState {
  // Auth
  token: string | null;
  tenantId: string | null;
  userId: string | null;
  setAuth: (token: string, tenantId: string, userId: string) => void;
  clearAuth: () => void;

  // Live calls counter
  liveCallsCount: number;
  setLiveCallsCount: (n: number) => void;

  // Selected agent (for breadcrumb / config module)
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;

  // Agent config active tab
  agentConfigTab: string;
  setAgentConfigTab: (tab: string) => void;

  // Sidebar collapsed
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      tenantId: null,
      userId: null,
      setAuth: (token, tenantId, userId) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('tn_token', token);
          localStorage.setItem('tn_tenant_id', tenantId);
        }
        set({ token, tenantId, userId });
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('tn_token');
          localStorage.removeItem('tn_tenant_id');
        }
        set({ token: null, tenantId: null, userId: null });
      },

      liveCallsCount: 0,
      setLiveCallsCount: (n) => set({ liveCallsCount: n }),

      selectedAgentId: null,
      setSelectedAgentId: (id) => set({ selectedAgentId: id }),

      agentConfigTab: 'agent',
      setAgentConfigTab: (tab) => set({ agentConfigTab: tab }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    }),
    { name: 'tn-app-store', partialize: (s) => ({ tenantId: s.tenantId, userId: s.userId }) }
  )
);
