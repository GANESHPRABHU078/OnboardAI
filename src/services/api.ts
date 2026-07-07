const API_BASE = '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetch(`${API_BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then(r => handleResponse(r)),
    register: (name: string, email: string, password: string, role?: string) =>
      fetch(`${API_BASE}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, role }) }).then(r => handleResponse(r)),
    me: () => fetch(`${API_BASE}/api/auth/me`, { headers: getAuthHeaders() }).then(r => handleResponse(r)),
  },
  dashboard: {
    getStats: () => fetch(`${API_BASE}/api/dashboard`, { headers: getAuthHeaders() }).then(r => handleResponse(r)),
  },
  employees: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetch(`${API_BASE}/api/employees${q}`, { headers: getAuthHeaders() }).then(r => handleResponse(r));
    },
    get: (id: string) => fetch(`${API_BASE}/api/employees/${id}`, { headers: getAuthHeaders() }).then(r => handleResponse(r)),
    create: (data: Record<string, unknown>) => fetch(`${API_BASE}/api/employees`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => handleResponse(r)),
    update: (id: string, data: Record<string, unknown>) => fetch(`${API_BASE}/api/employees/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => handleResponse(r)),
    delete: (id: string) => fetch(`${API_BASE}/api/employees/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(r => handleResponse(r)),
    getOnboarding: (id: string) => fetch(`${API_BASE}/api/employees/${id}/onboarding`, { headers: getAuthHeaders() }).then(r => handleResponse(r)),
  },
  onboarding: {
    generate: (employeeId: string) => fetch(`${API_BASE}/api/onboarding/generate`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ employeeId }) }).then(r => handleResponse(r)),
  },
  rag: {
    upload: (formData: FormData) => fetch(`${API_BASE}/api/rag/upload`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }, body: formData }).then(r => handleResponse(r)),
    search: (query: string, handbookId?: string) => fetch(`${API_BASE}/api/rag/search`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ query, handbookId, topK: 5 }) }).then(r => handleResponse(r)),
    listHandbooks: () => fetch(`${API_BASE}/api/rag/handbooks`, { headers: getAuthHeaders() }).then(r => handleResponse(r)),
    deleteHandbook: (id: string) => fetch(`${API_BASE}/api/rag/handbooks?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(r => handleResponse(r)),
  },
  assessments: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetch(`${API_BASE}/api/assessments${q}`, { headers: getAuthHeaders() }).then(r => handleResponse(r));
    },
    get: (id: string) => fetch(`${API_BASE}/api/assessments/${id}`, { headers: getAuthHeaders() }).then(r => handleResponse(r)),
    generate: (data: Record<string, unknown>) => fetch(`${API_BASE}/api/assessments`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ ...data, generate: true }) }).then(r => handleResponse(r)),
    create: (data: Record<string, unknown>) => fetch(`${API_BASE}/api/assessments`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => handleResponse(r)),
    update: (id: string, data: Record<string, unknown>) => fetch(`${API_BASE}/api/assessments/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => handleResponse(r)),
    delete: (id: string) => fetch(`${API_BASE}/api/assessments/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(r => handleResponse(r)),
    submit: (id: string, answers: Record<string, string>) => fetch(`${API_BASE}/api/assessments/${id}/submit`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ answers }) }).then(r => handleResponse(r)),
  },
  certificates: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetch(`${API_BASE}/api/certificates${q}`, { headers: getAuthHeaders() }).then(r => handleResponse(r));
    },
    get: (id: string) => fetch(`${API_BASE}/api/certificates/${id}`, { headers: getAuthHeaders() }).then(r => handleResponse(r)),
    generate: (data: Record<string, unknown>) => fetch(`${API_BASE}/api/certificates/generate`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => handleResponse(r)),
    approve: (id: string) => fetch(`${API_BASE}/api/certificates/${id}/approve`, { method: 'POST', headers: getAuthHeaders() }).then(r => handleResponse(r)),
    reject: (id: string) => fetch(`${API_BASE}/api/certificates/${id}/reject`, { method: 'POST', headers: getAuthHeaders() }).then(r => handleResponse(r)),
  },
  progress: {
    get: (employeeId: string) => fetch(`${API_BASE}/api/progress/${employeeId}`, { headers: getAuthHeaders() }).then(r => handleResponse(r)),
    update: (employeeId: string, data: Record<string, unknown>) => fetch(`${API_BASE}/api/progress/${employeeId}/update`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => handleResponse(r)),
  },
  admin: {
    departments: { list: () => fetch(`${API_BASE}/api/admin/departments`, { headers: getAuthHeaders() }).then(r => handleResponse(r)), create: (data: Record<string, unknown>) => fetch(`${API_BASE}/api/admin/departments`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => handleResponse(r)), update: (id: string, data: Record<string, unknown>) => fetch(`${API_BASE}/api/admin/departments/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => handleResponse(r)), delete: (id: string) => fetch(`${API_BASE}/api/admin/departments/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(r => handleResponse(r)) },
    policies: { list: () => fetch(`${API_BASE}/api/admin/policies`, { headers: getAuthHeaders() }).then(r => handleResponse(r)), create: (data: Record<string, unknown>) => fetch(`${API_BASE}/api/admin/policies`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => handleResponse(r)), update: (id: string, data: Record<string, unknown>) => fetch(`${API_BASE}/api/admin/policies/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => handleResponse(r)), delete: (id: string) => fetch(`${API_BASE}/api/admin/policies/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(r => handleResponse(r)) },
    settings: { get: () => fetch(`${API_BASE}/api/admin/settings`, { headers: getAuthHeaders() }).then(r => handleResponse(r)), update: (settings: Record<string, unknown>) => fetch(`${API_BASE}/api/admin/settings`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ settings }) }).then(r => handleResponse(r)) },
    analytics: () => fetch(`${API_BASE}/api/admin/analytics`, { headers: getAuthHeaders() }).then(r => handleResponse(r)),
    auditLogs: (params?: Record<string, string>) => { const q = params ? '?' + new URLSearchParams(params).toString() : ''; return fetch(`${API_BASE}/api/admin/audit-logs${q}`, { headers: getAuthHeaders() }).then(r => handleResponse(r)); },
  },
  notifications: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetch(`${API_BASE}/api/notifications${q}`, { headers: getAuthHeaders() }).then(r => handleResponse(r));
    },
    markRead: (id: string) => fetch(`${API_BASE}/api/notifications/${id}`, { method: 'PUT', headers: getAuthHeaders() }).then(r => handleResponse(r)),
    delete: (id: string) => fetch(`${API_BASE}/api/notifications/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(r => handleResponse(r)),
    markAllRead: () => fetch(`${API_BASE}/api/notifications/read-all`, { method: 'POST', headers: getAuthHeaders() }).then(r => handleResponse(r)),
    create: (data: Record<string, unknown>) => fetch(`${API_BASE}/api/notifications`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => handleResponse(r)),
  },
  tasks: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetch(`${API_BASE}/api/tasks${q}`, { headers: getAuthHeaders() }).then(r => handleResponse(r));
    },
    get: (id: string) => fetch(`${API_BASE}/api/tasks/${id}`, { headers: getAuthHeaders() }).then(r => handleResponse(r)),
    create: (data: Record<string, unknown>) => fetch(`${API_BASE}/api/tasks`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => handleResponse(r)),
    update: (id: string, data: Record<string, unknown>) => fetch(`${API_BASE}/api/tasks/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) }).then(r => handleResponse(r)),
    delete: (id: string) => fetch(`${API_BASE}/api/tasks/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(r => handleResponse(r)),
  },
  analytics: {
    get: () => fetch(`${API_BASE}/api/analytics`, { headers: getAuthHeaders() }).then(r => handleResponse(r)),
  },
  seed: () => fetch(`${API_BASE}/api/seed`, { method: 'POST' }).then(r => handleResponse(r)),
};

/* ── Backward-compatible flat API for legacy components ── */
export const apiService = {
  getDashboardStats: () => api.dashboard.getStats(),
  getEmployees: (params?: { page?: number; pageSize?: number; [key: string]: unknown }) => {
    const p: Record<string, string> = {};
    if (params) {
      if (params.page) p.page = String(params.page);
      if (params.pageSize) p.limit = String(params.pageSize);
      Object.entries(params).forEach(([k, v]) => {
        if (k !== 'page' && k !== 'pageSize' && v !== undefined && v !== '') p[k] = String(v);
      });
    }
    return api.employees.list(Object.keys(p).length > 0 ? p : undefined);
  },
  createEmployee: (data: Record<string, unknown>) => api.employees.create(data),
  updateEmployee: (id: string, data: Record<string, unknown>) => api.employees.update(id, data),
  deleteEmployee: (id: string) => api.employees.delete(id),
  getDepartments: () => api.admin.departments.list(),
  createDepartment: (data: Record<string, unknown>) => api.admin.departments.create(data),
  updateDepartment: (id: string, data: Record<string, unknown>) => api.admin.departments.update(id, data),
  deleteDepartment: (id: string) => api.admin.departments.delete(id),
  getPolicies: () => api.admin.policies.list(),
  createPolicy: (data: Record<string, unknown>) => api.admin.policies.create(data),
  updatePolicy: (id: string, data: Record<string, unknown>) => api.admin.policies.update(id, data),
  deletePolicy: (id: string) => api.admin.policies.delete(id),
  getAssessments: (params?: Record<string, string>) => api.assessments.list(params),
  generateOnboarding: (employeeId: string) => api.onboarding.generate(employeeId),
  getProgress: (employeeId: string) => api.progress.get(employeeId),
  getCertificates: (params?: Record<string, string>) => api.certificates.list(params),
  generateCertificate: (employeeId: string, trainingPlanId: string) =>
    api.certificates.generate({ employeeId, trainingPlanId }),
  approveCertificate: (id: string) => api.certificates.approve(id),
  rejectCertificate: (id: string) => api.certificates.reject(id),
  getHandbooks: () => api.rag.listHandbooks(),
  uploadHandbook: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.rag.upload(fd);
  },
  deleteHandbook: (id: string) => api.rag.deleteHandbook(id),
  searchHandbooks: (query: string) => api.rag.search(query),
  getUsers: () => fetch(`${API_BASE}/api/admin/users`, { headers: getAuthHeaders() }).then(r => handleResponse(r)),
  deleteUser: (id: string) => fetch(`${API_BASE}/api/admin/users/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(r => handleResponse(r)),
  getAuditLogs: (params?: { page?: number; pageSize?: number }) => {
    const p: Record<string, string> = {};
    if (params?.page) p.page = String(params.page);
    if (params?.pageSize) p.limit = String(params.pageSize);
    return api.admin.auditLogs(Object.keys(p).length > 0 ? p : undefined);
  },
  getSettings: () => api.admin.settings.get(),
  updateSetting: (key: string, value: unknown) => api.admin.settings.update({ [key]: value } as Record<string, unknown>),
};