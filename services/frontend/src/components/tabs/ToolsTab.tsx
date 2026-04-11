'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Wrench, Server, Globe } from 'lucide-react';
import { toolsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Tool } from '@/types';

// System tools — confirmed live names from ElevenLabs platform
const SYSTEM_TOOLS: Tool[] = [
  { tool_id: 'sys-end-call', name: 'End call', type: 'system', is_system: true, description: 'Ends the current call' },
  { tool_id: 'sys-transfer', name: 'Transfer to human agent', type: 'system', is_system: true, description: 'Transfer call to a live agent' },
  { tool_id: 'sys-voicemail', name: 'Leave voicemail', type: 'system', is_system: true, description: 'Record a voicemail message' },
  { tool_id: 'sys-dtmf', name: 'Play keypad touch tone', type: 'system', is_system: true, description: 'Play DTMF touch tones on the call' },
  { tool_id: 'sys-speak', name: 'Speak', type: 'system', is_system: true, description: 'Speak a specific message' },
  { tool_id: 'sys-pause', name: 'Pause conversation', type: 'system', is_system: true, description: 'Temporarily pause the conversation' },
];

interface Props { agentId: string; }

export function ToolsTab({ agentId }: Props) {
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState<'Tools' | 'MCP'>('Tools');

  const { data: agentTools = [] } = useQuery<Tool[]>({
    queryKey: ['agent-tools', agentId],
    queryFn: () => toolsApi.list({ agent_id: agentId }).then(r => r.data?.tools ?? []),
    placeholderData: [],
  });

  const detachMutation = useMutation({
    mutationFn: (toolId: string) => toolsApi.detachFromAgent(agentId, toolId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent-tools', agentId] }),
  });

  const allTools = [...SYSTEM_TOOLS, ...((agentTools as Tool[]).filter(t => !t.is_system))];

  return (
    <div className="max-w-2xl">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-white/6 mb-4">
        {(['Tools', 'MCP'] as const).map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              subTab === t ? 'text-[#00D4FF] border-[#00D4FF]' : 'text-white/45 border-transparent hover:text-white/70'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {subTab === 'Tools' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-white/55">Tools allow your agent to take actions during a call.</p>
            <Button variant="outline" size="sm">
              <Plus className="h-3.5 w-3.5" /> Add Tool
            </Button>
          </div>

          {/* System tools */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2">System Tools</p>
            <div className="tn-card overflow-hidden">
              {SYSTEM_TOOLS.map(tool => (
                <div key={tool.tool_id} className="flex items-center gap-3 px-4 py-3 border-b border-white/4 last:border-0">
                  <div className="h-7 w-7 rounded-md bg-[#7C3AED]/15 flex items-center justify-center flex-shrink-0">
                    <Wrench className="h-3.5 w-3.5 text-[#7C3AED]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80">{tool.name}</p>
                    <p className="text-xs text-white/40">{tool.description}</p>
                  </div>
                  <Badge variant="cyan">System</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Custom tools */}
          {(agentTools as Tool[]).filter(t => !t.is_system).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-2">Custom Tools</p>
              <div className="tn-card overflow-hidden">
                {(agentTools as Tool[]).filter(t => !t.is_system).map(tool => (
                  <div key={tool.tool_id} className="flex items-center gap-3 px-4 py-3 border-b border-white/4 last:border-0 group">
                    <div className="h-7 w-7 rounded-md bg-[#00D4FF]/12 flex items-center justify-center flex-shrink-0">
                      <Globe className="h-3.5 w-3.5 text-[#00D4FF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80">{tool.name}</p>
                      <p className="text-xs text-white/40">{tool.description ?? 'Webhook tool'}</p>
                    </div>
                    <Badge variant="draft">{tool.type}</Badge>
                    <button
                      onClick={() => detachMutation.mutate(tool.tool_id)}
                      className="p-1.5 rounded-md text-white/30 hover:text-[#E03E3E] hover:bg-[#E03E3E]/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'MCP' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-white/55">Model Context Protocol — connect external tool servers.</p>
            <Button variant="outline" size="sm">
              <Plus className="h-3.5 w-3.5" /> Add MCP Server
            </Button>
          </div>
          <div className="tn-card p-8 flex flex-col items-center text-center text-white/25">
            <Server className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No MCP servers configured</p>
            <p className="text-xs mt-1">Add an MCP server to expose additional tools via Model Context Protocol</p>
          </div>
        </div>
      )}
    </div>
  );
}
