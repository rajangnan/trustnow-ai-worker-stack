'use client';
import { useEffect, useState } from 'react';
import { Users, Mic, Headphones, PhoneCall, Clock, TrendingUp, X } from 'lucide-react';
import { useDesktopStore, TeamMember, AgentStatus } from '@/store/desktopStore';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<AgentStatus, { dot: string; label: string; bg: string }> = {
  available: { dot: '#22C55E', label: 'Available',  bg: '#22C55E/10' },
  busy:      { dot: '#F59E0B', label: 'Busy',       bg: '#F59E0B/10' },
  break:     { dot: '#6B7280', label: 'Break',      bg: 'white/5' },
  wrap_up:   { dot: '#7C3AED', label: 'Wrap-up',    bg: '#7C3AED/10' },
  offline:   { dot: '#4B5563', label: 'Offline',    bg: 'white/3' },
};

function formatAvg(s: number) {
  if (!s) return '—';
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

interface AgentCardProps {

  member: TeamMember;
  onBarge: (m: TeamMember) => void;
  onWhisper: (m: TeamMember) => void;
}

function AgentCard({ member, onBarge, onWhisper }: AgentCardProps) {
  const st = STATUS_STYLE[member.status] ?? STATUS_STYLE.offline;
  const initials = [member.first_name, member.last_name]
    .filter(Boolean)
    .map(s => s![0].toUpperCase())
    .join('') || member.email.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        'rounded-lg border border-white/6 p-3 flex flex-col gap-2 transition-colors',
        member.status === 'busy' ? 'bg-[#F59E0B]/5' : 'bg-white/3',
      )}
    >
      {/* Top row */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-semibold text-[#A78BFA]">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white/75 truncate">
            {[member.first_name, member.last_name].filter(Boolean).join(' ') || member.email}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ background: st.dot }}
            />
            <span className="text-[10px] text-white/40">{st.label}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="flex items-center gap-1 text-white/35">
          <PhoneCall className="h-3 w-3" />
          <span>{member.calls_today ?? 0} calls</span>
        </div>
        <div className="flex items-center gap-1 text-white/35">
          <Clock className="h-3 w-3" />
          <span>{formatAvg(member.avg_handle_s ?? 0)}</span>
        </div>
      </div>

      {/* Supervisor actions — only when agent is on a call */}
      {member.current_cid && (
        <div className="flex gap-1.5 mt-1">
          <button
            onClick={() => onWhisper(member)}
            title="Whisper (agent hears only)"
            className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-medium bg-[#7C3AED]/15 border border-[#7C3AED]/25 text-[#A78BFA] rounded-md hover:bg-[#7C3AED]/25 transition-colors"
          >
            <Mic className="h-3 w-3" />
            Whisper
          </button>
          <button
            onClick={() => onBarge(member)}
            title="Barge in (all parties hear)"
            className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-medium bg-[#E03E3E]/15 border border-[#E03E3E]/25 text-[#E03E3E] rounded-md hover:bg-[#E03E3E]/25 transition-colors"
          >
            <Headphones className="h-3 w-3" />
            Barge
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Wallboard row ──────────────────────────────────────────────────────────

interface WallboardStat {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

function WallboardRow({ stats }: { stats: WallboardStat[] }) {
  return (
    <div className="grid grid-cols-4 gap-3 px-4 py-3 border-b border-white/6">
      {stats.map(s => (
        <div key={s.label} className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-white/25 mb-0.5">{s.label}</p>
          <p className="text-lg font-bold tabular-nums" style={{ color: s.accent ?? '#fff' }}>
            {s.value}
          </p>
          {s.sub && <p className="text-[10px] text-white/30">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── SupervisorMonitor ──────────────────────────────────────────────────────

export function SupervisorMonitor() {
  const { team, setTeam, setShowSupervisorPanel } = useDesktopStore();
  const [wallboard, setWallboard] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/desktop/team')
      .then(({ data }) => setTeam(data?.members || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Refresh every 30s
    const interval = setInterval(() => {
      api.get('/desktop/team')
        .then(({ data }) => setTeam(data?.members || data || []))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [setTeam]);

  const handleBarge = async (member: TeamMember) => {
    if (!member.current_cid) return;
    try {
      await api.post(`/desktop/call/${member.current_cid}/barge`);
    } catch (err) {
      console.error('Barge failed', err);
    }
  };

  const handleWhisper = async (member: TeamMember) => {
    if (!member.current_cid) return;
    try {
      await api.post(`/desktop/call/${member.current_cid}/whisper`);
    } catch (err) {
      console.error('Whisper failed', err);
    }
  };

  // Derived wallboard stats
  const onCall = team.filter(m => m.status === 'busy').length;
  const available = team.filter(m => m.status === 'available').length;
  const onBreak = team.filter(m => m.status === 'break' || m.status === 'wrap_up').length;
  const totalHandled = team.reduce((sum, m) => sum + (m.calls_today ?? 0), 0);
  const avgHandle = team.length
    ? Math.round(team.reduce((sum, m) => sum + (m.avg_handle_s ?? 0), 0) / team.length)
    : 0;

  const wallboardStats: WallboardStat[] = [
    { label: 'On Call',   value: onCall,     accent: '#F59E0B' },
    { label: 'Available', value: available,   accent: '#22C55E' },
    { label: 'Break',     value: onBreak,     accent: '#6B7280' },
    { label: 'Handled',   value: totalHandled, sub: `avg ${formatAvg(avgHandle)}` },
  ];

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-4">
      <div className="w-full max-w-3xl bg-[#0D0521] border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#00D4FF]" />
            <span className="text-sm font-semibold text-white/80">Team Monitor</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/8 text-[10px] text-white/45">
              {team.length} agents
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWallboard(!wallboard)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors',
                wallboard
                  ? 'bg-[#00D4FF]/15 border border-[#00D4FF]/30 text-[#00D4FF]'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/70',
              )}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Wallboard
            </button>
            <button
              onClick={() => setShowSupervisorPanel(false)}
              className="p-1.5 rounded-md hover:bg-white/6 text-white/40 hover:text-white/70 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Wallboard stats */}
        {wallboard && <WallboardRow stats={wallboardStats} />}

        {/* Agent grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 rounded-full border-2 border-[#00D4FF]/30 border-t-[#00D4FF] animate-spin" />
            </div>
          ) : team.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <Users className="h-8 w-8 text-white/15" />
              <p className="text-xs text-white/25">No team members found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {team.map(member => (
                <AgentCard
                  key={member.user_id}
                  member={member}
                  onBarge={handleBarge}
                  onWhisper={handleWhisper}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
