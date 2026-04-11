'use client';
import { useState, use } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Save, Eye, Circle } from 'lucide-react';
import { agentsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { AgentTab } from '@/components/tabs/AgentTab';
import { WorkflowTab } from '@/components/tabs/WorkflowTab';
import { BranchesTab } from '@/components/tabs/BranchesTab';
import { KnowledgeBaseTab } from '@/components/tabs/KnowledgeBaseTab';
import { AnalysisTab } from '@/components/tabs/AnalysisTab';
import { ToolsTab } from '@/components/tabs/ToolsTab';
import { TestsTab } from '@/components/tabs/TestsTab';
import { WidgetTab } from '@/components/tabs/WidgetTab';
import { SecurityTab } from '@/components/tabs/SecurityTab';
import { AdvancedTab } from '@/components/tabs/AdvancedTab';
import type { AgentConfig } from '@/types';

const TABS = [
  { id: 'agent', label: 'Agent' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'branches', label: 'Branches' },
  { id: 'knowledge-base', label: 'Knowledge Base' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'tools', label: 'Tools' },
  { id: 'tests', label: 'Tests' },
  { id: 'widget', label: 'Widget' },
  { id: 'security', label: 'Security' },
  { id: 'advanced', label: 'Advanced' },
];

interface Props {
  params: Promise<{ id: string }>;
}

export default function AgentConfigPage({ params }: Props) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('agent');
  const [draft, setDraft] = useState<Partial<AgentConfig>>({});
  const [isDirty, setIsDirty] = useState(false);

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => agentsApi.get(id).then(r => r.data),
  });

  const { data: config = {}, isLoading: configLoading } = useQuery<AgentConfig>({
    queryKey: ['agent-config', id],
    queryFn: () => agentsApi.getConfig(id).then(r => r.data ?? {}),
    placeholderData: {} as AgentConfig,
  });

  const saveMutation = useMutation({
    mutationFn: () => agentsApi.updateConfig(id, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-config', id] });
      qc.invalidateQueries({ queryKey: ['agent', id] });
      setDraft({});
      setIsDirty(false);
    },
  });

  const toggleLive = useMutation({
    mutationFn: (live: boolean) => agentsApi.update(id, { status: live ? 'active' : 'draft' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent', id] }),
  });

  const effectiveConfig: AgentConfig = { ...config, ...draft, agent_id: id };

  const handleChange = (patch: Partial<AgentConfig>) => {
    setDraft(prev => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  if (agentLoading || configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-6 w-6 border-2 border-[#00D4FF]/40 border-t-[#00D4FF] rounded-full" />
      </div>
    );
  }

  const agentData = agent as any;
  const isLive = agentData?.status === 'active';

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/agents" className="text-white/40 hover:text-white/80 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg font-semibold text-white/90 truncate">{agentData?.name ?? 'Agent'}</h1>
            {/* Live % badge */}
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#22C55E]/12 text-[#22C55E] border border-[#22C55E]/20">
              <Circle className="h-1.5 w-1.5 fill-current" />
              {isLive ? '100%' : '0%'}
            </span>
          </div>
          <span className="text-white/25 text-sm hidden sm:block">/ Agent Configuration</span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Variables button */}
          <Button variant="ghost" size="sm">Variables</Button>

          {/* Public / Draft toggle */}
          <div className="flex items-center gap-2">
            <Badge variant={isLive ? 'live' : 'draft'}>{isLive ? 'Live' : 'Draft'}</Badge>
            <Toggle
              checked={isLive}
              onChange={v => toggleLive.mutate(v)}
            />
          </div>

          {/* Save */}
          <Button
            variant="primary"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!isDirty}
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/6 overflow-x-auto bg-[#0A0418]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-[#00D4FF] border-[#00D4FF]'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'agent' && <AgentTab config={effectiveConfig} onChange={handleChange} />}
        {activeTab === 'workflow' && <WorkflowTab agentId={id} config={effectiveConfig} onChange={handleChange} />}
        {activeTab === 'branches' && <BranchesTab agentId={id} />}
        {activeTab === 'knowledge-base' && <KnowledgeBaseTab agentId={id} config={effectiveConfig} onChange={handleChange} />}
        {activeTab === 'analysis' && <AnalysisTab agentId={id} />}
        {activeTab === 'tools' && <ToolsTab agentId={id} />}
        {activeTab === 'tests' && <TestsTab agentId={id} />}
        {activeTab === 'widget' && <WidgetTab agentId={id} config={effectiveConfig} onChange={handleChange} />}
        {activeTab === 'security' && <SecurityTab agentId={id} config={effectiveConfig} onChange={handleChange} />}
        {activeTab === 'advanced' && <AdvancedTab config={effectiveConfig} onChange={handleChange} />}
      </div>
    </div>
  );
}
