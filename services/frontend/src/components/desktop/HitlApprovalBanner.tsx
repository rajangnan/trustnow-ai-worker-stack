'use client';
import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useDesktopStore, HitlRequest } from '@/store/desktopStore';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const RISK_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  critical: { bg: '#E03E3E/10', border: '#E03E3E/30', text: '#E03E3E' },
  high:     { bg: '#F59E0B/10', border: '#F59E0B/30', text: '#F59E0B' },
  medium:   { bg: '#7C3AED/10', border: '#7C3AED/30', text: '#A78BFA' },
  low:      { bg: 'white/6',    border: 'white/10',    text: 'white/50' },
};

function riskStyle(level?: string) {
  return RISK_COLOR[level?.toLowerCase() ?? ''] ?? RISK_COLOR.low;
}

interface HitlCardProps {
  req: HitlRequest;
}

function HitlCard({ req }: HitlCardProps) {
  const { removeHitlRequest } = useDesktopStore();
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const rs = riskStyle(req.risk_level);

  const handleDecision = async (decision: 'approve' | 'reject') => {
    setSubmitting(decision);
    try {
      await api.post(`/hitl/${req.cid}/${decision}`, { notes });
      removeHitlRequest(req.cid);
    } catch (err) {
      console.error('HITL decision failed', err);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        `bg-[${rs.bg}] border-[${rs.border}]`,
      )}
      style={{
        background: `color-mix(in srgb, ${rs.text} 8%, transparent)`,
        borderColor: `color-mix(in srgb, ${rs.text} 25%, transparent)`,
      }}
    >
      {/* Header row */}
      <div
        className="flex items-start gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: rs.text }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-white/85">{req.action_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
            {req.risk_level && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: rs.text, background: `color-mix(in srgb, ${rs.text} 12%, transparent)` }}
              >
                {req.risk_level}
              </span>
            )}
            {req.sme_domain && (
              <span className="text-[10px] text-white/35">{req.sme_domain}</span>
            )}
          </div>
          {req.amount !== undefined && (
            <p className="text-xs font-mono mt-0.5" style={{ color: rs.text }}>
              {req.currency || 'USD'} {req.amount.toFixed(2)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {req.timeout_s && (
            <div className="flex items-center gap-1 text-[10px] text-white/30">
              <Clock className="h-3 w-3" />
              {req.timeout_s}s
            </div>
          )}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-white/30" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-white/30" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
          {req.action_description && (
            <p className="text-xs text-white/60 leading-relaxed">{req.action_description}</p>
          )}

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-white/30 block mb-0.5">Call ID</span>
              <span className="text-white/65 font-mono">{req.cid.slice(0, 12)}…</span>
            </div>
            <div>
              <span className="text-white/30 block mb-0.5">Requested</span>
              <span className="text-white/65">{new Date(req.created_at).toLocaleTimeString()}</span>
            </div>
          </div>

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Supervisor notes (optional)..."
            className="w-full h-16 bg-black/20 border border-white/8 rounded-md p-2 text-xs text-white/65 placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
          />

          <div className="flex gap-2">
            <button
              onClick={() => handleDecision('approve')}
              disabled={!!submitting}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E]/25',
                submitting && 'opacity-50 cursor-not-allowed',
              )}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {submitting === 'approve' ? 'Approving…' : 'Approve'}
            </button>
            <button
              onClick={() => handleDecision('reject')}
              disabled={!!submitting}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                'bg-[#E03E3E]/15 border border-[#E03E3E]/30 text-[#E03E3E] hover:bg-[#E03E3E]/25',
                submitting && 'opacity-50 cursor-not-allowed',
              )}
            >
              <XCircle className="h-3.5 w-3.5" />
              {submitting === 'reject' ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HitlApprovalBanner() {
  const { hitlRequests } = useDesktopStore();

  if (hitlRequests.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-[#E03E3E]/20 bg-[#E03E3E]/5 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="h-3.5 w-3.5 text-[#E03E3E]" />
        <span className="text-[11px] font-semibold text-[#E03E3E] uppercase tracking-wider">
          {hitlRequests.length} Approval{hitlRequests.length > 1 ? 's' : ''} Required
        </span>
      </div>
      {hitlRequests.map(req => (
        <HitlCard key={`${req.cid}-${req.action_type}`} req={req} />
      ))}
    </div>
  );
}
