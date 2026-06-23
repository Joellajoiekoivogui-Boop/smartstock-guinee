import api from './axios'
import type { Category } from '../types'

export const categoriesApi = {
  getAll: () =>
    api.get<{ success: boolean; data: Category[] }>('/categories'),

  create: (data: { name: string; description?: string; color?: string }) =>
    api.post<{ success: boolean; data: Category }>('/categories', data),

  update: (id: string, data: { name: string; description?: string; color?: string }) =>
    api.put<{ success: boolean; data: Category }>(`/categories/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/categories/${id}`),
}
