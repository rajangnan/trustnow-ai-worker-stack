'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDesktopStore } from '@/store/desktopStore';

const WS_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/desktop';

/**
 * useDesktopWebSocket — connects to the NestJS Desktop Gateway.
 *
 * Listens:
 *   handoff:incoming        → addQueueItem
 *   transcript:update       → appendTranscriptTurn
 *   hitl:approval_required  → addHitlRequest
 *   agent:status_changed    → updateTeamMemberStatus
 *
 * Manages join/leave of CID transcript rooms.
 */
export function useDesktopWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const store = useDesktopStore();
  const activeCidRef = useRef<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tn_token') : null;

    const socket = io(WS_URL, {
      auth: token ? { token } : undefined,
      transports: ['websocket'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      store.setWsConnected(true);
      // Rejoin active CID room if reconnecting mid-call
      if (activeCidRef.current) {
        socket.emit('call:join', { cid: activeCidRef.current });
      }
    });

    socket.on('disconnect', () => {
      store.setWsConnected(false);
    });

    // New call in queue
    socket.on('handoff:incoming', (payload: any) => {
      if (payload.type === 'call_accepted') {
        // Another agent accepted — remove from queue
        store.removeQueueItem(payload.cid);
        return;
      }
      store.addQueueItem({
        cid: payload.cid,
        timestamp: new Date().toISOString(),
        queue_time_s: 0,
        context: payload.context,
      });
    });

    // Live transcript update
    socket.on('transcript:update', (payload: any) => {
      if (payload?.event_type === 'transcript_turn' && payload.turn) {
        store.appendTranscriptTurn({
          role: payload.turn.role || 'caller',
          content: payload.turn.content || '',
          timestamp: payload.turn.timestamp || new Date().toISOString(),
          latency_ms: payload.turn.llm_latency_ms,
        });
      }
    });

    // HITL approval needed
    socket.on('hitl:approval_required', (payload: any) => {
      if (payload.action_type) {
        store.addHitlRequest({
          cid: payload.cid,
          action_type: payload.action_type,
          action_description: payload.action_description,
          amount: payload.amount,
          currency: payload.currency,
          risk_level: payload.risk_level,
          sme_domain: payload.sme_domain,
          created_at: payload.created_at || new Date().toISOString(),
          timeout_s: payload.timeout_s,
        });
      } else if (payload.type === 'hitl_resolved') {
        store.removeHitlRequest(payload.cid);
      }
    });

    // Agent status change (supervisor view)
    socket.on('agent:status_changed', (payload: any) => {
      store.updateTeamMemberStatus(payload.agent_id, payload.status);
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join/leave transcript room when active call changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const currentCid = store.activeCall?.cid ?? null;

    if (activeCidRef.current && activeCidRef.current !== currentCid) {
      socket.emit('call:leave', { cid: activeCidRef.current });
    }
    if (currentCid && currentCid !== activeCidRef.current) {
      socket.emit('call:join', { cid: currentCid });
    }
    activeCidRef.current = currentCid;
  }, [store.activeCall?.cid]);

  return socketRef;
}
