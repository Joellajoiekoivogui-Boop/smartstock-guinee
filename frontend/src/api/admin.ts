import api from './axios'

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),

  getCompanies: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/admin/companies', { params }),

  getCompany: (id: string) => api.get(`/admin/companies/${id}`),

  approveCompany: (id: string) => api.patch(`/admin/companies/${id}/approve`),

  rejectCompany: (id: string, reason: string) =>
    api.patch(`/admin/companies/${id}/reject`, { reason }),

  suspendCompany: (id: string) => api.patch(`/admin/companies/${id}/suspend`),

  reactivateCompany: (id: string) => api.patch(`/admin/companies/${id}/reactivate`),

  getUsers: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get('/admin/users', { params }),

  getAuditLogs: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/audit-logs', { params }),
}
