import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('tn_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const tenantId = localStorage.getItem('tn_tenant_id');
    if (tenantId) config.headers['x-tenant-id'] = tenantId;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Agents
export const agentsApi = {
  list: (params?: Record<string, any>) => api.get('/agents', { params }),
  get: (id: string) => api.get(`/agents/${id}`),
  create: (data: any) => api.post('/agents', data),
  update: (id: string, data: any) => api.patch(`/agents/${id}`, data),
  delete: (id: string) => api.delete(`/agents/${id}`),
  getConfig: (id: string) => api.get(`/agents/${id}/config`),
  updateConfig: (id: string, data: any) => api.patch(`/agents/${id}/config`, data),
  duplicate: (id: string) => api.post(`/agents/${id}/duplicate`),
};

// Voices
export const voicesApi = {
  list: (params?: Record<string, any>) => api.get('/voices', { params }),
  get: (id: string) => api.get(`/voices/${id}`),
  preview: (id: string, text: string) => api.post(`/voices/${id}/preview`, { text }),
};

// Knowledge Base
export const kbApi = {
  list: (params?: Record<string, any>) => api.get('/knowledge-base', { params }),
  get: (id: string) => api.get(`/knowledge-base/${id}`),
  create: (data: FormData) => api.post('/knowledge-base', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete(`/knowledge-base/${id}`),
  attachToAgent: (agentId: string, kbId: string) => api.post(`/agents/${agentId}/knowledge-base/${kbId}`),
  detachFromAgent: (agentId: string, kbId: string) => api.delete(`/agents/${agentId}/knowledge-base/${kbId}`),
  getAgentDocs: (agentId: string) => api.get(`/knowledge-base?agent_id=${agentId}`),
};

// Tools
export const toolsApi = {
  list: (params?: Record<string, any>) => api.get('/tools', { params }),
  get: (id: string) => api.get(`/tools/${id}`),
  create: (data: any) => api.post('/tools', data),
  update: (id: string, data: any) => api.patch(`/tools/${id}`, data),
  delete: (id: string) => api.delete(`/tools/${id}`),
  attachToAgent: (agentId: string, toolId: string) => api.post(`/agents/${agentId}/tools/${toolId}`),
  detachFromAgent: (agentId: string, toolId: string) => api.delete(`/agents/${agentId}/tools/${toolId}`),
};

// LLM Providers
export const llmApi = {
  list: () => api.get('/llm-providers'),
  models: () => api.get('/llm-providers/models'),
};

// Conversations / Analytics
export const analyticsApi = {
  summary: (params?: Record<string, any>) => api.get('/analytics/summary', { params }),
  conversations: (params?: Record<string, any>) => api.get('/conversations', { params }),
  conversation: (id: string) => api.get(`/conversations/${id}`),
};

// Branches
export const branchesApi = {
  list: (agentId: string) => api.get(`/agents/${agentId}/branches`),
  create: (agentId: string, data: any) => api.post(`/agents/${agentId}/branches`, data),
  update: (agentId: string, id: string, data: any) => api.patch(`/agents/${agentId}/branches/${id}`, data),
  delete: (agentId: string, id: string) => api.delete(`/agents/${agentId}/branches/${id}`),
};

// Tests
export const testsApi = {
  list: (agentId: string) => api.get(`/tests?agent_id=${agentId}`),
  create: (data: any) => api.post('/tests', data),
  run: (id: string) => api.post(`/tests/${id}/run`),
  delete: (id: string) => api.delete(`/tests/${id}`),
};

// Webhooks
export const webhooksApi = {
  list: (agentId: string) => api.get(`/webhook-endpoints?agent_id=${agentId}`),
  create: (data: any) => api.post('/webhook-endpoints', data),
  delete: (id: string) => api.delete(`/webhook-endpoints/${id}`),
};

// Workflow
export const workflowApi = {
  get: (agentId: string) => api.get(`/workflow/${agentId}`),
  save: (agentId: string, data: any) => api.put(`/workflow/${agentId}`, data),
};

// Phone Numbers
export const phoneNumbersApi = {
  list: () => api.get('/phone-numbers'),
  sipEndpoint: () => api.get('/phone-numbers/sip-endpoint'),
};

// Batch Calls
export const batchCallsApi = {
  list: (params?: Record<string, any>) => api.get('/batch-calls', { params }),
  get: (id: string) => api.get(`/batch-calls/${id}`),
  create: (data: any) => api.post('/batch-calls', data),
};
