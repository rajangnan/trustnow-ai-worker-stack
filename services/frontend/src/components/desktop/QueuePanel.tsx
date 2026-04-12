'use client';
import { useState } from 'react';
import { Phone, Clock, PhoneIncoming } from 'lucide-react';
import { useDesktopStore, QueueItem } from '@/store/desktopStore';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

function formatWait(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function QueueRow({ item, onAccept }: { item: QueueItem; onAccept: (item: QueueItem) => void }) {
  const isSlaBreached = item.queue_time_s > 120;
  return (
    <div
      className={cn(
        'p-3 border-b border-white/4 hover:bg-white/4 transition-colors cursor-pointer group',
        isSlaBreached && 'border-l-2 border-l-[#E03E3E]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-full bg-[#00D4FF]/15 flex items-center justify-center flex-shrink-0">
            <PhoneIncoming className="h-3.5 w-3.5 text-[#00D4FF]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/80 truncate">
              {item.context?.caller_name || item.context?.caller_phone || 'Unknown caller'}
            </p>
            <p className="text-[10px] text-white/40 truncate">
              {item.context?.caller_intent || 'Incoming transfer'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={cn(
            'text-[10px] font-mono tabular-nums',
            isSlaBreached ? 'text-[#E03E3E]' : 'text-white/40',
          )}>
            {formatWait(item.queue_time_s)}
          </span>
        </div>
      </div>
      <button
        onClick={() => onAccept(item)}
        className="mt-2 w-full py-1 text-[10px] font-medium bg-[#22C55E]/10 border border-[#22C55E]/25 text-[#22C55E] rounded-md hover:bg-[#22C55E]/20 transition-colors opacity-0 group-hover:opacity-100"
      >
        Accept
      </button>
    </div>
  );
}

export function QueuePanel() {
  const { queue, setActiveCall, removeQueueItem, agentId, tenantId } = useDesktopStore();
  const [parkedCalls] = useState<QueueItem[]>([]);

  const handleAccept = async (item: QueueItem) => {
    try {
      await api.post(`/desktop/queue/${item.cid}/accept`);
      removeQueueItem(item.cid);

      // Fetch full context and activate call
      const { data } = await api.get(`/desktop/context/${item.cid}`);
      setActiveCall({
        cid: item.cid,
        caller_phone: data.context?.caller_phone,
        caller_name: data.context?.caller_name,
        account_id: data.context?.caller_data?.account_id,
        ai_summary: data.context?.ai_summary || data.context?.caller_intent,
        started_at: new Date().toISOString(),
        transcript: (data.transcript || []).map((t: any) => ({
          role: t.role,
          content: t.content,
          timestamp: t.timestamp,
        })),
        on_hold: false,
        muted: false,
        channel_uuid: data.channel_uuid,
      });
    } catch (err) {
      console.error('Accept call failed', err);
    }
  };

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col bg-[#0A0418] border-r border-white/6 overflow-y-auto">
      {/* My Queues */}
      <div className="px-3 py-2.5 border-b border-white/6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25">My Queues</p>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Inbound</span>
            <div className="flex items-center gap-1.5">
              <span className="text-white/40 text-[10px]">Oldest: {queue.length ? formatWait(Math.max(...queue.map(q => q.queue_time_s))) : '—'}</span>
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                queue.length > 0 ? 'bg-[#E03E3E]/15 text-[#E03E3E]' : 'bg-white/6 text-white/30',
              )}>
                {queue.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Waiting interactions */}
      <div className="flex-1">
        <div className="px-3 py-2 border-b border-white/4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25">Waiting</p>
        </div>

        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
            <div className="h-10 w-10 rounded-full bg-[#22C55E]/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-[#22C55E]/50" />
            </div>
            <div>
              <p className="text-xs text-white/30">Queue is empty</p>
              <p className="text-[10px] text-white/20 mt-0.5">All caught up!</p>
            </div>
          </div>
        ) : (
          queue.map((item) => (
            <QueueRow key={item.cid} item={item} onAccept={handleAccept} />
          ))
        )}
      </div>

      {/* Parked / on hold */}
      {parkedCalls.length > 0 && (
        <div className="border-t border-white/6">
          <div className="px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/25">On Hold</p>
          </div>
          {parkedCalls.map((item) => (
            <div key={item.cid} className="px-3 py-2 border-b border-white/4 flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70">{item.context?.caller_name || 'Caller'}</p>
                <p className="text-[10px] text-white/40 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatWait(item.queue_time_s)}
                </p>
              </div>
              <button className="text-[10px] text-[#00D4FF] hover:underline">Return</button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
