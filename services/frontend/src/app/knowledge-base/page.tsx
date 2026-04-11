'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Link2, FileText, Globe, Trash2, Search, BookOpen } from 'lucide-react';
import { kbApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { KnowledgeBaseDoc } from '@/types';

function formatSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes > 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}

export default function KnowledgeBasePage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: docs = [], isLoading } = useQuery<KnowledgeBaseDoc[]>({
    queryKey: ['kb'],
    queryFn: () => kbApi.list().then(r => r.data?.docs ?? []),
    placeholderData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kbApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kb'] }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);
      fd.append('type', 'file');
      return kbApi.create(fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kb'] }),
  });

  const allDocs = docs as KnowledgeBaseDoc[];
  const filtered = allDocs.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'All' && d.type !== typeFilter.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Knowledge Base</h1>
            <p className="text-sm text-white/45 mt-0.5">{allDocs.length} documents · workspace-level assets</p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.txt,.doc,.docx,.csv,.json,.md"
              className="hidden"
              onChange={e => Array.from(e.target.files ?? []).forEach(f => uploadMutation.mutate(f))}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} loading={uploadMutation.isPending}>
              <Upload className="h-3.5 w-3.5" /> Upload File
            </Button>
            <Button variant="outline" size="sm">
              <Link2 className="h-3.5 w-3.5" /> Add URL
            </Button>
            <Button variant="primary" size="sm">
              <FileText className="h-3.5 w-3.5" /> Paste Text
            </Button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="h-8 w-64 bg-white/5 border border-white/10 rounded-md pl-8 pr-3 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/40"
            />
          </div>
          {['All', 'File', 'URL', 'Text'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs transition-all ${
                typeFilter === t ? 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/25' : 'text-white/45 border border-white/8 hover:border-white/20'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-6 w-6 border-2 border-[#00D4FF]/40 border-t-[#00D4FF] rounded-full" />
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-60 text-white/25">
              <BookOpen className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">{search || typeFilter !== 'All' ? 'No documents match filters' : 'No documents yet'}</p>
              <p className="text-xs mt-1">Upload PDFs, TXTs, add URLs, or paste text to build your knowledge base</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="tn-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/6">
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Chunks</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Agents</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(doc => (
                    <tr key={doc.kb_id} className="border-b border-white/4 hover:bg-white/3 group transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {doc.type === 'url'
                            ? <Globe className="h-4 w-4 text-[#00D4FF]/60" />
                            : <FileText className="h-4 w-4 text-white/40" />
                          }
                          <span className="text-sm text-white/80">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant="cyan">{doc.type}</Badge></td>
                      <td className="px-4 py-3 text-xs text-white/40">{formatSize(doc.size_bytes)}</td>
                      <td className="px-4 py-3 text-xs text-white/40">{doc.chunk_count ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={doc.status === 'ready' ? 'live' : doc.status === 'error' ? 'red' : 'yellow'}>
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/40">{doc.dependent_agents ?? 0} agents</td>
                      <td className="px-4 py-3 text-xs text-white/35">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteMutation.mutate(doc.kb_id)}
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
    </div>
  );
}
