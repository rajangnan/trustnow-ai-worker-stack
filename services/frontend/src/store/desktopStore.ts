import { create } from 'zustand';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AgentStatus = 'available' | 'busy' | 'break' | 'wrap_up' | 'offline';

export interface TranscriptTurn {
  role: 'caller' | 'agent' | 'ai' | 'system';
  content: string;
  timestamp: string;
  latency_ms?: number;
}

export interface ActiveCall {
  cid: string;
  caller_phone?: string;
  caller_name?: string;
  account_id?: string;
  auth_method?: string;
  ai_summary?: string;
  agent_name?: string;
  started_at: string;
  transcript: TranscriptTurn[];
  on_hold: boolean;
  muted: boolean;
  channel_uuid?: string;
}

export interface QueueItem {
  cid: string;
  timestamp: string;
  queue_time_s: number;
  transcript?: TranscriptTurn[];
  context?: {
    caller_intent?: string;
    ai_summary?: string;
    tenant_id?: string;
    agent_id?: string;
    caller_phone?: string;
    caller_name?: string;
  };
}

export interface HitlRequest {
  cid: string;
  action_type: string;
  action_description: string;
  amount?: number;
  currency?: string;
  risk_level?: string;
  sme_domain?: string;
  created_at: string;
  timeout_s?: number;
}

export interface TeamMember {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  status: AgentStatus;
  updated_at?: string;
  current_cid?: string;
  calls_today?: number;
  avg_handle_s?: number;
}

export interface DesktopState {
  // Agent identity
  agentId: string | null;
  agentEmail: string | null;
  agentRole: 'human_agent' | 'supervisor' | null;
  tenantId: string | null;
  agentStatus: AgentStatus;
  isSupervisor: boolean;

  // Active call
  activeCall: ActiveCall | null;
  callTimerSeconds: number;

  // Queue
  queue: QueueItem[];
  queueCount: number;

  // Today's stats
  statsToday: {
    handled: number;
    avg_handle_s: number;
    csat: number;
  };

  // HITL approvals pending
  hitlRequests: HitlRequest[];

  // Team (supervisor only)
  team: TeamMember[];

  // WebSocket connection state
  wsConnected: boolean;

  // UI state
  activeContextTab: 'caller_info' | 'history' | 'notes' | 'kb_search';
  showSupervisorPanel: boolean;
  showTransferDialog: boolean;
  showWrapUpDialog: boolean;

  // Notes for current call
  currentNotes: string;
  kbSearchQuery: string;
  kbResults: any[];

  // Actions
  setAgentIdentity: (id: string, email: string, role: string, tenantId: string) => void;
  setStatus: (status: AgentStatus) => void;
  setActiveCall: (call: ActiveCall | null) => void;
  appendTranscriptTurn: (turn: TranscriptTurn) => void;
  setCallOnHold: (held: boolean) => void;
  setCallMuted: (muted: boolean) => void;
  tickCallTimer: () => void;
  resetCallTimer: () => void;
  setQueue: (items: QueueItem[]) => void;
  addQueueItem: (item: QueueItem) => void;
  removeQueueItem: (cid: string) => void;
  addHitlRequest: (req: HitlRequest) => void;
  removeHitlRequest: (cid: string) => void;
  setTeam: (members: TeamMember[]) => void;
  updateTeamMemberStatus: (agentId: string, status: AgentStatus) => void;
  setWsConnected: (connected: boolean) => void;
  setActiveContextTab: (tab: DesktopState['activeContextTab']) => void;
  setShowSupervisorPanel: (show: boolean) => void;
  setShowTransferDialog: (show: boolean) => void;
  setShowWrapUpDialog: (show: boolean) => void;
  setCurrentNotes: (notes: string) => void;
  setKbSearchQuery: (q: string) => void;
  setKbResults: (results: any[]) => void;
  updateStats: (stats: Partial<DesktopState['statsToday']>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useDesktopStore = create<DesktopState>((set) => ({
  agentId: null,
  agentEmail: null,
  agentRole: null,
  tenantId: null,
  agentStatus: 'available',
  isSupervisor: false,

  activeCall: null,
  callTimerSeconds: 0,

  queue: [],
  queueCount: 0,

  statsToday: { handled: 0, avg_handle_s: 0, csat: 0 },

  hitlRequests: [],
  team: [],
  wsConnected: false,

  activeContextTab: 'caller_info',
  showSupervisorPanel: false,
  showTransferDialog: false,
  showWrapUpDialog: false,

  currentNotes: '',
  kbSearchQuery: '',
  kbResults: [],

  setAgentIdentity: (id, email, role, tenantId) =>
    set({
      agentId: id,
      agentEmail: email,
      agentRole: role as any,
      tenantId,
      isSupervisor: role === 'supervisor',
    }),

  setStatus: (status) => set({ agentStatus: status }),

  setActiveCall: (call) =>
    set({ activeCall: call, callTimerSeconds: 0, currentNotes: '' }),

  appendTranscriptTurn: (turn) =>
    set((state) => {
      if (!state.activeCall) return {};
      return {
        activeCall: {
          ...state.activeCall,
          transcript: [...state.activeCall.transcript, turn],
        },
      };
    }),

  setCallOnHold: (on_hold) =>
    set((state) => state.activeCall ? { activeCall: { ...state.activeCall, on_hold } } : {}),

  setCallMuted: (muted) =>
    set((state) => state.activeCall ? { activeCall: { ...state.activeCall, muted } } : {}),

  tickCallTimer: () => set((state) => ({ callTimerSeconds: state.callTimerSeconds + 1 })),
  resetCallTimer: () => set({ callTimerSeconds: 0 }),

  setQueue: (items) => set({ queue: items, queueCount: items.length }),

  addQueueItem: (item) =>
    set((state) => ({ queue: [...state.queue, item], queueCount: state.queue.length + 1 })),

  removeQueueItem: (cid) =>
    set((state) => {
      const queue = state.queue.filter((q) => q.cid !== cid);
      return { queue, queueCount: queue.length };
    }),

  addHitlRequest: (req) =>
    set((state) => ({ hitlRequests: [...state.hitlRequests, req] })),

  removeHitlRequest: (cid) =>
    set((state) => ({ hitlRequests: state.hitlRequests.filter((r) => r.cid !== cid) })),

  setTeam: (members) => set({ team: members }),

  updateTeamMemberStatus: (agentId, status) =>
    set((state) => ({
      team: state.team.map((m) =>
        m.user_id === agentId ? { ...m, status } : m,
      ),
    })),

  setWsConnected: (wsConnected) => set({ wsConnected }),

  setActiveContextTab: (activeContextTab) => set({ activeContextTab }),
  setShowSupervisorPanel: (showSupervisorPanel) => set({ showSupervisorPanel }),
  setShowTransferDialog: (showTransferDialog) => set({ showTransferDialog }),
  setShowWrapUpDialog: (showWrapUpDialog) => set({ showWrapUpDialog }),
  setCurrentNotes: (currentNotes) => set({ currentNotes }),
  setKbSearchQuery: (kbSearchQuery) => set({ kbSearchQuery }),
  setKbResults: (kbResults) => set({ kbResults }),

  updateStats: (stats) =>
    set((state) => ({ statsToday: { ...state.statsToday, ...stats } })),
}));
