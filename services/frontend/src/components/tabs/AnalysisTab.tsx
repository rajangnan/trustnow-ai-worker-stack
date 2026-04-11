'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Clock, Phone, MessageSquare, Zap, ChevronRight, Filter } from 'lucide-react';

const FILTER_CHIPS = [
  'All', 'Successful', 'Failed', 'Transferred', 'Voicemail', 'No Answer',
  'Barged-in', 'Long duration', 'Low score', 'High cost', 'Test', 'Live',
];

interface Props { agentId: string; }

export function AnalysisTab({ agentId }: Props) {
  const [filter, setFilter] = useState('All');
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [convTab, setConvTab] = useState<'overview' | 'transcription' | 'client-data'>('overview');

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', agentId],
    queryFn: () => analyticsApi.conversations({ agent_id: agentId }).then(r => r.data?.conversations ?? []),
    placeholderData: [],
  });

  const { data: convDetail } = useQuery({
    queryKey: ['conversation', selectedConv],
    queryFn: () => selectedConv ? analyticsApi.conversation(selectedConv).then(r => r.data) : null,
    enabled: !!selectedConv,
  });

  const convs = conversations as any[];

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)]">
      {/* Left: Conversation list */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap mb-3">
          {FILTER_CHIPS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all ${
                filter === f
                  ? 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30'
                  : 'bg-white/5 text-white/45 border border-white/8 hover:border-white/20 hover:text-white/70'
              }`}
            >
              {f === 'All' && <Filter className="h-3 w-3" />}
              {f}
            </button>
          ))}
        </div>

        <div className="tn-card flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-32 text-white/30 text-sm">Loading conversations...</div>
          )}
          {!isLoading && convs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-white/25">
              <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No conversations yet</p>
            </div>
          )}
          {convs.map((conv: any) => (
            <button
              key={conv.conversation_id}
              onClick={() => setSelectedConv(conv.conversation_id)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/4 hover:bg-white/4 transition-colors text-left ${
                selectedConv === conv.conversation_id ? 'bg-[#00D4FF]/6' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/80 font-mono">{conv.conversation_id?.slice(0, 8)}...</span>
                  <Badge variant={conv.status === 'completed' ? 'live' : 'yellow'}>{conv.status}</Badge>
                  {conv.environment && (
                    <Badge variant={conv.environment === 'live' ? 'cyan' : 'draft'}>{conv.environment}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-white/35">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{conv.duration_s}s</span>
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{conv.turn_count} turns</span>
                  {conv.evaluation_score != null && (
                    <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{conv.evaluation_score}/10</span>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-white/30 flex-shrink-0">
                <p>{new Date(conv.started_at).toLocaleDateString()}</p>
                {conv.cost_credits != null && <p className="text-[#00D4FF]/60">{conv.cost_credits} cr</p>}
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-white/20" />
            </button>
          ))}
        </div>
      </div>

      {/* Right: Conversation detail */}
      {selectedConv && (
        <div className="w-96 flex-shrink-0 tn-card flex flex-col">
          <div className="flex border-b border-white/6">
            {(['overview', 'transcription', 'client-data'] as const).map(t => (
              <button
                key={t}
                onClick={() => setConvTab(t)}
                className={`flex-1 py-2.5 text-xs capitalize transition-colors ${
                  convTab === t ? 'text-[#00D4FF] border-b-2 border-[#00D4FF]' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {t.replace('-', ' ')}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {convTab === 'overview' && convDetail && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['Duration', `${(convDetail as any).duration_s}s`],
                    ['Turns', (convDetail as any).turn_count],
                    ['LLM Cost', `$${(convDetail as any).llm_cost_usd?.toFixed(4)}`],
                    ['Credits', (convDetail as any).cost_credits],
                    ['TTS Latency', `${(convDetail as any).tts_latency_ms}ms`],
                    ['ASR Latency', `${(convDetail as any).asr_latency_ms}ms`],
                    ['LLM Latency', `${(convDetail as any).llm_latency_ms}ms`],
                    ['Score', (convDetail as any).evaluation_score ?? '—'],
                  ].map(([k, v]) => (
                    <div key={k as string} className="bg-white/4 rounded-md p-2">
                      <p className="text-[10px] text-white/35 uppercase tracking-wider">{k}</p>
                      <p className="text-sm text-white/80 font-medium mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {convTab === 'transcription' && (
              <div className="space-y-2">
                {((convDetail as any)?.transcript ?? []).map((turn: any, i: number) => (
                  <div key={i} className={`flex ${turn.role === 'agent' ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                        turn.role === 'agent'
                          ? 'bg-[#7C3AED]/15 text-white/80 rounded-tl-sm'
                          : 'bg-[#00D4FF]/12 text-[#00D4FF] rounded-tr-sm'
                      }`}
                    >
                      {turn.text}
                      {turn.tts_latency_ms && (
                        <p className="text-[10px] mt-1 opacity-50">TTS: {turn.tts_latency_ms}ms · ASR: {turn.asr_latency_ms}ms</p>
                      )}
                    </div>
                  </div>
                ))}
                {!((convDetail as any)?.transcript?.length) && (
                  <p className="text-xs text-white/30 text-center mt-8">No transcript available</p>
                )}
              </div>
            )}

            {convTab === 'client-data' && (
              <div>
                <pre className="text-xs text-white/60 font-mono bg-white/4 p-3 rounded-md overflow-auto">
                  {JSON.stringify((convDetail as any)?.client_data ?? {}, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
