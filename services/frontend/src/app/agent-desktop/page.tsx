'use client';
import { useEffect } from 'react';
import { useDesktopStore } from '@/store/desktopStore';
import { useDesktopWebSocket } from '@/hooks/useDesktopWebSocket';
import { DesktopTopBar } from '@/components/desktop/DesktopTopBar';
import { QueuePanel } from '@/components/desktop/QueuePanel';
import { ConversationWorkspace } from '@/components/desktop/ConversationWorkspace';
import { ContextPanel } from '@/components/desktop/ContextPanel';
import { SupervisorMonitor } from '@/components/desktop/SupervisorMonitor';
import { HitlApprovalBanner } from '@/components/desktop/HitlApprovalBanner';
import { api } from '@/lib/api';

/**
 * Agent Desktop — 3-panel layout:
 *   QueuePanel (240px) | ConversationWorkspace (flex) | ContextPanel (320px)
 *
 * Top bar is fixed at h-14; the 3-panel region fills h-[calc(100vh-56px)].
 */
export default function AgentDesktopPage() {
  const { setAgentIdentity, setQueue, isSupervisor, showSupervisorPanel } = useDesktopStore();

  // Connect WebSocket
  useDesktopWebSocket();

  // Bootstrap: fetch agent identity + current queue
  useEffect(() => {
    // Agent identity
    api.get('/auth/me')
      .then(({ data }) => {
        setAgentIdentity(
          data.user_id,
          data.email,
          data.role,
          data.tenant_id,
        );
      })
      .catch(() => {
        // Not authenticated — identity will remain null
      });

    // Current queue
    api.get('/desktop/queue')
      .then(({ data }) => setQueue(data || []))
      .catch(() => {});
  }, [setAgentIdentity, setQueue]);

  return (
    <div className="flex flex-col h-full">
      <DesktopTopBar />

      {/* Body — fills space below fixed top bar */}
      <div className="flex flex-1 overflow-hidden pt-14">
        <QueuePanel />

        {/* Centre + right column */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <HitlApprovalBanner />
          <div className="flex flex-1 overflow-hidden">
            <ConversationWorkspace />
            <ContextPanel />
          </div>
        </div>
      </div>

      {/* Supervisor overlay */}
      {isSupervisor && showSupervisorPanel && <SupervisorMonitor />}
    </div>
  );
}
