-- =============================================================================
-- TRUSTNOW Platform — LLM / STT / TTS Provider + Model Seed Data
-- Task 4.2 — 7 LLM providers, 12 models, 5 STT, 5 TTS
-- =============================================================================

-- LLM Providers
INSERT INTO llm_providers (provider_id, name, type, base_url, auth_type) VALUES
  (uuid_generate_v4(), 'OpenAI',          'cloud',  'https://api.openai.com/v1',                            'api_key'),
  (uuid_generate_v4(), 'Anthropic',        'cloud',  'https://api.anthropic.com',                            'api_key'),
  (uuid_generate_v4(), 'Google',           'cloud',  'https://generativelanguage.googleapis.com',            'api_key'),
  (uuid_generate_v4(), 'Alibaba/Qwen',     'cloud',  'https://dashscope.aliyuncs.com/compatible-mode/v1',   'api_key'),
  (uuid_generate_v4(), 'Mistral AI',       'cloud',  'https://api.mistral.ai/v1',                           'api_key'),
  (uuid_generate_v4(), 'Meta/Groq',        'cloud',  'https://api.groq.com/openai/v1',                      'api_key'),
  (uuid_generate_v4(), 'Ollama (On-Prem)', 'onprem', 'http://localhost:11434',                               'none');

-- LLM Models
INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gpt-4o',     'GPT-4o',      180, 0.0030, 128000, 'active' FROM llm_providers WHERE name='OpenAI';

INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gpt-4o-mini','GPT-4o Mini', 140, 0.0010, 128000, 'active' FROM llm_providers WHERE name='OpenAI';

INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'claude-sonnet-4-5','Claude Sonnet', 220, 0.0040, 200000, 'active' FROM llm_providers WHERE name='Anthropic';

INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'claude-haiku-4-5', 'Claude Haiku',  160, 0.0020, 200000, 'active' FROM llm_providers WHERE name='Anthropic';

INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gemini-2.5-flash','Gemini 2.5 Flash', 150, 0.0020, 1000000, 'active' FROM llm_providers WHERE name='Google';

INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'gemini-2.5-pro',  'Gemini 2.5 Pro',   280, 0.0060, 1000000, 'active' FROM llm_providers WHERE name='Google';

INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'qwen2.5-72b-instruct','Qwen Max', 200, 0.0025, 128000, 'active' FROM llm_providers WHERE name='Alibaba/Qwen';

INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'mistral-large-latest','Mistral Large', 190, 0.0028, 128000, 'active' FROM llm_providers WHERE name='Mistral AI';

INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'llama-3.1-70b-versatile','Llama 3.1 70B', 210, 0.0015, 128000, 'active' FROM llm_providers WHERE name='Meta/Groq';

INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'llama3.1:8b','Llama 3.1 8B (On-Prem)', 380, 0.0000, 128000, 'active' FROM llm_providers WHERE name='Ollama (On-Prem)';

INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'mistral:7b', 'Mistral 7B (On-Prem)',   350, 0.0000, 32000,  'active' FROM llm_providers WHERE name='Ollama (On-Prem)';

INSERT INTO llm_models (model_id, provider_id, model_name, display_name, latency_p50_ms, cost_per_min, context_window_tokens, status)
SELECT uuid_generate_v4(), provider_id, 'qwen2:7b',   'Qwen2 7B (On-Prem)',     360, 0.0000, 32000,  'active' FROM llm_providers WHERE name='Ollama (On-Prem)';

-- STT Providers
INSERT INTO stt_providers (provider_id, name, type, base_url, supported_languages) VALUES
  (uuid_generate_v4(), 'Deepgram',          'cloud',  'https://api.deepgram.com',                           ARRAY['en','es','fr','de','hi','ja','pt','zh']),
  (uuid_generate_v4(), 'Google STT',        'cloud',  'https://speech.googleapis.com',                      ARRAY['en','es','fr','de','hi','ja','pt','zh']),
  (uuid_generate_v4(), 'Azure Speech',      'cloud',  'https://eastus.api.cognitive.microsoft.com',         ARRAY['en','es','fr','de','hi']),
  (uuid_generate_v4(), 'Amazon Transcribe', 'cloud',  'https://transcribe.amazonaws.com',                   ARRAY['en','es','fr','de','hi']),
  (uuid_generate_v4(), 'FasterWhisper',     'onprem', 'local',                                              ARRAY['en','es','fr','de','hi','ja','pt','zh','ar','ru']);

-- TTS Providers
INSERT INTO tts_providers (provider_id, name, type, base_url, supported_languages) VALUES
  (uuid_generate_v4(), 'ElevenLabs',     'cloud',  'https://api.elevenlabs.io',                        ARRAY['en','es','fr','de','hi','ja','pt','zh']),
  (uuid_generate_v4(), 'OpenAI TTS',    'cloud',  'https://api.openai.com/v1',                         ARRAY['en','es','fr','de','hi','ja','pt','zh']),
  (uuid_generate_v4(), 'Google WaveNet','cloud',  'https://texttospeech.googleapis.com',               ARRAY['en','es','fr','de','hi','ja','pt','zh']),
  (uuid_generate_v4(), 'Azure Neural',  'cloud',  'https://eastus.tts.speech.microsoft.com',           ARRAY['en','es','fr','de','hi']),
  (uuid_generate_v4(), 'Piper TTS',     'onprem', 'local',                                             ARRAY['en','es','fr','de']);
