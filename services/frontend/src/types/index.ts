export interface Agent {
  agent_id: string;
  tenant_id: string;
  name: string;
  status: 'active' | 'draft' | 'archived';
  voice_id?: string;
  llm_model?: string;
  language?: string;
  first_message?: string;
  system_prompt?: string;
  created_at: string;
  updated_at: string;
  call_count?: number;
  last_used?: string;
}

export interface AgentConfig {
  agent_id: string;
  // Tab 1 — Agent
  system_prompt?: string;
  first_message?: string;
  llm_model?: string;
  llm_provider?: string;
  llm_temperature?: number;
  llm_max_tokens?: number;
  llm_thinking_budget?: boolean;
  llm_backup?: 'default' | 'custom' | 'disabled';
  llm_backup_model?: string;
  voice_id?: string;
  voice_stability?: number;
  voice_similarity?: number;
  voice_style?: number;
  voice_speed?: number;
  expressive_mode?: boolean;
  language?: string;
  hinglish_mode?: boolean;
  timezone?: string;
  default_personality?: boolean;
  interruptible?: boolean;
  translate_all_languages?: boolean;
  // Tab 2 — Workflow
  workflow_graph?: any;
  workflow_prevent_infinite_loops?: boolean;
  // Tab 4 — KB
  rag_enabled?: boolean;
  rag_embedding_model?: 'english' | 'multilingual';
  rag_char_limit?: number;
  rag_chunk_limit?: number;
  rag_vector_distance?: number;
  rag_query_rewrite?: boolean;
  // Tab 8 — Widget
  widget_enabled?: boolean;
  widget_feedback_collection?: boolean;
  widget_chat_mode?: boolean;
  widget_send_text_on_call?: boolean;
  widget_realtime_transcript?: boolean;
  widget_language_dropdown?: boolean;
  widget_mute?: boolean;
  widget_expanded_behavior?: string;
  widget_avatar_type?: 'orb' | 'link' | 'image';
  widget_avatar_url?: string;
  widget_color_primary?: string;
  widget_allow_markdown_links?: boolean;
  widget_allowed_domains?: string[];
  widget_include_www_variants?: boolean;
  widget_allow_http_links?: boolean;
  // Tab 9 — Security
  guardrail_focus?: boolean;
  guardrail_manipulation?: boolean;
  override_first_message?: boolean;
  override_system_prompt?: boolean;
  override_llm?: boolean;
  override_voice?: boolean;
  override_voice_speed?: boolean;
  override_voice_stability?: boolean;
  override_voice_similarity?: boolean;
  override_text_only?: boolean;
  allowlist?: string[];
  // Tab 10 — Advanced
  asr_model?: string;
  user_input_audio_format?: string;
  filter_background_speech?: boolean;
  eagerness?: 'normal' | 'high' | 'low';
  speculative_turn?: boolean;
  turn_timeout_s?: number;
  end_call_silence_s?: number;
  max_duration_s?: number;
  max_duration_message?: string;
  soft_timeout_s?: number;
}

export interface Voice {
  voice_id: string;
  name: string;
  provider: string;
  language?: string;
  gender?: string;
  preview_url?: string;
  tags?: string[];
  is_custom?: boolean;
  stability?: number;
  similarity?: number;
  style?: number;
}

export interface KnowledgeBaseDoc {
  kb_id: string;
  tenant_id: string;
  name: string;
  type: 'file' | 'url' | 'text';
  size_bytes?: number;
  chunk_count?: number;
  status: 'processing' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
  dependent_agents?: number;
}

export interface Tool {
  tool_id: string;
  tenant_id?: string;
  name: string;
  type: 'webhook' | 'system' | 'mcp';
  description?: string;
  is_system?: boolean;
  schema?: any;
  used_by_agents?: number;
  last_used?: string;
}

export interface Branch {
  branch_id: string;
  agent_id: string;
  name: string;
  status: 'live' | 'draft';
  traffic_split: number;
  is_live: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  conversation_id: string;
  agent_id: string;
  tenant_id: string;
  status: string;
  duration_s?: number;
  turn_count?: number;
  cost_credits?: number;
  llm_cost_usd?: number;
  tts_latency_ms?: number;
  asr_latency_ms?: number;
  llm_latency_ms?: number;
  evaluation_score?: number;
  environment?: string;
  started_at: string;
  ended_at?: string;
}

export interface LlmModel {
  model_id: string;
  provider: string;
  display_name: string;
  badge?: string;
  latency_p50_ms?: number;
  cost_per_min_usd?: number;
}

export interface AnalyticsSummary {
  total_calls: number;
  total_minutes: number;
  total_agents: number;
  live_calls: number;
  avg_duration_s: number;
  success_rate: number;
  cost_credits: number;
}
