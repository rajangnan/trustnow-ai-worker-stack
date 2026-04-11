'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Wand2, ArrowRight, ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { agentsApi } from '@/lib/api';

interface Props {
  onClose: () => void;
}

const INDUSTRIES = ['Financial Services', 'Healthcare', 'E-commerce', 'Real Estate', 'Education', 'Legal', 'HR & Recruiting', 'Hospitality', 'Telecom', 'SaaS'];
const USE_CASES: Record<string, string[]> = {
  'Financial Services': ['Loan Pre-qualification', 'Collections', 'KYC Verification', 'Investment Advisor'],
  Healthcare: ['Appointment Scheduling', 'Symptom Triage', 'Patient Follow-up', 'Insurance Verification'],
  'E-commerce': ['Order Tracking', 'Returns Processing', 'Product Recommendation', 'Customer Support'],
  'Real Estate': ['Lead Qualification', 'Property Tours Scheduling', 'Rental Inquiries', 'Mortgage Pre-screen'],
  default: ['Customer Support', 'Lead Qualification', 'Appointment Scheduling', 'Outbound Dialer'],
};

export function NewAgentWizard({ onClose }: Props) {
  const router = useRouter();
  const [path, setPath] = useState<'A' | 'B' | null>(null);
  // Path A state
  const [agentName, setAgentName] = useState('');
  const [creating, setCreating] = useState(false);
  // Path B state
  const [bStep, setBStep] = useState(1);
  const [bIndustry, setBIndustry] = useState('');
  const [bUseCase, setBUseCase] = useState('');
  const [bName, setBName] = useState('');

  const handleCreateBlank = async () => {
    if (!agentName.trim()) return;
    setCreating(true);
    try {
      const { data } = await agentsApi.create({ name: agentName });
      router.push(`/agents/${data.agent_id}`);
    } catch {
      setCreating(false);
    }
  };

  const handleCreateGuided = async () => {
    setCreating(true);
    const name = bName || `${bUseCase} Agent`;
    try {
      const { data } = await agentsApi.create({ name, industry: bIndustry, use_case: bUseCase });
      router.push(`/agents/${data.agent_id}`);
    } catch {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#130726] border border-white/10 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">Create New Agent</h2>
          <button onClick={onClose} className="p-1 rounded-md text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {/* Path selection */}
          {!path && (
            <div className="space-y-3">
              <p className="text-sm text-white/55 mb-4">How would you like to start?</p>
              <button
                onClick={() => setPath('A')}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-white/10 bg-white/4 hover:bg-white/7 hover:border-white/20 transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-lg bg-[#00D4FF]/12 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-[#00D4FF]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Blank Agent</p>
                  <p className="text-xs text-white/45 mt-0.5">Start from scratch — full control over all settings</p>
                </div>
                <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/60 transition-colors" />
              </button>

              <button
                onClick={() => setPath('B')}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-white/10 bg-white/4 hover:bg-white/7 hover:border-white/20 transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-lg bg-[#7C3AED]/15 flex items-center justify-center flex-shrink-0">
                  <Wand2 className="h-5 w-5 text-[#7C3AED]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Guided Setup</p>
                  <p className="text-xs text-white/45 mt-0.5">Industry-specific templates with pre-configured prompts</p>
                </div>
                <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/60 transition-colors" />
              </button>
            </div>
          )}

          {/* Path A — Blank (2 steps) */}
          {path === 'A' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setPath(null)} className="p-1 text-white/40 hover:text-white/70">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-white/60">Blank Agent</span>
              </div>

              <Input
                label="Agent Name"
                placeholder="e.g. Sales Qualifier, Support Bot"
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateBlank()}
                autoFocus
              />

              <p className="text-xs text-white/35 bg-white/4 rounded-md px-3 py-2">
                You can configure system prompt, voice, LLM, and all settings after creation.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleCreateBlank} loading={creating} disabled={!agentName.trim()}>
                  Create Agent
                </Button>
              </div>
            </div>
          )}

          {/* Path B — Guided (5 steps) */}
          {path === 'B' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => bStep === 1 ? setPath(null) : setBStep(s => s - 1)} className="p-1 text-white/40 hover:text-white/70">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-white/60">Guided Setup</span>
                <span className="ml-auto text-xs text-white/30">Step {bStep} of 5</span>
              </div>

              {/* Progress dots */}
              <div className="flex gap-1.5 mb-2">
                {[1,2,3,4,5].map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= bStep ? 'bg-[#00D4FF]' : 'bg-white/10'}`} />
                ))}
              </div>

              {bStep === 1 && (
                <div>
                  <p className="text-sm font-medium text-white mb-3">Select your industry</p>
                  <div className="grid grid-cols-2 gap-2">
                    {INDUSTRIES.map(ind => (
                      <button
                        key={ind}
                        onClick={() => { setBIndustry(ind); setBStep(2); }}
                        className={`px-3 py-2 rounded-md text-xs text-left transition-all border ${
                          bIndustry === ind
                            ? 'border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]'
                            : 'border-white/10 bg-white/4 text-white/60 hover:bg-white/8 hover:text-white/80'
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {bStep === 2 && (
                <div>
                  <p className="text-sm font-medium text-white mb-3">Select your use case</p>
                  <div className="grid grid-cols-1 gap-2">
                    {(USE_CASES[bIndustry] || USE_CASES.default).map(uc => (
                      <button
                        key={uc}
                        onClick={() => { setBUseCase(uc); setBStep(3); }}
                        className={`px-3 py-2.5 rounded-md text-sm text-left transition-all border flex items-center justify-between group ${
                          bUseCase === uc
                            ? 'border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]'
                            : 'border-white/10 bg-white/4 text-white/70 hover:bg-white/8'
                        }`}
                      >
                        {uc}
                        <ArrowRight className="h-3.5 w-3.5 text-white/30 group-hover:text-white/50" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {bStep === 3 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-white mb-1">Name your agent</p>
                  <Input
                    label="Agent Name"
                    placeholder={`${bUseCase} Agent`}
                    value={bName}
                    onChange={e => setBName(e.target.value)}
                    autoFocus
                  />
                  <Button variant="primary" className="w-full" onClick={() => setBStep(4)} disabled={!bName && !bUseCase}>
                    Continue
                  </Button>
                </div>
              )}

              {bStep === 4 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-white mb-1">Knowledge Base (optional)</p>
                  <p className="text-xs text-white/45">Add documents to give your agent knowledge. You can add these later.</p>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => setBStep(5)}>Skip for now</Button>
                    <Button variant="primary" className="flex-1" onClick={() => setBStep(5)}>Add KB Docs</Button>
                  </div>
                </div>
              )}

              {bStep === 5 && (
                <div className="space-y-3">
                  <div className="tn-card p-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/45">Industry</span>
                      <span className="text-white/80">{bIndustry}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/45">Use Case</span>
                      <span className="text-white/80">{bUseCase}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/45">Name</span>
                      <span className="text-white/80">{bName || `${bUseCase} Agent`}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button variant="primary" onClick={handleCreateGuided} loading={creating} className="flex-1">
                      <Check className="h-3.5 w-3.5" />
                      Create Agent
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
