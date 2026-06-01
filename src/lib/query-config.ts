import { keepPreviousData } from '@tanstack/react-query';

/** Shared React Query defaults for dashboard data */
export const dashboardQueryOptions = {
  staleTime: 2 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

export const listQueryOptions = {
  staleTime: 60 * 1000,
  gcTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  placeholderData: keepPreviousData,
} as const;

export const queryKeys = {
  dashboardCompany: ['dashboard-company'] as const,
  dashboardAdmin: ['dashboard-admin'] as const,
  planLimits: ['plan-limits'] as const,
  companyMe: ['company-me'] as const,
  messagesUnreadCount: ['messages-unread-count'] as const,
  jobsCompanySummary: ['jobs-company-summary'] as const,
  jobsAdminSummary: ['jobs-admin-summary'] as const,
  jobsCompany: (filters: Record<string, string>, page: number) =>
    ['jobs-company', filters, page] as const,
  jobsAdmin: (filters: Record<string, string>, page: number) =>
    ['jobs-admin', filters, page] as const,
};
