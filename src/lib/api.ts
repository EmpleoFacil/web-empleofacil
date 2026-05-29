import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

export const auth = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { identifier: email, password }),
  logout: () => {
    Cookies.remove('token');
    window.location.href = '/login';
  },
  getMe: () => api.get('/auth/me'),
};

export const dashboard = {
  getCompany: () => api.get('/dashboard/company'),
  getAdmin: () => api.get('/dashboard/admin'),
};

export const jobs = {
  getCategories: () => api.get('/jobs/categories'),
  getCompanyJobs: (params?: Record<string, string | number>) =>
    api.get('/jobs/company', { params }),
  getCompanySummary: () => api.get('/jobs/company/summary'),
  getAdminJobs: (params?: Record<string, string | number>) =>
    api.get('/jobs/admin', { params }),
  getById: (id: string) => api.get(`/jobs/${id}`),
  create: (data: Record<string, unknown>) => api.post('/jobs', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/jobs/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/jobs/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/jobs/${id}`),
};

export const applications = {
  getByCompany: (params?: Record<string, string | number>) =>
    api.get('/applications/company', { params }),
  updateStatus: (id: string, status: string) =>
    api.patch(`/applications/${id}/status`, { status }),
};

export const interviews = {
  getByCompany: () => api.get('/interviews/company'),
  create: (data: Record<string, unknown>) => api.post('/interviews', data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/interviews/${id}/status`, { status }),
};

export const messages = {
  getByCompany: () => api.get('/messages/company'),
  create: (data: Record<string, unknown>) => api.post('/messages', data),
  getById: (id: string) => api.get(`/messages/${id}`),
};
