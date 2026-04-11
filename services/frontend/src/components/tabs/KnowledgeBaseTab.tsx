'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Link2, Trash2, Settings2, FileText, Globe, ChevronRight } from 'lucide-react';
import { kbApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Slider } from '@/components/ui/slider';
import { Select } from '@/components/ui/select';
import type { KnowledgeBaseDoc, AgentConfig } from '@/types';

interface Props {
  agentId: string;
  config: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
}

function formatSize(bytes: number): string {
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes > 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function KnowledgeBaseTab({ agentId, config, onChange }: Props) {
  const qc = useQueryClient();
  const [showRagConfig, setShowRagConfig] = useState(false);

  const { data: docs = [] } = useQuery<KnowledgeBaseDoc[]>({
    queryKey: ['kb-agent', agentId],
    queryFn: () => kbApi.getAgentDocs(agentId).then(r => r.data?.docs ?? []),
    placeholderData: [],
  });

  const detachMutation = useMutation({
    mutationFn: (kbId: string) => kbApi.detachFromAgent(agentId, kbId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kb-agent', agentId] }),
  });

  return (
    <div className="max-w-2xl space-y-4">
      {/* RAG Configuration button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/55">Attach knowledge base documents to give your agent factual grounding.</p>
        <Button variant="outline" size="sm" onClick={() => setShowRagConfig(!showRagConfig)}>
          <Settings2 className="h-3.5 w-3.5" />
          Configure RAG
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showRagConfig ? 'rotate-90' : ''}`} />
        </Button>
      </div>

      {/* RAG Config Panel */}
      {showRagConfig && (
        <div className="tn-card p-4 space-y-4">
          <Toggle
            checked={!!config.rag_enabled}
            onChange={v => onChange({ rag_enabled: v })}
            label="Enable RAG"
            description="Retrieve relevant context from KB before each LLM call"
          />

          {config.rag_enabled && (
            <>
              <Select
                label="Embedding Model"
                value={config.rag_embedding_model ?? 'english'}
                onChange={v => onChange({ rag_embedding_model: v as any })}
                options={[
                  { value: 'english', label: 'English (smaller, faster)' },
                  { value: 'multilingual', label: 'Multilingual (larger, supports all languages)' },
                ]}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/55 mb-1.5 block">Character limit</label>
                  <input
                    type="number"
                    value={config.rag_char_limit ?? 50000}
                    onChange={e => onChange({ rag_char_limit: parseInt(e.target.value) })}
                    className="h-8 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 focus:outline-none focus:border-[#00D4FF]/50"
                  />
                  <p className="text-[10px] text-white/30 mt-1">Max 50,000</p>
                </div>
                <div>
                  <label className="text-xs text-white/55 mb-1.5 block">Chunk limit</label>
                  <input
                    type="number"
                    value={config.rag_chunk_limit ?? 20}
                    onChange={e => onChange({ rag_chunk_limit: parseInt(e.target.value) })}
                    className="h-8 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 focus:outline-none focus:border-[#00D4FF]/50"
                  />
                  <p className="text-[10px] text-white/30 mt-1">Max 20</p>
                </div>
              </div>

              <Slider
                label="Vector distance threshold"
                value={config.rag_vector_distance ?? 0.7}
                onChange={v => onChange({ rag_vector_distance: v })}
                leftLabel="Strict (exact match)"
                rightLabel="Loose (broad match)"
              />

              <Toggle
                checked={!!config.rag_query_rewrite}
                onChange={v => onChange({ rag_query_rewrite: v })}
                label="Query rewrite"
                description="Rewrite user query for better retrieval accuracy"
              />
            </>
          )}
        </div>
      )}

      {/* Upload actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Upload className="h-3.5 w-3.5" /> Upload File
        </Button>
        <Button variant="outline" size="sm">
          <Link2 className="h-3.5 w-3.5" /> Add URL
        </Button>
        <Button variant="outline" size="sm">
          <FileText className="h-3.5 w-3.5" /> Paste Text
        </Button>
      </div>

      {/* Documents table */}
      {docs.length === 0 ? (
        <div className="tn-card p-8 flex flex-col items-center text-center text-white/25">
          <FileText className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No documents attached</p>
          <p className="text-xs mt-1">Upload files, paste URLs, or add text to build your KB</p>
        </div>
      ) : (
        <div className="tn-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/6">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.kb_id} className="border-b border-white/4 hover:bg-white/3 group transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {doc.type === 'url' ? <Globe className="h-3.5 w-3.5 text-white/40" /> : <FileText className="h-3.5 w-3.5 text-white/40" />}
                      <span className="text-sm text-white/80">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="cyan">{doc.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">
                    {doc.size_bytes ? formatSize(doc.size_bytes) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={doc.status === 'ready' ? 'live' : doc.status === 'error' ? 'red' : 'yellow'}>
                      {doc.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => detachMutation.mutate(doc.kb_id)}
                      className="p-1.5 rounded-md text-white/30 hover:text-[#E03E3E] hover:bg-[#E03E3E]/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
