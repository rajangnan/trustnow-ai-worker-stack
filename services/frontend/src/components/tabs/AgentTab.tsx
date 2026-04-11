'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { Select } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { voicesApi, llmApi } from '@/lib/api';
import { Globe2, Mic2, ChevronDown, ChevronRight, Sparkles, X } from 'lucide-react';
import type { AgentConfig, LlmModel, Voice } from '@/types';

interface Props {
  config: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
}

const LLM_MODELS_STATIC: LlmModel[] = [
  { model_id: 'gpt-4o', provider: 'OpenAI', display_name: 'GPT-4o', latency_p50_ms: 650, cost_per_min_usd: 0.018 },
  { model_id: 'gpt-4o-mini', provider: 'OpenAI', display_name: 'GPT-4o Mini', latency_p50_ms: 390, cost_per_min_usd: 0.004 },
  { model_id: 'claude-sonnet-4-6', provider: 'Anthropic', display_name: 'Claude Sonnet 4.6', badge: 'New', latency_p50_ms: 520, cost_per_min_usd: 0.014 },
  { model_id: 'claude-opus-4-6', provider: 'Anthropic', display_name: 'Claude Opus 4.6', badge: 'New', latency_p50_ms: 920, cost_per_min_usd: 0.042 },
  { model_id: 'claude-haiku-4-5-20251001', provider: 'Anthropic', display_name: 'Claude Haiku 4.5', latency_p50_ms: 310, cost_per_min_usd: 0.003 },
  { model_id: 'gemini-2.0-flash', provider: 'Google', display_name: 'Gemini 2.0 Flash', latency_p50_ms: 410, cost_per_min_usd: 0.006 },
  { model_id: 'gemini-1.5-pro', provider: 'Google', display_name: 'Gemini 1.5 Pro', latency_p50_ms: 580, cost_per_min_usd: 0.016 },
  { model_id: 'grok-3', provider: 'xAI', display_name: 'Grok 3', badge: 'New', latency_p50_ms: 490, cost_per_min_usd: 0.012 },
  { model_id: 'llama-3.3-70b', provider: 'Meta', display_name: 'Llama 3.3 70B', latency_p50_ms: 450, cost_per_min_usd: 0.008 },
  { model_id: 'mistral-large', provider: 'Mistral', display_name: 'Mistral Large', latency_p50_ms: 480, cost_per_min_usd: 0.010 },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'hi-en', label: 'Hinglish (Hindi+English)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'zh', label: 'Chinese (Mandarin)' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
];

export function AgentTab({ config, onChange }: Props) {
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [showLlmPicker, setShowLlmPicker] = useState(false);
  const [llmSearch, setLlmSearch] = useState('');
  const [showExpressiveDismiss, setShowExpressiveDismiss] = useState(!config.expressive_mode);

  const { data: voices = [] } = useQuery<Voice[]>({
    queryKey: ['voices'],
    queryFn: () => voicesApi.list().then(r => r.data?.voices ?? []),
    placeholderData: [],
  });

  const selectedVoice = voices.find(v => v.voice_id === config.voice_id);

  const groupedModels = LLM_MODELS_STATIC.reduce((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {} as Record<string, LlmModel[]>);

  const filteredGroups = Object.entries(groupedModels).reduce((acc, [p, ms]) => {
    const filtered = ms.filter(m => !llmSearch || m.display_name.toLowerCase().includes(llmSearch.toLowerCase()));
    if (filtered.length) acc[p] = filtered;
    return acc;
  }, {} as Record<string, LlmModel[]>);

  const selectedModel = LLM_MODELS_STATIC.find(m => m.model_id === config.llm_model);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* System Prompt */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white/90">System Prompt</h3>
          <Toggle
            checked={!!config.default_personality}
            onChange={v => onChange({ default_personality: v })}
            label="Default personality"
          />
        </div>
        <Textarea
          value={config.system_prompt ?? ''}
          onChange={e => onChange({ system_prompt: e.target.value })}
          placeholder="You are a helpful AI assistant for TRUSTNOW..."
          className="min-h-[140px]"
        />
        <div className="flex justify-end mt-2">
          <Button variant="ghost" size="sm">
            <Globe2 className="h-3.5 w-3.5" />
            Set timezone
          </Button>
        </div>
      </section>

      {/* First Message */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white/90">First Message</h3>
          <div className="flex items-center gap-3">
            <Toggle
              checked={!!config.interruptible}
              onChange={v => onChange({ interruptible: v })}
              label="Interruptible"
            />
          </div>
        </div>
        <Textarea
          value={config.first_message ?? ''}
          onChange={e => onChange({ first_message: e.target.value })}
          placeholder="Hello! How can I help you today?"
          className="min-h-[80px]"
        />
        <div className="flex justify-end mt-2">
          <Button variant="ghost" size="sm">
            <Globe2 className="h-3.5 w-3.5" />
            Translate to all
          </Button>
        </div>
      </section>

      {/* Voice */}
      <section>
        <h3 className="text-sm font-semibold text-white/90 mb-3">Voice</h3>

        {/* Expressive Mode feature card */}
        {showExpressiveDismiss && !config.expressive_mode && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#7C3AED]/8 border border-[#7C3AED]/20 mb-3">
            <Sparkles className="h-4 w-4 text-[#7C3AED] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80">Expressive Mode</p>
              <p className="text-xs text-white/45">Richer, more natural voice with emotion</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => onChange({ expressive_mode: true })}>Enable</Button>
            <button onClick={() => setShowExpressiveDismiss(false)} className="p-1 text-white/30 hover:text-white/60">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <button
          onClick={() => setShowVoicePicker(true)}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/4 hover:bg-white/7 hover:border-white/20 transition-all"
        >
          <div className="h-8 w-8 rounded-full bg-[#00D4FF]/15 flex items-center justify-center">
            <Mic2 className="h-4 w-4 text-[#00D4FF]" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm text-white/80">{selectedVoice?.name ?? 'Select a voice'}</p>
            <p className="text-xs text-white/40">{selectedVoice?.provider ?? 'No voice selected'}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/30" />
        </button>

        {config.voice_id && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Slider label="Stability" value={config.voice_stability ?? 0.5} onChange={v => onChange({ voice_stability: v })}
              leftLabel="Variable" rightLabel="Stable" />
            <Slider label="Similarity" value={config.voice_similarity ?? 0.8} onChange={v => onChange({ voice_similarity: v })}
              leftLabel="Low" rightLabel="High" />
            <Slider label="Style" value={config.voice_style ?? 0} onChange={v => onChange({ voice_style: v })}
              leftLabel="Natural" rightLabel="Expressive" />
            <Slider label="Speed" value={config.voice_speed ?? 1} onChange={v => onChange({ voice_speed: v })}
              min={0.5} max={2} leftLabel="Slower" rightLabel="Faster" />
          </div>
        )}
      </section>

      {/* Language */}
      <section>
        <h3 className="text-sm font-semibold text-white/90 mb-3">Language</h3>
        <Select
          value={config.language ?? 'en'}
          onChange={v => onChange({ language: v })}
          options={LANGUAGES}
        />
        <div className="mt-3">
          <Toggle
            checked={!!config.hinglish_mode}
            onChange={v => onChange({ hinglish_mode: v })}
            label="Hinglish Mode"
            description="Switch between Hindi and English mid-conversation"
          />
        </div>
      </section>

      {/* LLM */}
      <section>
        <h3 className="text-sm font-semibold text-white/90 mb-3">LLM</h3>

        <button
          onClick={() => setShowLlmPicker(!showLlmPicker)}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/4 hover:bg-white/7 hover:border-white/20 transition-all"
        >
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <p className="text-sm text-white/80">{selectedModel?.display_name ?? 'Select model'}</p>
              {selectedModel?.badge && <Badge variant="cyan">{selectedModel.badge}</Badge>}
            </div>
            {selectedModel && (
              <p className="text-xs text-white/35 mt-0.5">
                {selectedModel.provider} · {selectedModel.latency_p50_ms}ms p50 · ${selectedModel.cost_per_min_usd?.toFixed(3)}/min
              </p>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-white/30 transition-transform ${showLlmPicker ? 'rotate-180' : ''}`} />
        </button>

        {showLlmPicker && (
          <div className="mt-1 rounded-lg border border-white/10 bg-[#0E0620] overflow-hidden">
            <div className="p-2 border-b border-white/8">
              <input
                value={llmSearch}
                onChange={e => setLlmSearch(e.target.value)}
                placeholder="Search models..."
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white/80 placeholder:text-white/30 focus:outline-none"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {Object.entries(filteredGroups).map(([provider, models]) => (
                <div key={provider}>
                  <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">{provider}</p>
                  {models.map(m => (
                    <button
                      key={m.model_id}
                      onClick={() => { onChange({ llm_model: m.model_id }); setShowLlmPicker(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/6 transition-colors ${config.llm_model === m.model_id ? 'bg-[#00D4FF]/8' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/80">{m.display_name}</span>
                        {m.badge && <Badge variant={m.badge === 'New' ? 'cyan' : 'yellow'}>{m.badge}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/35">
                        <span>{m.latency_p50_ms}ms</span>
                        <span>${m.cost_per_min_usd?.toFixed(3)}/min</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-white/8">
              <button className="text-xs text-[#00D4FF] hover:underline">Detailed costs →</button>
            </div>
          </div>
        )}

        {config.llm_model && (
          <div className="mt-4 space-y-4">
            {/* Backup LLM */}
            <div>
              <p className="text-xs text-white/55 mb-2">Backup LLM</p>
              <div className="flex rounded-md overflow-hidden border border-white/10">
                {(['default', 'custom', 'disabled'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => onChange({ llm_backup: v })}
                    className={`flex-1 py-1.5 text-xs capitalize transition-colors ${
                      config.llm_backup === v
                        ? 'bg-[#00D4FF]/15 text-[#00D4FF]'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <Slider
              label="Temperature"
              value={config.llm_temperature ?? 0.7}
              onChange={v => onChange({ llm_temperature: v })}
              leftLabel="More deterministic"
              rightLabel="More expressive"
            />

            <Toggle
              checked={!!config.llm_thinking_budget}
              onChange={v => onChange({ llm_thinking_budget: v })}
              label="Thinking Budget"
              description="Control internal reasoning tokens"
            />

            <Input
              label="Limit token usage"
              type="number"
              value={config.llm_max_tokens ?? -1}
              onChange={e => onChange({ llm_max_tokens: parseInt(e.target.value) })}
              hint="-1 = no limit"
            />
          </div>
        )}
      </section>
    </div>
  );
}
