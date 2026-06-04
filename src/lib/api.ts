import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──
export const auth = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { identifier: email, password }),
  logout: () => {
    Cookies.remove('token');
    window.location.href = '/login';
  },
  getMe: () => api.get('/auth/me'),
};

// ── Dashboard ──
export const dashboard = {
  getCompany: () => api.get('/dashboard/company'),
  getAdmin: () => api.get('/dashboard/admin'),
  getAdminActivity: (params?: Record<string, string | number>) =>
    api.get('/admin/activity', { params }),
};

// ── Search ──
export const search = {
  company: (q: string, type?: 'all' | 'jobs' | 'candidates' | 'messages') =>
    api.get('/search/company', { params: { q, type: type ?? 'all' } }),
};

// ── Jobs ──
export const jobs = {
  getCategories: () => api.get('/jobs/categories'),
  getCompanyJobs: (params?: Record<string, string | number>) =>
    api.get('/jobs/company', { params }),
  getCompanySummary: () => api.get('/jobs/company/summary'),
  getAdminJobs: (params?: Record<string, string | number>) =>
    api.get('/jobs/admin', { params }),
  getAdminSummary: () => api.get('/jobs/admin/summary'),
  getById: (id: string) => api.get(`/jobs/${id}`),
  create: (data: Record<string, unknown>) => api.post('/jobs', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/jobs/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/jobs/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/jobs/${id}`),
  duplicate: (id: string) => api.post(`/jobs/${id}/duplicate`),
};

// ── Applications ──
export const applications = {
  getByCompany: (params?: Record<string, string | number>) =>
    api.get('/applications/company', { params }),
  getSummary: () => api.get('/applications/company/summary'),
  getPipeline: (params?: Record<string, string>) =>
    api.get('/applications/company/pipeline', { params }),
  getExport: (params?: Record<string, string>) =>
    api.get('/applications/company/export', { params }),
  getById: (id: string) => api.get(`/applications/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/applications/${id}/status`, { status }),
  addNote: (id: string, content: string) =>
    api.post(`/applications/${id}/notes`, { content }),
  updateNote: (applicationId: string, noteId: string, content: string) =>
    api.patch(`/applications/${applicationId}/notes/${noteId}`, { content }),
};

// ── Interviews ──
export const interviews = {
  getByCompany: (params?: Record<string, string | number>) =>
    api.get('/interviews/company', { params }),
  getUpcoming: () => api.get('/interviews/company/upcoming'),
  getSummary: () => api.get('/interviews/company/summary'),
  create: (data: Record<string, unknown>) => api.post('/interviews', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/interviews/${id}`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/interviews/${id}/status`, { status }),
  sendReminder: (id: string) => api.post(`/interviews/${id}/reminder`),
  saveResult: (id: string, data: Record<string, unknown>) =>
    api.post(`/interviews/${id}/result`, data),
};

// ── Messages ──
export const messages = {
  getByCompany: (params?: Record<string, string | number>) =>
    api.get('/messages/company', { params }),
  getById: (id: string) => api.get(`/messages/${id}`),
  create: (data: Record<string, unknown>) => api.post('/messages', data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/messages/${id}/status`, { status }),
  resend: (id: string) => api.post(`/messages/${id}/resend`),
  getTemplates: () => api.get('/messages/templates'),
  createTemplate: (data: Record<string, unknown>) => api.post('/messages/templates', data),
  deleteTemplate: (id: string) => api.delete(`/messages/templates/${id}`),
};

// ── Companies ──
export const companies = {
  // Company (own profile)
  getMe: () => api.get('/companies/me'),
  updateMe: (data: Record<string, unknown>) => api.patch('/companies/me', data),
  uploadMyLogo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/companies/me/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getPlanLimits: () => api.get('/companies/me/plan-limits'),
  getMyUsers: () => api.get('/companies/me/users'),
  createMyUser: (data: Record<string, unknown>) => api.post('/companies/me/users', data),
  updateMyUser: (id: string, data: Record<string, unknown>) =>
    api.patch(`/companies/me/users/${id}`, data),
  deleteMyUser: (id: string) => api.delete(`/companies/me/users/${id}`),
  getBillingPlan: () => api.get('/companies/billing/company-plan'),
  getAvailablePlans: () => api.get('/companies/plans'),
  updatePlan: (planId: string) => api.patch('/companies/me/plan', { planId }),

  // Admin
  getAdminSummary: () => api.get('/companies/admin/summary'),
  getAdminList: (params?: Record<string, string | number>) =>
    api.get('/companies/admin/list', { params }),
  getAdminById: (id: string) => api.get(`/companies/admin/${id}`),
  create: (data: Record<string, unknown>) => api.post('/companies', data),
  updateAdmin: (id: string, data: Record<string, unknown>) =>
    api.patch(`/companies/admin/${id}`, data),
  deleteAdmin: (id: string) => api.delete(`/companies/admin/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/companies/admin/${id}/status`, { status }),
  getUsers: (id: string) => api.get(`/companies/admin/${id}/users`),
  getMetrics: (id: string) => api.get(`/companies/admin/${id}/metrics`),
  getJobs: (id: string) => api.get(`/companies/admin/${id}/jobs`),
  getApplications: (id: string) => api.get(`/companies/admin/${id}/applications`),
  createUser: (id: string, data: Record<string, unknown>) =>
    api.post(`/companies/admin/${id}/users`, data),
  updateUser: (id: string, userId: string, data: Record<string, unknown>) =>
    api.patch(`/companies/admin/${id}/users/${userId}`, data),
  deleteUser: (id: string, userId: string) =>
    api.delete(`/companies/admin/${id}/users/${userId}`),
  assignPlan: (id: string, planId: string) =>
    api.patch(`/companies/admin/${id}/plan`, { planId }),
};

// ── Candidates ──
export const candidates = {
  getSummary: () => api.get('/candidates/summary'),
  getList: (params?: Record<string, string | number>) =>
    api.get('/candidates', { params }),
  getExport: (params?: Record<string, string>) =>
    api.get('/candidates/export', { params }),
  getById: (id: string) => api.get(`/candidates/${id}`),
  getApplications: (id: string) => api.get(`/candidates/${id}/applications`),
  getDocuments: (id: string) => api.get(`/candidates/${id}/documents`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/candidates/${id}/status`, { status }),
};

// ── Documents ──
export const documents = {
  getByCandidate: (candidateId: string) =>
    api.get(`/documents/candidate/${candidateId}`),
  getPending: (params?: Record<string, string | number>) =>
    api.get('/documents/pending', { params }),
};

// ── Billing ──
export const billing = {
  getPlans: () => api.get('/billing/plans'),
  createPlan: (data: Record<string, unknown>) => api.post('/billing/plans', data),
  updatePlan: (id: string, data: Record<string, unknown>) =>
    api.patch(`/billing/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/billing/plans/${id}`),
  getPayments: (params?: Record<string, string | number>) =>
    api.get('/billing/payments', { params }),
  addManualPayment: (data: Record<string, unknown>) =>
    api.post('/billing/manual-payment', data),
  assignPlan: (companyId: string, planId: string) =>
    api.patch('/billing/assign-plan', { companyId, planId }),
  getPlatformSettings: () => api.get('/billing/platform-settings'),
  updatePlatformSettings: (data: Record<string, unknown>) =>
    api.patch('/billing/platform-settings', data),
};
