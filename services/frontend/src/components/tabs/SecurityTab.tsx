'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Shield, AlertTriangle, Webhook } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { webhooksApi } from '@/lib/api';
import type { AgentConfig } from '@/types';

interface Props {
  agentId: string;
  config: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
}

const OVERRIDE_FIELDS: { key: keyof AgentConfig; label: string }[] = [
  { key: 'override_first_message', label: 'First message' },
  { key: 'override_system_prompt', label: 'System prompt' },
  { key: 'override_llm', label: 'LLM' },
  { key: 'override_voice', label: 'Voice' },
  { key: 'override_voice_speed', label: 'Voice speed' },
  { key: 'override_voice_stability', label: 'Voice stability' },
  { key: 'override_voice_similarity', label: 'Voice similarity' },
  { key: 'override_text_only', label: 'Text only mode' },
];

export function SecurityTab({ agentId, config, onChange }: Props) {
  const qc = useQueryClient();
  const [newAllowlistEntry, setNewAllowlistEntry] = useState('');

  const { data: webhooks = [] } = useQuery({
    queryKey: ['webhooks', agentId],
    queryFn: () => webhooksApi.list(agentId).then(r => r.data?.webhooks ?? []),
    placeholderData: [],
  });

  const createWebhookMutation = useMutation({
    mutationFn: (data: any) => webhooksApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks', agentId] }),
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => webhooksApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks', agentId] }),
  });

  const addAllowlistEntry = () => {
    if (!newAllowlistEntry.trim()) return;
    onChange({ allowlist: [...(config.allowlist ?? []), newAllowlistEntry.trim()] });
    setNewAllowlistEntry('');
  };

  const whs = webhooks as any[];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Guardrails */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-white/90">Guardrails</h3>
          <Badge variant="yellow">Alpha</Badge>
        </div>
        <div className="tn-card p-4 space-y-3">
          <Toggle
            checked={!!config.guardrail_focus}
            onChange={v => onChange({ guardrail_focus: v })}
            label="Focus"
            description="Prevent agent from straying off-topic"
          />
          <div className="border-t border-white/6 pt-3">
            <Toggle
              checked={!!config.guardrail_manipulation}
              onChange={v => onChange({ guardrail_manipulation: v })}
              label="Manipulation"
              description="Detect and block adversarial prompt injection attempts"
            />
          </div>
        </div>
      </section>

      {/* Overrides */}
      <section>
        <h3 className="text-sm font-semibold text-white/90 mb-1">Overrides</h3>
        <p className="text-xs text-white/45 mb-3">Allow callers or your backend to override these settings at runtime via the client data payload.</p>
        <div className="tn-card p-4 grid grid-cols-2 gap-3">
          {OVERRIDE_FIELDS.map(({ key, label }) => (
            <Toggle
              key={key}
              checked={!!config[key]}
              onChange={v => onChange({ [key]: v } as any)}
              label={label}
            />
          ))}
        </div>
      </section>

      {/* Webhooks */}
      <section>
        <h3 className="text-sm font-semibold text-white/90 mb-1">Webhooks</h3>
        <p className="text-xs text-white/45 mb-3">Receive real-time events when conversations start, end, or key events occur.</p>

        <div className="mb-3">
          <p className="text-xs font-medium text-white/55 mb-2">Conversation Initiation Client Data Webhook</p>
          <div className="flex gap-2">
            <input
              placeholder="https://your-server.com/webhook/init"
              className="flex-1 h-8 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/70 placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/50"
            />
            <Button variant="outline" size="sm">Save</Button>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs font-medium text-white/55 mb-2">Post-call Webhook</p>
          {whs.length === 0 ? (
            <Button variant="outline" size="sm" onClick={() => createWebhookMutation.mutate({ agent_id: agentId, event: 'post_call' })}>
              <Plus className="h-3.5 w-3.5" />
              <Webhook className="h-3.5 w-3.5" />
              Create Webhook
            </Button>
          ) : (
            <div className="space-y-2">
              {whs.map((wh: any) => (
                <div key={wh.id} className="flex items-center gap-3 p-3 tn-card">
                  <Webhook className="h-4 w-4 text-[#00D4FF]" />
                  <span className="flex-1 text-xs text-white/70 font-mono truncate">{wh.url}</span>
                  <button onClick={() => deleteWebhookMutation.mutate(wh.id)} className="p-1 text-white/30 hover:text-[#E03E3E]">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Allowlist */}
      <section>
        <h3 className="text-sm font-semibold text-white/90 mb-1">Allowlist</h3>
        <p className="text-xs text-white/45 mb-3">Restrict widget embedding to specific domains.</p>

        {(!config.allowlist || config.allowlist.length === 0) && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#E03E3E]/8 border border-[#E03E3E]/20 mb-3">
            <AlertTriangle className="h-4 w-4 text-[#E03E3E] flex-shrink-0" />
            <p className="text-xs text-[#E03E3E]">No entries — widget is publicly accessible from any domain</p>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-2">
          {(config.allowlist ?? []).map(entry => (
            <Badge key={entry} variant="draft" className="cursor-pointer" onClick={() => onChange({ allowlist: (config.allowlist ?? []).filter(e => e !== entry) })}>
              {entry} ×
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newAllowlistEntry}
            onChange={e => setNewAllowlistEntry(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAllowlistEntry()}
            placeholder="example.com or 192.168.1.1"
            className="flex-1 h-8 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/70 placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/50"
          />
          <Button variant="outline" size="sm" onClick={addAllowlistEntry}>Add</Button>
        </div>
      </section>
    </div>
  );
}
