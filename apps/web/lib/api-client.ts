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
      request<{ id: string; email: string; role?: string }>('GET', '/api/auth/me'),
  },
  providerPortal: {
    me: () =>
      request<{
        listing: import('@/types/dtv').OwnedListing | null;
        packages: import('@/types/dtv').ProviderPackage[];
        stats: import('@/types/dtv').ViewStats | null;
      }>('GET', '/api/provider/me'),
    create: (data: Record<string, unknown>) =>
      request<import('@/types/dtv').OwnedListing>('POST', '/api/provider/me', data),
    save: (data: Record<string, unknown>) =>
      request<import('@/types/dtv').OwnedListing>('PUT', '/api/provider/me', data),
    claimable: (q: string) =>
      request<Array<{ id: string; name: string; category: string; location?: string; claim_status: string }>>(
        'GET',
        `/api/provider/claimable?q=${encodeURIComponent(q)}`,
      ),
    claim: (provider_id: string) =>
      request<import('@/types/dtv').OwnedListing>('POST', '/api/provider/claim', { provider_id }),
    addPackage: (data: Record<string, unknown>) =>
      request<import('@/types/dtv').ProviderPackage>('POST', '/api/provider/packages', data),
    removePackage: (id: string) => request<void>('DELETE', `/api/provider/packages/${id}`),
    packages: (providerId: string) =>
      request<import('@/types/dtv').ProviderPackage[]>('GET', `/api/providers/${providerId}/packages`),
    requests: () =>
      request<import('@/types/dtv').Booking[]>('GET', '/api/provider/requests'),
    approveRequest: (id: string, data: Record<string, unknown>) =>
      request<import('@/types/dtv').Booking>('POST', `/api/provider/requests/${id}/approve`, data),
    declineRequest: (id: string, reason?: string) =>
      request<import('@/types/dtv').Booking>('POST', `/api/provider/requests/${id}/decline`, { reason }),
    completeRequest: (id: string) =>
      request<import('@/types/dtv').Booking>('POST', `/api/provider/requests/${id}/complete`, {}),
    letter: (id: string) =>
      request<{ url: string; filename: string }>('GET', `/api/provider/requests/${id}/letter`),
  },
  bookings: {
    mine: () => request<import('@/types/dtv').Booking[]>('GET', '/api/bookings'),
    create: (providerId: string, data: { message?: string; package_id?: string; preferred_start?: string }) =>
      request<import('@/types/dtv').Booking>('POST', `/api/providers/${providerId}/requests`, data),
    cancel: (id: string) =>
      request<import('@/types/dtv').Booking>('POST', `/api/bookings/${id}/cancel`, {}),
    letter: (id: string) =>
      request<{ url: string; filename: string }>('GET', `/api/bookings/${id}/letter`),
    review: (id: string, data: { rating: number; body?: string }) =>
      request<import('@/types/dtv').Review>('POST', `/api/bookings/${id}/review`, data),
  },
  reviews: {
    forProvider: (providerId: string) =>
      request<import('@/types/dtv').ReviewSummary>('GET', `/api/providers/${providerId}/reviews`),
    mine: () => request<import('@/types/dtv').Review[]>('GET', '/api/provider/reviews'),
    reply: (id: string, reply: string) =>
      request<import('@/types/dtv').Review>('POST', `/api/provider/reviews/${id}/reply`, { reply }),
  },
  onboarding: {
    getProfile: () =>
      request<{
        id: string;
        nationality: string;
        current_country: string;
        current_city?: string;
        intended_path: string;
        has_dependents: boolean;
        passport_expiry?: string | null;
        passport_number?: string | null;
        preferred_embassy_id?: string | null;
        embassy_overridden?: boolean;
      }>('GET', '/api/onboarding/profile'),
    createProfile: (data: Record<string, unknown>) =>
      request<{ id: string }>('POST', '/api/onboarding/profile', data),
    updateProfile: (data: Record<string, unknown>) =>
      request<{ id: string }>('PUT', '/api/onboarding/profile', data),
  },
  embassies: {
    list: () =>
      request<Array<{ id: string; country: string; city: string; name: string; website_url?: string; notes?: string }>>(
        'GET',
        '/api/embassies',
      ),
    match: (country: string, city?: string) =>
      request<{ id: string; country: string; city: string; name: string; website_url?: string; notes?: string } | null>(
        'POST',
        '/api/embassies/match',
        { country, city },
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

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
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
      stats: () =>
        request<import('@/types/dtv').ProviderViewRow[]>('GET', '/api/admin/provider-stats'),
    },
    settings: {
      get: () => request<import('@/types/dtv').AppSettings>('GET', '/api/admin/settings'),
      update: (data: import('@/types/dtv').AppSettings) =>
        request<import('@/types/dtv').AppSettings>('PUT', '/api/admin/settings', data),
    },
    reviews: {
      list: () => request<import('@/types/dtv').Review[]>('GET', '/api/admin/reviews'),
      setHidden: (id: string, hidden: boolean) =>
        request<import('@/types/dtv').Review>('PUT', `/api/admin/reviews/${id}`, { hidden }),
    },
    users: {
      list: () =>
        request<Array<{ id: string; email: string; role: string; display_name?: string; created_at: string }>>(
          'GET', '/api/admin/users'
        ),
      updateRole: (id: string, role: string) =>
        request('PUT', `/api/admin/users/${id}`, { role }),
    },
    claims: {
      list: () =>
        request<Array<{ id: string; name: string; category: string; location?: string; claim_status: string; owner_email?: string }>>(
          'GET',
          '/api/admin/provider-claims',
        ),
      review: (id: string, action: 'approve' | 'reject') =>
        request('POST', `/api/admin/provider-claims/${id}`, { action }),
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
