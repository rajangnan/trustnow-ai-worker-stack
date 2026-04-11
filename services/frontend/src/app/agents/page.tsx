'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, LayoutGrid, LayoutList, Bot, Phone, Clock, MoreVertical, Copy, Trash2, ExternalLink } from 'lucide-react';
import { agentsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NewAgentWizard } from '@/components/agents/NewAgentWizard';
import type { Agent } from '@/types';

export default function AgentsPage() {
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [showWizard, setShowWizard] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list().then(r => r.data?.agents ?? []),
    placeholderData: [],
  });

  const agents: Agent[] = (data as Agent[]) ?? [];
  const filtered = agents.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Agents</h1>
          <p className="text-sm text-white/45 mt-0.5">{agents.length} agent{agents.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" onClick={() => setShowWizard(true)}>
          <Plus className="h-3.5 w-3.5" />
          New Agent
        </Button>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="h-8 w-full bg-white/5 border border-white/10 rounded-md pl-8 pr-3 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/40"
          />
        </div>
        <div className="flex items-center gap-1 bg-white/5 rounded-md p-0.5">
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Agent list / grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && (
          <div className="flex items-center justify-center h-40 text-white/30">
            <div className="animate-spin h-6 w-6 border-2 border-[#00D4FF]/40 border-t-[#00D4FF] rounded-full" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-60 text-white/25">
            <Bot className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm mb-1">{search ? 'No agents match your search' : 'No agents yet'}</p>
            {!search && (
              <Button variant="outline" className="mt-3" onClick={() => setShowWizard(true)}>
                <Plus className="h-3.5 w-3.5" />
                Create your first agent
              </Button>
            )}
          </div>
        )}

        {view === 'list' && filtered.length > 0 && (
          <div className="tn-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Calls</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Last Used</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">LLM</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((agent) => (
                  <tr key={agent.agent_id} className="border-b border-white/4 hover:bg-white/3 transition-colors group">
                    <td className="px-4 py-3">
                      <Link href={`/agents/${agent.agent_id}`} className="flex items-center gap-3 hover:text-[#00D4FF] transition-colors">
                        <div className="h-7 w-7 rounded-lg bg-[#7C3AED]/20 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-3.5 w-3.5 text-[#7C3AED]" />
                        </div>
                        <span className="text-sm font-medium text-white/90">{agent.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={agent.status === 'active' ? 'live' : 'draft'}>
                        {agent.status === 'active' ? 'Live' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-white/50">{agent.call_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-white/40">
                        {agent.last_used ? new Date(agent.last_used).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/40 font-mono">{agent.llm_model ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AgentRowMenu agentId={agent.agent_id} onDelete={refetch} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'grid' && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((agent) => (
              <Link key={agent.agent_id} href={`/agents/${agent.agent_id}`}>
                <div className="tn-card tn-card-hover p-4 flex flex-col gap-3 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-[#7C3AED]" />
                    </div>
                    <Badge variant={agent.status === 'active' ? 'live' : 'draft'}>
                      {agent.status === 'active' ? 'Live' : 'Draft'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/90">{agent.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">{agent.llm_model ?? 'No model set'}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/35">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{agent.call_count ?? 0} calls</span>
                    {agent.language && <span className="flex items-center gap-1"><ExternalLink className="h-3 w-3" />{agent.language}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showWizard && <NewAgentWizard onClose={() => { setShowWizard(false); refetch(); }} />}
    </div>
  );
}

function AgentRowMenu({ agentId, onDelete }: { agentId: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded-md text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors opacity-0 group-hover:opacity-100"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-[#160830] border border-white/10 rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={() => { agentsApi.duplicate(agentId).then(onDelete); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/8 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            <button
              onClick={() => { agentsApi.delete(agentId).then(onDelete); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#E03E3E] hover:bg-[#E03E3E]/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
