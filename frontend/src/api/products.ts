import api from './axios'
import type { Product } from '../types'

interface ProductsResponse {
  success: boolean
  data: {
    products: Product[]
    pagination: { total: number; page: number; limit: number; totalPages: number }
  }
}

export const productsApi = {
  getAll: (params?: {
    search?: string
    category_id?: string
    page?: number
    limit?: number
    active_only?: boolean
  }) => api.get<ProductsResponse>('/products', { params }),

  create: (data: Partial<Product>) =>
    api.post<{ success: boolean; data: Product }>('/products', data),

  update: (id: string, data: Partial<Product>) =>
    api.put<{ success: boolean; data: Product }>(`/products/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/products/${id}`),
}
