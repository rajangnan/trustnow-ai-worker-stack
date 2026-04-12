'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Mic, MicOff, PhoneOff, PhoneForwarded, Users,
  FileText, Send, ChevronRight,
} from 'lucide-react';
import { useDesktopStore } from '@/store/desktopStore';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Transcript viewer ──────────────────────────────────────────────────────

function TranscriptLine({ turn }: { turn: { role: string; content: string; timestamp: string } }) {
  const isCallerOrAgent = turn.role === 'caller' || turn.role === 'agent';
  const isSystem = turn.role === 'system';
  const time = new Date(turn.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (isSystem) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="flex-1 h-px bg-white/6" />
        <span className="text-[10px] text-white/30 font-medium px-2">{turn.content}</span>
        <div className="flex-1 h-px bg-white/6" />
      </div>
    );
  }

  const isRight = turn.role === 'agent';
  const labelColor = turn.role === 'caller' ? 'text-[#00D4FF]' : turn.role === 'ai' ? 'text-[#7C3AED]' : 'text-[#22C55E]';
  const labelText = turn.role === 'caller' ? 'Caller' : turn.role === 'ai' ? 'AI Agent' : 'You';

  return (
    <div className={cn('flex flex-col gap-0.5 mb-3', isRight && 'items-end')}>
      <div className={cn('flex items-center gap-1.5', isRight && 'flex-row-reverse')}>
        <span className={cn('text-[10px] font-semibold', labelColor)}>{labelText}</span>
        <span className="text-[10px] text-white/25">{time}</span>
      </div>
      <div className={cn(
        'max-w-[80%] px-3 py-2 rounded-lg text-xs text-white/85 leading-relaxed',
        isRight
          ? 'bg-[#22C55E]/10 border border-[#22C55E]/20'
          : turn.role === 'ai'
            ? 'bg-[#7C3AED]/10 border border-[#7C3AED]/20'
            : 'bg-white/5 border border-white/8',
      )}>
        {turn.content}
      </div>
    </div>
  );
}

// ── Transfer Dialog ────────────────────────────────────────────────────────

function TransferDialog({ cid, onClose }: { cid: string; onClose: () => void }) {
  const [type, setType] = useState<'queue' | 'agent' | 'external'>('queue');
  const [target, setTarget] = useState('');
  const [warm, setWarm] = useState(false);
  const [notes, setNotes] = useState('');
  const { activeCall } = useDesktopStore();

  const handleTransfer = async () => {
    try {
      await api.post(`/desktop/call/${cid}/transfer`, { type, target, warm, notes });
      onClose();
    } catch (err) {
      console.error('Transfer failed', err);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#160830] border border-white/12 rounded-xl p-5 w-80 shadow-2xl">
        <h3 className="text-sm font-semibold text-white mb-4">Transfer Call</h3>

        {/* Transfer type */}
        <div className="flex gap-2 mb-4">
          {(['queue', 'agent', 'external'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'flex-1 py-1.5 rounded-md text-xs font-medium transition-colors',
                type === t ? 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/25' : 'bg-white/5 text-white/40 border border-white/8 hover:text-white/70',
              )}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <input
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 mb-3 focus:outline-none focus:border-[#00D4FF]/40"
          placeholder={type === 'queue' ? 'Queue name' : type === 'agent' ? 'Agent email or ID' : 'Phone number'}
          value={target}
          onChange={e => setTarget(e.target.value)}
        />

        <textarea
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 mb-3 focus:outline-none focus:border-[#00D4FF]/40 resize-none"
          rows={2}
          placeholder="Notes to transferee (AI summary will be included)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <div
            onClick={() => setWarm(!warm)}
            className={cn(
              'h-4 w-7 rounded-full transition-colors relative',
              warm ? 'bg-[#00D4FF]' : 'bg-white/15',
            )}
          >
            <div className={cn('absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform', warm ? 'translate-x-3.5' : 'translate-x-0.5')} />
          </div>
          <span className="text-xs text-white/60">Warm transfer (supervised)</span>
        </label>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs text-white/50 hover:text-white/80 bg-white/5 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleTransfer}
            disabled={!target}
            className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30 hover:bg-[#7C3AED]/30 transition-colors disabled:opacity-40"
          >
            Transfer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Wrap-up Dialog ─────────────────────────────────────────────────────────

function WrapUpDialog({ cid, onClose }: { cid: string; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const { setShowWrapUpDialog, currentNotes } = useDesktopStore();

  const DISPOSITION_CODES = [
    'Resolved', 'Escalated', 'Callback Required', 'Wrong Number',
    'No Answer', 'Complaint', 'Information Only', 'Technical Issue',
  ];

  const handleSubmit = async () => {
    try {
      await api.post(`/desktop/call/${cid}/disposition`, {
        disposition_code: code,
        notes: notes || currentNotes,
      });
      setShowWrapUpDialog(false);
      onClose();
    } catch (err) {
      console.error('Disposition save failed', err);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#160830] border border-white/12 rounded-xl p-5 w-80 shadow-2xl">
        <h3 className="text-sm font-semibold text-white mb-1">Wrap-up</h3>
        <p className="text-xs text-white/40 mb-4">Select a disposition code and add notes before finishing</p>

        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {DISPOSITION_CODES.map(c => (
            <button
              key={c}
              onClick={() => setCode(c)}
              className={cn(
                'py-1.5 px-2 rounded-md text-xs text-left transition-colors',
                code === c ? 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/25' : 'bg-white/4 text-white/50 border border-white/8 hover:text-white/80',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <textarea
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 mb-4 focus:outline-none focus:border-[#00D4FF]/40 resize-none"
          rows={3}
          placeholder="Additional notes…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs text-white/50 hover:text-white/80 bg-white/5 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!code}
            className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/25 hover:bg-[#22C55E]/25 transition-colors disabled:opacity-40"
          >
            Complete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Workspace ─────────────────────────────────────────────────────────

export function ConversationWorkspace() {
  const {
    activeCall,
    setCallOnHold, setCallMuted,
    showTransferDialog, setShowTransferDialog,
    showWrapUpDialog, setShowWrapUpDialog,
    setActiveCall,
  } = useDesktopStore();

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [responseText, setResponseText] = useState('');

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeCall?.transcript]);

  const handleHold = async () => {
    if (!activeCall) return;
    try {
      if (activeCall.on_hold) {
        await api.post(`/desktop/call/${activeCall.cid}/unhold`);
        setCallOnHold(false);
      } else {
        await api.post(`/desktop/call/${activeCall.cid}/hold`);
        setCallOnHold(true);
      }
    } catch { /* non-fatal */ }
  };

  const handleMute = async () => {
    if (!activeCall) return;
    try {
      if (activeCall.muted) {
        await api.post(`/desktop/call/${activeCall.cid}/unmute`);
        setCallMuted(false);
      } else {
        await api.post(`/desktop/call/${activeCall.cid}/mute`);
        setCallMuted(true);
      }
    } catch { /* non-fatal */ }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    try {
      await api.post(`/desktop/call/${activeCall.cid}/end`);
      setShowWrapUpDialog(true);
    } catch { /* non-fatal */ }
  };

  // Idle state
  if (!activeCall) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0E0620] gap-6">
        <div className="h-16 w-16 rounded-full bg-[#00D4FF]/8 border border-[#00D4FF]/15 flex items-center justify-center">
          <PhoneForwarded className="h-7 w-7 text-[#00D4FF]/40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-white/40">Ready for the next interaction</p>
          <p className="text-xs text-white/25 mt-1">Waiting calls will appear in the queue panel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0E0620] relative min-w-0">
      {/* Call controls bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/6 flex-shrink-0">
        {/* Hold */}
        <button
          onClick={handleHold}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            activeCall.on_hold
              ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
              : 'bg-white/5 text-white/60 border border-white/8 hover:text-white/90',
          )}
          title={activeCall.on_hold ? 'Unhold' : 'Hold'}
        >
          <span className="text-sm">{activeCall.on_hold ? '▶' : '⏸'}</span>
          {activeCall.on_hold ? 'Unhold' : 'Hold'}
        </button>

        {/* Mute */}
        <button
          onClick={handleMute}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            activeCall.muted
              ? 'bg-[#E03E3E]/20 text-[#E03E3E] border border-[#E03E3E]/30'
              : 'bg-white/5 text-white/60 border border-white/8 hover:text-white/90',
          )}
          title={activeCall.muted ? 'Unmute' : 'Mute'}
        >
          {activeCall.muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {activeCall.muted ? 'Unmuted' : 'Mute'}
        </button>

        {/* Transfer */}
        <button
          onClick={() => setShowTransferDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 text-white/60 border border-white/8 hover:text-white/90 transition-colors"
        >
          <PhoneForwarded className="h-3.5 w-3.5" />
          Transfer
        </button>

        {/* Conference */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 text-white/60 border border-white/8 hover:text-white/90 transition-colors">
          <Users className="h-3.5 w-3.5" />
          Conference
        </button>

        {/* Wrap-up */}
        <button
          onClick={() => setShowWrapUpDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/5 text-white/60 border border-white/8 hover:text-white/90 transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Wrap-up
        </button>

        <div className="flex-1" />

        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-[#E03E3E]/15 text-[#E03E3E] border border-[#E03E3E]/30 hover:bg-[#E03E3E]/25 transition-colors"
        >
          <PhoneOff className="h-3.5 w-3.5" />
          End Call
        </button>
      </div>

      {/* Handoff context banner */}
      {activeCall.ai_summary && (
        <div className="px-4 py-2.5 bg-[#7C3AED]/8 border-b border-[#7C3AED]/15 flex-shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A78BFA] mb-0.5">AI Handoff Summary</p>
          <p className="text-xs text-white/65">{activeCall.ai_summary}</p>
        </div>
      )}

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeCall.transcript.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-xs text-white/25">Transcript will appear here as the call progresses</p>
          </div>
        ) : (
          <>
            {activeCall.transcript.map((turn, i) => (
              <TranscriptLine key={i} turn={turn} />
            ))}
            <div ref={transcriptEndRef} />
          </>
        )}
      </div>

      {/* Quick response bar */}
      <div className="border-t border-white/6 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D4FF]/30 transition-colors"
            placeholder="Type a response or use canned responses…"
            value={responseText}
            onChange={e => setResponseText(e.target.value)}
          />
          <button
            className="p-2 rounded-lg bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20 hover:bg-[#00D4FF]/20 transition-colors"
            disabled={!responseText.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {['I understand your concern.', 'Let me check that for you.', 'One moment please.', 'Thank you for your patience.'].map(text => (
            <button
              key={text}
              onClick={() => setResponseText(text)}
              className="flex-shrink-0 px-2 py-1 rounded-md text-[10px] bg-white/4 text-white/45 border border-white/8 hover:text-white/70 hover:bg-white/7 transition-colors"
            >
              {text}
            </button>
          ))}
          <button className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] bg-white/4 text-[#00D4FF]/60 border border-white/8 hover:text-[#00D4FF] transition-colors">
            <ChevronRight className="h-3 w-3" />
            More
          </button>
        </div>
      </div>

      {/* Dialogs */}
      {showTransferDialog && (
        <TransferDialog cid={activeCall.cid} onClose={() => setShowTransferDialog(false)} />
      )}
      {showWrapUpDialog && (
        <WrapUpDialog cid={activeCall.cid} onClose={() => {
          setShowWrapUpDialog(false);
          setActiveCall(null);
        }} />
      )}
    </div>
  );
}
