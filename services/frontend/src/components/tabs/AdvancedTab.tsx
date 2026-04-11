'use client';
import { Toggle } from '@/components/ui/toggle';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { AgentConfig } from '@/types';

interface Props {
  config: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
}

const ASR_MODELS = [
  { value: 'nova-2', label: 'Nova 2 (Deepgram)' },
  { value: 'nova-3', label: 'Nova 3 (Deepgram) — New' },
  { value: 'whisper-large-v3', label: 'Whisper Large v3 (OpenAI)' },
  { value: 'whisper-large-v3-turbo', label: 'Whisper Large v3 Turbo' },
  { value: 'sarvam-1', label: 'Sarvam-1 (Hindi/Indic)' },
];

const AUDIO_FORMATS = [
  { value: 'pcm_16000', label: 'PCM 16kHz (WebRTC default)' },
  { value: 'ulaw_8000', label: 'μ-law 8kHz (SIP/PSTN)' },
  { value: 'opus', label: 'Opus (WebRTC compressed)' },
];

export function AdvancedTab({ config, onChange }: Props) {
  return (
    <div className="max-w-2xl space-y-6">
      {/* ASR */}
      <section>
        <h3 className="text-sm font-semibold text-white/90 mb-3">ASR (Speech Recognition)</h3>
        <div className="tn-card p-4 space-y-4">
          <Toggle
            checked={!!config.filter_background_speech}
            onChange={v => onChange({ filter_background_speech: v })}
            label="Filter background speech"
            description="Ignore ambient noise and background conversations"
            badge="Alpha"
          />
          <div className="border-t border-white/6 pt-4">
            <Select
              label="ASR Model"
              value={config.asr_model ?? 'nova-2'}
              onChange={v => onChange({ asr_model: v })}
              options={ASR_MODELS}
            />
          </div>
          <Select
            label="Input audio format"
            value={config.user_input_audio_format ?? 'pcm_16000'}
            onChange={v => onChange({ user_input_audio_format: v })}
            options={AUDIO_FORMATS}
          />
        </div>
      </section>

      {/* Conversational */}
      <section>
        <h3 className="text-sm font-semibold text-white/90 mb-3">Conversational</h3>
        <div className="tn-card p-4 space-y-4">
          <div>
            <p className="text-xs text-white/55 mb-2">Eagerness</p>
            <p className="text-xs text-white/35 mb-2">How eagerly the agent takes its turn to speak</p>
            <div className="flex rounded-md overflow-hidden border border-white/10">
              {(['normal', 'high', 'low'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => onChange({ eagerness: v })}
                  className={`flex-1 py-1.5 text-xs capitalize transition-colors ${
                    config.eagerness === v
                      ? 'bg-[#00D4FF]/15 text-[#00D4FF]'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <Toggle
            checked={!!config.speculative_turn}
            onChange={v => onChange({ speculative_turn: v })}
            label="Speculative turn"
            description="Pre-generate likely responses to reduce perceived latency"
          />

          <div className="border-t border-white/6 pt-4 grid grid-cols-2 gap-4">
            <Input
              label="Take turn after silence (s)"
              type="number"
              value={config.turn_timeout_s ?? 7}
              onChange={e => onChange({ turn_timeout_s: parseFloat(e.target.value) })}
              hint="Seconds of silence before agent speaks"
            />
            <Input
              label="End after silence (s)"
              type="number"
              value={config.end_call_silence_s ?? -1}
              onChange={e => onChange({ end_call_silence_s: parseFloat(e.target.value) })}
              hint="-1 = never auto-end"
            />
            <Input
              label="Max call duration (s)"
              type="number"
              value={config.max_duration_s ?? 600}
              onChange={e => onChange({ max_duration_s: parseInt(e.target.value) })}
              hint="0 = no limit"
            />
            <Input
              label="Soft timeout (s)"
              type="number"
              value={config.soft_timeout_s ?? 0}
              onChange={e => onChange({ soft_timeout_s: parseInt(e.target.value) })}
              hint="Warn agent before hard cutoff"
            />
          </div>

          <Input
            label="Max duration message"
            value={config.max_duration_message ?? ''}
            onChange={e => onChange({ max_duration_message: e.target.value })}
            placeholder="Sorry, I need to end our call now. Have a great day!"
            hint="Spoken to caller when max duration is reached"
          />
        </div>
      </section>
    </div>
  );
}
