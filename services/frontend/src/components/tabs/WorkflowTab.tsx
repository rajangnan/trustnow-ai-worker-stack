'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  DndContext, DragEndEvent, useDraggable, useDroppable, MouseSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { workflowApi } from '@/lib/api';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Plus, Zap, GitBranch, Clock, PhoneForwarded, MessageSquare, Save, Trash2 } from 'lucide-react';
import type { AgentConfig } from '@/types';

interface WFNode {
  id: string;
  type: 'start' | 'llm' | 'branch' | 'transfer' | 'hangup' | 'delay' | 'message';
  label: string;
  x: number;
  y: number;
}

const NODE_TEMPLATES = [
  { type: 'llm', label: 'LLM Turn', icon: MessageSquare, color: '#7C3AED' },
  { type: 'branch', label: 'Branch', icon: GitBranch, color: '#F59E0B' },
  { type: 'transfer', label: 'Transfer', icon: PhoneForwarded, color: '#22C55E' },
  { type: 'hangup', label: 'End Call', icon: Zap, color: '#E03E3E' },
  { type: 'delay', label: 'Delay', icon: Clock, color: '#00D4FF' },
];

const WORKFLOW_TEMPLATES = [
  { name: 'Qualification', nodes: 4 },
  { name: 'Authentication', nodes: 5 },
  { name: 'Enterprise Escalation', nodes: 6 },
  { name: 'Business Hours Router', nodes: 4 },
];

function NodeIcon({ type }: { type: string }) {
  const map: Record<string, React.ReactNode> = {
    start: <div className="h-3 w-3 rounded-full bg-[#22C55E]" />,
    llm: <MessageSquare className="h-3 w-3" />,
    branch: <GitBranch className="h-3 w-3" />,
    transfer: <PhoneForwarded className="h-3 w-3" />,
    hangup: <Zap className="h-3 w-3" />,
    delay: <Clock className="h-3 w-3" />,
  };
  return <>{map[type] ?? <div className="h-3 w-3 rounded-full bg-white/30" />}</>;
}

function DraggableNode({ node, onDelete }: { node: WFNode; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: node.id });
  const style = {
    position: 'absolute' as const,
    left: node.x,
    top: node.y,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    zIndex: isDragging ? 50 : 1,
  };
  const colorMap: Record<string, string> = {
    start: '#22C55E', llm: '#7C3AED', branch: '#F59E0B',
    transfer: '#22C55E', hangup: '#E03E3E', delay: '#00D4FF',
  };
  const color = colorMap[node.type] ?? '#00D4FF';

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: `${color}18`, border: `1px solid ${color}40`, color }}
      {...listeners}
      {...attributes}
      className={`group cursor-grab active:cursor-grabbing select-none min-w-[120px] rounded-lg px-3 py-2 text-xs font-medium shadow-lg flex items-center gap-2 ${
        isDragging ? 'opacity-80' : ''
      }`}
    >
      <NodeIcon type={node.type} />
      {node.label}
      <button
        className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:text-[#E03E3E] transition-all"
        onPointerDown={e => { e.stopPropagation(); onDelete(node.id); }}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

interface Props {
  agentId: string;
  config: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
}

export function WorkflowTab({ agentId, config, onChange }: Props) {
  const [nodes, setNodes] = useState<WFNode[]>([
    { id: 'start', type: 'start', label: 'Start', x: 40, y: 40 },
  ]);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }));

  const { data: workflowData } = useQuery({
    queryKey: ['workflow', agentId],
    queryFn: () => workflowApi.get(agentId).then(r => r.data),
    onSuccess: (d: any) => { if (d?.nodes?.length) setNodes(d.nodes); },
  } as any);

  const saveMutation = useMutation({
    mutationFn: () => workflowApi.save(agentId, { nodes }),
  });

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    if (!e.delta) return;
    setNodes(prev => prev.map(n =>
      n.id === e.active.id ? { ...n, x: n.x + e.delta.x, y: n.y + e.delta.y } : n
    ));
  }, []);

  const addNode = (type: string, label: string) => {
    const id = `${type}-${Date.now()}`;
    setNodes(prev => [...prev, { id, type: type as any, label, x: 80 + Math.random() * 200, y: 80 + Math.random() * 160 }]);
  };

  const deleteNode = (id: string) => setNodes(prev => prev.filter(n => n.id !== id));

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* Left panel */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-3">
        <div className="tn-card p-3">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Add Node</p>
          {NODE_TEMPLATES.map(t => (
            <button
              key={t.type}
              onClick={() => addNode(t.type, t.label)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/6 transition-colors text-left mb-0.5"
              style={{ color: t.color }}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="text-xs">{t.label}</span>
              <Plus className="h-3 w-3 ml-auto text-white/30" />
            </button>
          ))}
        </div>

        <div className="tn-card p-3">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Templates</p>
          {WORKFLOW_TEMPLATES.map(t => (
            <button
              key={t.name}
              className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/6 transition-colors text-xs text-white/60 hover:text-white/80 mb-0.5"
            >
              {t.name}
              <span className="ml-1 text-white/30">({t.nodes})</span>
            </button>
          ))}
        </div>

        <div className="tn-card p-3">
          <Toggle
            checked={!!config.workflow_prevent_infinite_loops}
            onChange={v => onChange({ workflow_prevent_infinite_loops: v })}
            label="Prevent infinite loops"
          />
        </div>

        <Button
          variant="primary"
          onClick={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          className="w-full"
        >
          <Save className="h-3.5 w-3.5" />
          Save Workflow
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 tn-card overflow-hidden relative">
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="relative w-full h-full">
            {nodes.map(node => (
              <DraggableNode key={node.id} node={node} onDelete={deleteNode} />
            ))}
          </div>
        </DndContext>

        {nodes.length === 1 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-white/20">Add nodes or choose a template</p>
          </div>
        )}
      </div>
    </div>
  );
}
