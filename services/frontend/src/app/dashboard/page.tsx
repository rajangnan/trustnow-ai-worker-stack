'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Phone, Clock, TrendingUp, Zap, Users, Activity, Globe, CheckCircle2 } from 'lucide-react';
import { analyticsApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

const TABS = ['Overview', 'Call Activity', 'Latency', 'Success Rate', 'Cost', 'Conversations', 'Geolocation', 'Agent Perf'];

const KPI_CARDS = [
  { icon: Phone, label: 'Total Calls', key: 'total_calls', color: '#00D4FF', format: (v: number) => v.toLocaleString() },
  { icon: Clock, label: 'Avg Duration', key: 'avg_duration_s', color: '#7C3AED', format: (v: number) => `${Math.floor(v / 60)}m ${v % 60}s` },
  { icon: TrendingUp, label: 'Success Rate', key: 'success_rate', color: '#22C55E', format: (v: number) => `${(v * 100).toFixed(1)}%` },
  { icon: Zap, label: 'Avg Latency', key: 'avg_latency_ms', color: '#F59E0B', format: (v: number) => `${v}ms` },
  { icon: Users, label: 'Active Agents', key: 'total_agents', color: '#E03E3E', format: (v: number) => v.toString() },
  { icon: Activity, label: 'Live Calls', key: 'live_calls', color: '#22C55E', format: (v: number) => v.toString() },
];

// Placeholder data for charts
const mockCallData = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
  calls: Math.floor(Math.random() * 120) + 20,
  duration: Math.floor(Math.random() * 300) + 60,
}));

const mockLatencyData = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
  llm: Math.floor(Math.random() * 400) + 300,
  tts: Math.floor(Math.random() * 100) + 100,
  asr: Math.floor(Math.random() * 80) + 120,
}));

const FILTERS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [timeFilter, setTimeFilter] = useState('7d');

  const { data: summary } = useQuery({
    queryKey: ['analytics-summary', timeFilter],
    queryFn: () => analyticsApi.summary({ range: timeFilter }).then(r => r.data),
    placeholderData: {
      total_calls: 1284,
      avg_duration_s: 187,
      success_rate: 0.847,
      avg_latency_ms: 412,
      total_agents: 7,
      live_calls: 2,
      cost_credits: 5420,
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Home</h1>
          <p className="text-sm text-white/45 mt-0.5">Platform overview and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setTimeFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                timeFilter === f.value
                  ? 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/25'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          {KPI_CARDS.map(({ icon: Icon, label, key, color, format }) => (
            <div key={key} className="tn-card p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">{label}</span>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <span className="text-xl font-bold text-white">
                {summary ? format((summary as any)[key] ?? 0) : '—'}
              </span>
              {key === 'live_calls' && (summary as any)?.live_calls > 0 && (
                <Badge variant="live">Live</Badge>
              )}
            </div>
          ))}
        </div>

        {/* Analytics Tabs */}
        <div className="tn-card overflow-hidden">
          <div className="flex border-b border-white/6 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'text-[#00D4FF] border-b-2 border-[#00D4FF]'
                    : 'text-white/45 hover:text-white/70 border-b-2 border-transparent'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 'Overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs text-white/45 mb-3 font-medium">Call Volume</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={mockCallData}>
                      <defs>
                        <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#160830', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }}
                        labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                      />
                      <Area type="monotone" dataKey="calls" stroke="#00D4FF" strokeWidth={2} fill="url(#callGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-xs text-white/45 mb-3 font-medium">Avg Call Duration (s)</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={mockCallData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#160830', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }}
                        labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                      />
                      <Bar dataKey="duration" fill="#7C3AED" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 'Latency' && (
              <div>
                <p className="text-xs text-white/45 mb-3 font-medium">Pipeline Latency by Stage (ms)</p>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={mockLatencyData}>
                    <defs>
                      <linearGradient id="llmGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ttsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="asrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#160830', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }} />
                    <Area type="monotone" dataKey="llm" stroke="#7C3AED" strokeWidth={2} fill="url(#llmGrad)" name="LLM" />
                    <Area type="monotone" dataKey="tts" stroke="#00D4FF" strokeWidth={2} fill="url(#ttsGrad)" name="TTS" />
                    <Area type="monotone" dataKey="asr" stroke="#22C55E" strokeWidth={2} fill="url(#asrGrad)" name="ASR" />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-3">
                  {[{ color: '#7C3AED', label: 'LLM' }, { color: '#00D4FF', label: 'TTS' }, { color: '#22C55E', label: 'ASR' }].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                      <span className="text-xs text-white/50">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!['Overview', 'Latency'].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center h-40 text-white/30">
                <Activity className="h-8 w-8 mb-2" />
                <p className="text-sm">{activeTab} analytics coming soon</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Calls Panel */}
        {(summary as any)?.live_calls > 0 && (
          <div className="mt-4 tn-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-sm font-medium text-white">Live Calls</span>
              <Badge variant="live">{(summary as any).live_calls}</Badge>
            </div>
            <p className="text-xs text-white/40">Connect to WebSocket for live call monitoring</p>
          </div>
        )}
      </div>
    </div>
  );
}
