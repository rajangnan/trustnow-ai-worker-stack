'use client';
import { useEffect, useState } from 'react';
import { Phone, Bell, ChevronDown, Circle } from 'lucide-react';
import { useDesktopStore, AgentStatus } from '@/store/desktopStore';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: AgentStatus; label: string; color: string; emoji: string }[] = [
  { value: 'available',  label: 'Available',  color: '#22C55E', emoji: '🟢' },
  { value: 'busy',       label: 'Busy',       color: '#F59E0B', emoji: '🟡' },
  { value: 'break',      label: 'Break',      color: '#6B7280', emoji: '☕' },
  { value: 'wrap_up',    label: 'Wrap-up',    color: '#7C3AED', emoji: '📝' },
  { value: 'offline',    label: 'Offline',    color: '#4B5563', emoji: '⚫' },
];

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function Clock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="text-xs text-white/50 tabular-nums font-mono">{time}</span>;
}

export function DesktopTopBar() {
  const {
    agentEmail, agentStatus, setStatus,
    activeCall, callTimerSeconds, tickCallTimer,
    queueCount, statsToday, hitlRequests,
  } = useDesktopStore();

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Call timer
  useEffect(() => {
    if (!activeCall) return;
    const t = setInterval(tickCallTimer, 1000);
    return () => clearInterval(t);
  }, [activeCall, tickCallTimer]);

  const currentStatus = STATUS_OPTIONS.find(s => s.value === agentStatus)!;

  const handleSetStatus = async (s: AgentStatus) => {
    setStatus(s);
    setShowStatusMenu(false);
    try {
      await api.put('/desktop/status', { status: s });
    } catch { /* non-fatal */ }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 bg-[#0A0418] border-b border-white/8">
      {/* LEFT: Logo + Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-[#00D4FF]/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-[#00D4FF]">TN</span>
          </div>
          <span className="text-xs font-semibold text-white/70 hidden sm:block">Agent Desktop</span>
        </div>

        {/* Status selector */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 hover:border-white/20 text-xs"
          >
            <Circle className="h-2.5 w-2.5 fill-current" style={{ color: currentStatus.color }} />
            <span className="text-white/70">{currentStatus.label}</span>
            <ChevronDown className="h-3 w-3 text-white/30" />
          </button>
          {showStatusMenu && (
            <div className="absolute top-full mt-1 left-0 w-40 bg-[#160830] border border-white/10 rounded-lg shadow-xl z-50 py-1">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleSetStatus(opt.value)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/6 transition-colors',
                    agentStatus === opt.value ? 'text-white' : 'text-white/60',
                  )}
                >
                  <Circle className="h-2.5 w-2.5 fill-current" style={{ color: opt.color }} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CENTRE: Active call indicator */}
      <div className="flex items-center gap-3">
        {activeCall ? (
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-[#22C55E]/10 border border-[#22C55E]/25">
            <div className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[#22C55E] text-xs font-mono font-medium">{formatDuration(callTimerSeconds)}</span>
            <span className="text-white/50 text-xs">|</span>
            <span className="text-white/60 text-xs font-mono">{activeCall.cid.slice(0, 8)}</span>
            {activeCall.caller_name && (
              <>
                <span className="text-white/50 text-xs">|</span>
                <span className="text-white/70 text-xs">{activeCall.caller_name}</span>
              </>
            )}
          </div>
        ) : (
          <div className="px-3 py-1 text-xs text-white/30">No active call</div>
        )}
      </div>

      {/* RIGHT: Queue | Stats | Clock | Notifications | Avatar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-xs text-white/50">
          <Phone className="h-3.5 w-3.5" />
          <span className="font-medium">{queueCount}</span>
          <span className="text-white/30">waiting</span>
        </div>

        <div className="hidden md:flex items-center gap-3 text-xs text-white/40">
          <span><span className="text-white/60 font-medium">{statsToday.handled}</span> handled</span>
          <span><span className="text-white/60 font-medium">{Math.floor(statsToday.avg_handle_s / 60)}m {statsToday.avg_handle_s % 60}s</span> avg</span>
          {statsToday.csat > 0 && (
            <span><span className="text-[#22C55E] font-medium">{statsToday.csat}%</span> CSAT</span>
          )}
        </div>

        <Clock />

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-1.5 rounded-md hover:bg-white/6 text-white/50 hover:text-white/80 transition-colors"
          >
            <Bell className="h-4 w-4" />
            {hitlRequests.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#E03E3E] text-[10px] text-white font-bold flex items-center justify-center">
                {hitlRequests.length}
              </span>
            )}
          </button>
          {showNotifMenu && hitlRequests.length > 0 && (
            <div className="absolute top-full right-0 mt-1 w-72 bg-[#160830] border border-white/10 rounded-lg shadow-xl z-50">
              <div className="px-3 py-2 border-b border-white/6">
                <p className="text-xs font-semibold text-white/60">HITL Approvals Required</p>
              </div>
              {hitlRequests.slice(0, 5).map(req => (
                <div key={req.cid} className="px-3 py-2 border-b border-white/4 last:border-0">
                  <p className="text-xs text-white/80 font-medium">{req.action_type}</p>
                  <p className="text-[11px] text-white/45 mt-0.5">{req.action_description?.slice(0, 60)}</p>
                  {req.amount && (
                    <p className="text-[11px] text-[#F59E0B] mt-0.5">{req.currency} {req.amount.toFixed(2)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="h-7 w-7 rounded-full bg-[#7C3AED]/25 border border-[#7C3AED]/40 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-semibold text-[#A78BFA]">
            {agentEmail?.charAt(0).toUpperCase() || 'A'}
          </span>
        </div>
      </div>
    </header>
  );
}
