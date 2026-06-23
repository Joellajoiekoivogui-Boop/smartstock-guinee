import api from './axios'

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  register: (data: {
    companyName: string
    ownerFirstName: string
    ownerLastName: string
    email: string
    password: string
    phone?: string
    address?: string
    city?: string
    businessType?: string
  }) => api.post('/auth/register', data),

  // Fix #7 — le refreshToken voyage en cookie HttpOnly, pas en body
  logout: () => api.post('/auth/logout'),

  getMe: () => api.get('/auth/me'),

  refresh: () => api.post('/auth/refresh'),
}
