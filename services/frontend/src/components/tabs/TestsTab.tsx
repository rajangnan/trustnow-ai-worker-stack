'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Folder, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { testsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props { agentId: string; }

const DEFAULT_TEMPLATES = [
  { name: 'Basic greeting check', type: 'Next Reply', description: 'Verify agent greets caller correctly' },
  { name: 'End call tool invocation', type: 'Tool Invocation', description: 'Verify agent ends call on request' },
  { name: 'Transfer trigger', type: 'Tool Invocation', description: 'Verify agent transfers to human when needed' },
  { name: 'Out of scope handling', type: 'Next Reply', description: 'Verify agent deflects out-of-scope questions' },
  { name: 'Language switch', type: 'Next Reply', description: 'Verify multilingual handling' },
];

export function TestsTab({ agentId }: Props) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['tests', agentId],
    queryFn: () => testsApi.list(agentId).then(r => r.data?.tests ?? []),
    placeholderData: [],
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => testsApi.run(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tests', agentId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => testsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tests', agentId] }),
  });

  const allTests: any[] = tests as any[];
  const displayTests = allTests.length > 0 ? allTests : DEFAULT_TEMPLATES.map((t, i) => ({
    test_id: `default-${i}`,
    name: t.name,
    type: t.type,
    description: t.description,
    status: 'pending',
    is_template: true,
  }));

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/55">Automated tests ensure your agent behaves as expected across scenarios.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Folder className="h-3.5 w-3.5" /> Create Folder
          </Button>
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" /> Create Test
          </Button>
        </div>
      </div>

      {isLoading && <div className="h-20 flex items-center justify-center text-white/30 text-sm">Loading tests...</div>}

      <div className="tn-card overflow-hidden">
        {DEFAULT_TEMPLATES.length > 0 && allTests.length === 0 && (
          <div className="px-4 py-2 border-b border-white/6 bg-[#00D4FF]/4">
            <p className="text-xs text-[#00D4FF]">5 default test templates — click Run to execute</p>
          </div>
        )}
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/6">
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {displayTests.map(test => (
              <tr key={test.test_id} className="border-b border-white/4 hover:bg-white/3 group transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm text-white/80">{test.name}</p>
                  {test.description && <p className="text-xs text-white/35 mt-0.5">{test.description}</p>}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={test.type === 'Tool Invocation' ? 'cyan' : 'purple'}>
                    {test.type}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {test.status === 'passed' && (
                    <span className="flex items-center gap-1 text-xs text-[#22C55E]"><CheckCircle2 className="h-3.5 w-3.5" />Passed</span>
                  )}
                  {test.status === 'failed' && (
                    <span className="flex items-center gap-1 text-xs text-[#E03E3E]"><XCircle className="h-3.5 w-3.5" />Failed</span>
                  )}
                  {test.status === 'running' && (
                    <span className="flex items-center gap-1 text-xs text-[#F59E0B]"><Clock className="h-3.5 w-3.5 animate-spin" />Running</span>
                  )}
                  {test.status === 'pending' && (
                    <span className="text-xs text-white/30">Not run</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => !test.is_template && runMutation.mutate(test.test_id)}
                      loading={runMutation.isPending && runMutation.variables === test.test_id}
                    >
                      <Play className="h-3 w-3" /> Run
                    </Button>
                    {!test.is_template && (
                      <button
                        onClick={() => deleteMutation.mutate(test.test_id)}
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
    </div>
  );
}
