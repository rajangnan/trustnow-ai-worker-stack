'use client';
import { useState, useEffect, useRef } from 'react';
import { User, History, FileText, Search, ChevronRight, Phone, Clock, Star, Loader2 } from 'lucide-react';
import { useDesktopStore } from '@/store/desktopStore';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Tab = 'caller_info' | 'history' | 'notes' | 'kb_search';

// ─── Caller Info Tab ────────────────────────────────────────────────────────

function CallerInfoTab() {
  const { activeCall } = useDesktopStore();

  if (!activeCall) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
        <User className="h-8 w-8 text-white/15" />
        <p className="text-xs text-white/25">No active call</p>
      </div>
    );
  }

  const fields: { label: string; value: string | undefined }[] = [
    { label: 'Phone', value: activeCall.caller_phone },
    { label: 'Name', value: activeCall.caller_name },
    { label: 'Account ID', value: activeCall.account_id },
    { label: 'Auth Method', value: activeCall.auth_method },
    { label: 'Agent', value: activeCall.agent_name },
  ];

  return (
    <div className="p-3 space-y-4">
      {/* Avatar */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-[#00D4FF]/15 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-[#00D4FF]">
            {activeCall.caller_name?.charAt(0).toUpperCase() || activeCall.caller_phone?.charAt(0) || '?'}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-white/80">
            {activeCall.caller_name || activeCall.caller_phone || 'Unknown caller'}
          </p>
          <p className="text-[10px] text-white/40 font-mono">{activeCall.cid.slice(0, 8)}</p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-2">
        {fields.filter(f => f.value).map(f => (
          <div key={f.label} className="flex items-start gap-2">
            <span className="text-[10px] text-white/30 uppercase tracking-wider w-20 flex-shrink-0 pt-0.5">{f.label}</span>
            <span className="text-xs text-white/70 break-all">{f.value}</span>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      {activeCall.ai_summary && (
        <div className="rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A78BFA] mb-1.5">AI Summary</p>
          <p className="text-xs text-white/65 leading-relaxed">{activeCall.ai_summary}</p>
        </div>
      )}
    </div>
  );
}

// ─── History Tab ────────────────────────────────────────────────────────────

interface HistoryItem {
  cid: string;
  started_at: string;
  ended_at?: string;
  disposition_code?: string;
  wrap_up_notes?: string;
  agent_name?: string;
  ai_summary?: string;
  duration_s?: number;
}

function HistoryTab() {
  const { activeCall } = useDesktopStore();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeCall?.caller_phone) return;
    setLoading(true);
    api.get(`/desktop/history/${encodeURIComponent(activeCall.caller_phone)}`)
      .then(({ data }) => setItems(data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeCall?.caller_phone]);

  if (!activeCall?.caller_phone) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
        <History className="h-8 w-8 text-white/15" />
        <p className="text-xs text-white/25">No active call</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 text-white/30 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
        <History className="h-8 w-8 text-white/15" />
        <p className="text-xs text-white/25">No previous interactions</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/4">
      {items.map(item => {
        const date = new Date(item.started_at);
        const duration = item.duration_s
          ? `${Math.floor(item.duration_s / 60)}m ${item.duration_s % 60}s`
          : null;
        return (
          <div key={item.cid} className="p-3 hover:bg-white/3 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-white/30 flex-shrink-0" />
                <span className="text-[10px] font-mono text-white/50">
                  {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {duration && (
                <div className="flex items-center gap-1 text-[10px] text-white/30">
                  <Clock className="h-3 w-3" />
                  {duration}
                </div>
              )}
            </div>
            {item.ai_summary && (
              <p className="mt-1 text-[11px] text-white/55 leading-relaxed line-clamp-2">{item.ai_summary}</p>
            )}
            <div className="mt-1.5 flex items-center gap-2">
              {item.disposition_code && (
                <span className="px-1.5 py-0.5 rounded bg-white/6 text-[10px] text-white/40">
                  {item.disposition_code}
                </span>
              )}
              {item.agent_name && (
                <span className="text-[10px] text-white/30">{item.agent_name}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Notes Tab ──────────────────────────────────────────────────────────────

const DISPOSITION_CODES = [
  { code: 'resolved', label: 'Resolved' },
  { code: 'escalated', label: 'Escalated' },
  { code: 'callback_scheduled', label: 'Callback Scheduled' },
  { code: 'wrong_number', label: 'Wrong Number' },
  { code: 'abandoned', label: 'Abandoned' },
  { code: 'transferred', label: 'Transferred' },
  { code: 'voicemail', label: 'Voicemail' },
  { code: 'no_action_required', label: 'No Action Required' },
];

function NotesTab() {
  const { activeCall, currentNotes, setCurrentNotes } = useDesktopStore();

  if (!activeCall) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
        <FileText className="h-8 w-8 text-white/15" />
        <p className="text-xs text-white/25">No active call</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 block mb-1.5">
          Call Notes
        </label>
        <textarea
          value={currentNotes}
          onChange={e => setCurrentNotes(e.target.value)}
          placeholder="Add notes about this call..."
          className="w-full h-36 bg-white/5 border border-white/8 rounded-lg p-2.5 text-xs text-white/75 placeholder:text-white/20 focus:outline-none focus:border-[#7C3AED]/40 resize-none leading-relaxed"
        />
      </div>
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30 block mb-1.5">
          Quick Disposition
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {DISPOSITION_CODES.map(d => (
            <button
              key={d.code}
              className="px-2 py-1.5 text-[10px] text-white/50 bg-white/4 border border-white/8 rounded-md hover:bg-[#7C3AED]/15 hover:border-[#7C3AED]/30 hover:text-white/75 transition-colors text-left leading-tight"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── KB Search Tab ──────────────────────────────────────────────────────────

interface KbResult {
  id: string;
  title: string;
  content_preview: string;
  category?: string;
  relevance_score?: number;
}

function KbSearchTab() {
  const { activeCall, kbSearchQuery, setKbSearchQuery, kbResults, setKbResults } = useDesktopStore();
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!kbSearchQuery.trim()) {
      setKbResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: kbSearchQuery });
        if (activeCall?.account_id) params.set('agent_id', activeCall.account_id);
        const { data } = await api.get(`/desktop/kb/search?${params}`);
        setKbResults(data || []);
      } catch {
        setKbResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [kbSearchQuery, activeCall?.account_id, setKbResults]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/6">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <input
            type="text"
            value={kbSearchQuery}
            onChange={e => setKbSearchQuery(e.target.value)}
            placeholder="Search knowledge base..."
            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/8 rounded-lg text-xs text-white/75 placeholder:text-white/25 focus:outline-none focus:border-[#00D4FF]/30"
          />
          {loading && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 animate-spin" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!kbSearchQuery.trim() ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
            <Search className="h-8 w-8 text-white/15" />
            <p className="text-xs text-white/25">Type to search the knowledge base</p>
          </div>
        ) : kbResults.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
            <p className="text-xs text-white/25">No results found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/4">
            {(kbResults as KbResult[]).map(result => (
              <div
                key={result.id}
                className="p-3 hover:bg-white/3 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-white/75 leading-snug group-hover:text-white/90 transition-colors">
                    {result.title}
                  </p>
                  <ChevronRight className="h-3.5 w-3.5 text-white/20 flex-shrink-0 mt-0.5 group-hover:text-white/40 transition-colors" />
                </div>
                {result.category && (
                  <span className="mt-1 inline-block px-1.5 py-0.5 rounded bg-[#00D4FF]/8 text-[10px] text-[#00D4FF]/70">
                    {result.category}
                  </span>
                )}
                <p className="mt-1 text-[11px] text-white/40 leading-relaxed line-clamp-3">
                  {result.content_preview}
                </p>
                {result.relevance_score !== undefined && (
                  <div className="mt-1.5 flex items-center gap-1">
                    <Star className="h-3 w-3 text-[#F59E0B]/50" />
                    <span className="text-[10px] text-white/25">
                      {Math.round(result.relevance_score * 100)}% match
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ContextPanel ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'caller_info', label: 'Caller', icon: User },
  { id: 'history', label: 'History', icon: History },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'kb_search', label: 'KB', icon: Search },
];

export function ContextPanel() {
  const { activeContextTab, setActiveContextTab } = useDesktopStore();

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col bg-[#0A0418] border-l border-white/6 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-white/6 flex-shrink-0">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeContextTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveContextTab(tab.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors border-b-2',
                active
                  ? 'border-[#00D4FF] text-[#00D4FF]'
                  : 'border-transparent text-white/35 hover:text-white/55',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeContextTab === 'caller_info' && <CallerInfoTab />}
        {activeContextTab === 'history' && <HistoryTab />}
        {activeContextTab === 'notes' && <NotesTab />}
        {activeContextTab === 'kb_search' && <KbSearchTab />}
      </div>
    </aside>
  );
}
