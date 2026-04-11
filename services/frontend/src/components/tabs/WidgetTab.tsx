'use client';
import { useState } from 'react';
import { Toggle } from '@/components/ui/toggle';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Globe, MessageSquare, Star } from 'lucide-react';
import type { AgentConfig } from '@/types';

interface Props {
  agentId: string;
  config: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
}

export function WidgetTab({ agentId, config, onChange }: Props) {
  const [copied, setCopied] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  const embedCode = `<trustnow-agent agent-id="${agentId}"></trustnow-agent>
<script src="https://cdn.trustnow.ai/widget/v1/trustnow.js" defer></script>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addDomain = () => {
    if (!newDomain.trim()) return;
    const domains = config.widget_allowed_domains ?? [];
    onChange({ widget_allowed_domains: [...domains, newDomain.trim()] });
    setNewDomain('');
  };

  const removeDomain = (d: string) => {
    onChange({ widget_allowed_domains: (config.widget_allowed_domains ?? []).filter(x => x !== d) });
  };

  return (
    <div className="flex gap-6 max-w-5xl">
      {/* Left: Config */}
      <div className="flex-1 space-y-6">
        {/* Embed code */}
        <section>
          <h3 className="text-sm font-semibold text-white/90 mb-3">Embed Code</h3>
          <div className="relative rounded-lg border border-white/10 bg-black/30 overflow-hidden">
            <pre className="p-4 text-xs text-[#00D4FF] font-mono leading-relaxed overflow-x-auto">{embedCode}</pre>
            <button
              onClick={copyEmbed}
              className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/8 text-xs text-white/60 hover:text-white/90 hover:bg-white/12 transition-colors"
            >
              <Copy className="h-3 w-3" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </section>

        {/* Interface toggles */}
        <section>
          <h3 className="text-sm font-semibold text-white/90 mb-3">Interface</h3>
          <div className="space-y-3">
            <Toggle
              checked={!!config.widget_feedback_collection}
              onChange={v => onChange({ widget_feedback_collection: v })}
              label="Feedback collection"
              description="Show 1–5 star rating + text comment after call ends"
            />
            <Toggle
              checked={!!config.widget_chat_mode}
              onChange={v => onChange({ widget_chat_mode: v })}
              label="Chat mode"
              description="Allow text chat alongside voice"
            />
            <Toggle
              checked={!!config.widget_send_text_on_call}
              onChange={v => onChange({ widget_send_text_on_call: v })}
              label="Send text on call"
            />
            <Toggle
              checked={!!config.widget_realtime_transcript}
              onChange={v => onChange({ widget_realtime_transcript: v })}
              label="Realtime transcript"
              description="Show live transcript during the call"
            />
            <Toggle
              checked={!!config.widget_language_dropdown}
              onChange={v => onChange({ widget_language_dropdown: v })}
              label="Language dropdown"
            />
            <Toggle
              checked={!!config.widget_mute}
              onChange={v => onChange({ widget_mute: v })}
              label="Mute"
            />
            <Select
              label="Expanded behavior"
              value={config.widget_expanded_behavior ?? 'expand-on-click'}
              onChange={v => onChange({ widget_expanded_behavior: v })}
              options={[
                { value: 'expand-on-click', label: 'Expand on click' },
                { value: 'always-expanded', label: 'Always expanded' },
                { value: 'auto-expand', label: 'Auto-expand on load' },
              ]}
            />
          </div>
        </section>

        {/* Avatar */}
        <section>
          <h3 className="text-sm font-semibold text-white/90 mb-3">Avatar</h3>
          <div className="flex rounded-md overflow-hidden border border-white/10 mb-3">
            {(['orb', 'link', 'image'] as const).map(v => (
              <button
                key={v}
                onClick={() => onChange({ widget_avatar_type: v })}
                className={`flex-1 py-2 text-xs capitalize transition-colors ${
                  config.widget_avatar_type === v
                    ? 'bg-[#00D4FF]/15 text-[#00D4FF]'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {config.widget_avatar_type !== 'orb' && (
            <Input
              placeholder={config.widget_avatar_type === 'image' ? 'Image URL...' : 'Link URL...'}
              value={config.widget_avatar_url ?? ''}
              onChange={e => onChange({ widget_avatar_url: e.target.value })}
            />
          )}
        </section>

        {/* Markdown links */}
        <section>
          <h3 className="text-sm font-semibold text-white/90 mb-3">Markdown Links</h3>
          <div className="space-y-3">
            <Toggle
              checked={!!config.widget_allow_markdown_links}
              onChange={v => onChange({ widget_allow_markdown_links: v })}
              label="Allow markdown links"
            />
            <Toggle
              checked={!!config.widget_include_www_variants}
              onChange={v => onChange({ widget_include_www_variants: v })}
              label="Include www. variants"
            />
            <Toggle
              checked={!!config.widget_allow_http_links}
              onChange={v => onChange({ widget_allow_http_links: v })}
              label="Allow HTTP links"
            />

            {/* Allowed domains */}
            <div>
              <p className="text-xs text-white/55 mb-2">Allowed domains</p>
              {(!config.widget_allowed_domains || config.widget_allowed_domains.length === 0) && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-[#E03E3E]/8 border border-[#E03E3E]/20 mb-2">
                  <Globe className="h-3.5 w-3.5 text-[#E03E3E] flex-shrink-0" />
                  <p className="text-xs text-[#E03E3E]">No domains configured — widget will not load on any site</p>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(config.widget_allowed_domains ?? []).map(d => (
                  <Badge key={d} variant="draft" className="cursor-pointer" onClick={() => removeDomain(d)}>
                    {d} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDomain()}
                  placeholder="example.com"
                  className="flex-1 h-8 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/50"
                />
                <Button variant="outline" size="sm" onClick={addDomain}>Add</Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Right: Live preview */}
      <div className="w-72 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white/90 mb-3">Live Preview</h3>
        <div className="tn-card p-4 min-h-[400px] relative flex items-end justify-end">
          <div className="text-xs text-white/25 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <MessageSquare className="h-8 w-8 mb-2 mx-auto opacity-30" />
            <p>Widget preview</p>
          </div>
          {/* Floating widget button */}
          <button className="relative flex items-center justify-center h-12 w-12 rounded-full shadow-xl transition-transform hover:scale-105"
            style={{ background: config.widget_color_primary ?? '#00D4FF' }}>
            <MessageSquare className="h-5 w-5 text-[#0E0620]" />
            {/* Orb animation */}
            {config.widget_avatar_type !== 'image' && config.widget_avatar_type !== 'link' && (
              <div className="absolute inset-0 rounded-full animate-ping opacity-25"
                style={{ background: config.widget_color_primary ?? '#00D4FF' }} />
            )}
          </button>
        </div>

        {config.widget_feedback_collection && (
          <div className="tn-card p-3 mt-3">
            <p className="text-xs text-white/55 mb-2">Feedback (shown post-call)</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className="h-5 w-5 text-white/20" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
