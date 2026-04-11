'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Wrench, Server, Trash2, Edit2, Search, Globe } from 'lucide-react';
import { toolsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Tool } from '@/types';

export default function ToolsPage() {
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState<'Tools' | 'MCP'>('Tools');
  const [search, setSearch] = useState('');

  const { data: tools = [], isLoading } = useQuery<Tool[]>({
    queryKey: ['tools'],
    queryFn: () => toolsApi.list().then(r => r.data?.tools ?? []),
    placeholderData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => toolsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tools'] }),
  });

  const allTools = tools as Tool[];
  const filtered = allTools.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Tools</h1>
            <p className="text-sm text-white/45 mt-0.5">Webhook tools and MCP servers available to all agents</p>
          </div>
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5" /> Create Tool
          </Button>
        </div>

        {/* Sub-tabs */}
        <div className="px-6 flex gap-1 border-b border-white/6">
          {(['Tools', 'MCP'] as const).map(t => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                subTab === t ? 'text-[#00D4FF] border-[#00D4FF]' : 'text-white/40 border-transparent hover:text-white/70'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {subTab === 'Tools' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search tools..."
                    className="h-8 w-64 bg-white/5 border border-white/10 rounded-md pl-8 pr-3 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/40"
                  />
                </div>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin h-6 w-6 border-2 border-[#00D4FF]/40 border-t-[#00D4FF] rounded-full" />
                </div>
              )}

              {!isLoading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center h-60 text-white/25">
                  <Wrench className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">No tools yet</p>
                  <p className="text-xs mt-1">Create webhook tools to allow agents to take actions</p>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Plus className="h-3.5 w-3.5" /> Create Tool
                  </Button>
                </div>
              )}

              {filtered.length > 0 && (
                <div className="tn-card overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/6">
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Used by</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Last used</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(tool => (
                        <tr key={tool.tool_id} className="border-b border-white/4 hover:bg-white/3 group transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-md bg-[#00D4FF]/10 flex items-center justify-center">
                                {tool.type === 'webhook' ? <Globe className="h-3.5 w-3.5 text-[#00D4FF]" /> : <Wrench className="h-3.5 w-3.5 text-[#00D4FF]" />}
                              </div>
                              <span className="text-sm text-white/85">{tool.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={tool.type === 'webhook' ? 'cyan' : tool.type === 'system' ? 'purple' : 'yellow'}>{tool.type}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-white/45 max-w-xs truncate">{tool.description ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-white/40">{tool.used_by_agents ?? 0} agents</td>
                          <td className="px-4 py-3 text-xs text-white/35">
                            {tool.last_used ? new Date(tool.last_used).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1.5 rounded-md text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              {!tool.is_system && (
                                <button
                                  onClick={() => deleteMutation.mutate(tool.tool_id)}
                                  className="p-1.5 rounded-md text-white/30 hover:text-[#E03E3E] hover:bg-[#E03E3E]/10 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {subTab === 'MCP' && (
            <div className="flex flex-col items-center justify-center h-60 text-white/25">
              <Server className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No MCP servers configured</p>
              <p className="text-xs mt-1">Add Model Context Protocol servers to extend agent capabilities</p>
              <Button variant="outline" size="sm" className="mt-3">
                <Plus className="h-3.5 w-3.5" /> Add MCP Server
              </Button>
            </div>
          )}
        </div>
    </div>
  );
}
