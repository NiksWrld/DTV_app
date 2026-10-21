// API client — calls Next.js proxy routes (same origin, no CORS)

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const apiClient = {
  auth: {
    register: (email: string, password: string) =>
      request<{ token: string; user: { id: string; email: string } }>(
        'POST',
        '/api/auth/register',
        { email, password },
      ),
    login: (email: string, password: string) =>
      request<{ token: string; user: { id: string; email: string } }>(
        'POST',
        '/api/auth/login',
        { email, password },
      ),
    me: () =>
      request<{ id: string; email: string }>('GET', '/api/auth/me'),
  },
  onboarding: {
    getProfile: () =>
      request<{
        id: string;
        nationality: string;
        current_country: string;
        intended_path: string;
        has_dependents: boolean;
      }>('GET', '/api/onboarding/profile'),
    createProfile: (data: Record<string, unknown>) =>
      request<{ id: string }>('POST', '/api/onboarding/profile', data),
    updateProfile: (data: Record<string, unknown>) =>
      request<{ id: string }>('PUT', '/api/onboarding/profile', data),
  },
  embassies: {
    list: () =>
      request<Array<{ id: string; country: string; city: string; name: string }>>(
        'GET',
        '/api/embassies',
      ),
  },
  checklist: {
    get: () =>
      request<{ items: import('@/types/dtv').ChecklistItem[] }>('GET', '/api/checklist'),
    generate: () =>
      request<{ items: import('@/types/dtv').ChecklistItem[] }>('POST', '/api/checklist/generate'),
    updateStatus: (id: string, status: import('@/types/dtv').ChecklistItemStatus) =>
      request<void>('PUT', `/api/checklist/${id}/status`, { status }),
  },
  documents: {
    list: () =>
      request<import('@/types/dtv').Document[]>('GET', '/api/documents'),
    upload: async (file: File, checklistItemId?: string) => {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      if (checklistItemId) formData.append('checklist_item_id', checklistItemId);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    download: (id: string) =>
      request<{ url: string; filename: string }>('GET', `/api/documents/${id}/download`),
    delete: (id: string) => request<void>('DELETE', `/api/documents/${id}`),
  },
  providers: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<import('@/types/dtv').Provider[]>('GET', `/api/providers${qs}`);
    },
    get: (id: string) =>
      request<import('@/types/dtv').Provider>('GET', `/api/providers/${id}`),
  },
  account: {
    get: () =>
      request<{ id: string; email: string; role: string; display_name?: string; avatar_url?: string; phone?: string; bio?: string }>(
        'GET', '/api/account'
      ),
    update: (data: { display_name?: string; phone?: string; bio?: string }) =>
      request<{ id: string; email: string; display_name?: string; avatar_url?: string; phone?: string; bio?: string }>(
        'PUT', '/api/account', data
      ),
  },
  admin: {
    providers: {
      list: () =>
        request<import('@/types/dtv').Provider[]>('GET', '/api/admin/providers'),
      create: (data: Record<string, unknown>) =>
        request<import('@/types/dtv').Provider>('POST', '/api/admin/providers', data),
      update: (id: string, data: Record<string, unknown>) =>
        request<import('@/types/dtv').Provider>('PUT', `/api/admin/providers/${id}`, data),
      remove: (id: string) =>
        request<void>('DELETE', `/api/admin/providers/${id}`),
      verify: (id: string, status: string) =>
        request('PUT', `/api/admin/providers/${id}/verify`, { verification_status: status }),
    },
    users: {
      list: () =>
        request<Array<{ id: string; email: string; role: string; display_name?: string; created_at: string }>>(
          'GET', '/api/admin/users'
        ),
      updateRole: (id: string, role: string) =>
        request('PUT', `/api/admin/users/${id}`, { role }),
    },
  },
  compliance: {
    get: () =>
      request<import('@/types/dtv').ComplianceOverview>('GET', '/api/compliance'),
    setEntry: (data: { entry_date: string; port_of_entry?: string; notes?: string }) =>
      request<import('@/types/dtv').VisaEntry>('POST', '/api/compliance/entry', data),
    createTask: (data: { type: string; title: string; due_date: string; notes?: string }) =>
      request<import('@/types/dtv').ComplianceTask>('POST', '/api/compliance/tasks', data),
    completeTask: (id: string, data: { document_id?: string; notes?: string }) =>
      request<import('@/types/dtv').ComplianceOverview>('PUT', `/api/compliance/tasks/${id}/complete`, data),
    updateTask: (id: string, data: { title?: string; due_date?: string; notes?: string }) =>
      request<import('@/types/dtv').ComplianceTask>('PUT', `/api/compliance/tasks/${id}`, data),
    deleteTask: (id: string) =>
      request<void>('DELETE', `/api/compliance/tasks/${id}`),
  },
  plan: {
    list: () =>
      request<import('@/types/dtv').PlanItem[]>('GET', '/api/plan'),
    add: (data: { provider_id: string; start_month: number; duration_months: number; notes?: string }) =>
      request<import('@/types/dtv').PlanItem>('POST', '/api/plan', data),
    update: (id: string, data: { start_month?: number; duration_months?: number; notes?: string }) =>
      request<import('@/types/dtv').PlanItem>('PUT', `/api/plan/${id}`, data),
    remove: (id: string) =>
      request<void>('DELETE', `/api/plan/${id}`),
  },
  guides: {
    list: () =>
      request<import('@/types/dtv').Guide[]>('GET', '/api/guides'),
    get: (slug: string) =>
      request<import('@/types/dtv').Guide>('GET', `/api/guides/${slug}`),
  },
  review: {
    get: () =>
      request<import('@/types/dtv').ReadinessReview>('GET', '/api/review'),
    generate: () =>
      request<import('@/types/dtv').ReadinessReview>('POST', '/api/review/generate'),
  },
};
