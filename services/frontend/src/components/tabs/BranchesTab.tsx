'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, History, Trash2, Edit2 } from 'lucide-react';
import { branchesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Branch } from '@/types';

interface Props { agentId: string; }

export function BranchesTab({ agentId }: Props) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ['branches', agentId],
    queryFn: () => branchesApi.list(agentId).then(r => r.data?.branches ?? []),
    placeholderData: [],
  });

  const createMutation = useMutation({
    mutationFn: () => branchesApi.create(agentId, { name: newName }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches', agentId] }); setCreating(false); setNewName(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => branchesApi.delete(agentId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches', agentId] }),
  });

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/55">A/B test different agent configurations. Each branch can have independent traffic weighting.</p>
        <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> New Branch
        </Button>
      </div>

      {isLoading && <div className="h-20 flex items-center justify-center text-white/30 text-sm">Loading...</div>}

      {!isLoading && branches.length === 0 && (
        <div className="tn-card p-8 flex flex-col items-center text-center text-white/25">
          <p className="text-sm">No branches yet</p>
          <p className="text-xs mt-1">Create branches to A/B test agent configurations</p>
        </div>
      )}

      {branches.length > 0 && (
        <div className="tn-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/6">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Traffic Split</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Created By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {branches.map(branch => (
                <tr key={branch.branch_id} className="border-b border-white/4 hover:bg-white/3 transition-colors group">
                  <td className="px-4 py-3 text-sm text-white/80 font-medium">{branch.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Badge variant={branch.status === 'live' ? 'live' : 'draft'}>{branch.status}</Badge>
                      {branch.is_live && <Badge variant="live">Live</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-[#00D4FF]" style={{ width: `${branch.traffic_split}%` }} />
                      </div>
                      <span className="text-xs text-white/50">{branch.traffic_split}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">{branch.created_by ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-white/35">
                    {new Date(branch.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded-md text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors">
                        <History className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(branch.branch_id)}
                        className="p-1.5 rounded-md text-white/40 hover:text-[#E03E3E] hover:bg-[#E03E3E]/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent title="New Branch" description="Create an A/B test branch for this agent">
          <div className="space-y-4">
            <Input
              label="Branch Name"
              placeholder="e.g. Variant B — Shorter Prompt"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!newName.trim()}>
                Create Branch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
