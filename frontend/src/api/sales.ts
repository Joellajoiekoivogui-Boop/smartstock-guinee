import api from './axios'
import type { Sale, CartItem } from '../types'

interface SalesResponse {
  success: boolean
  data: {
    sales: Sale[]
    pagination: { total: number; page: number; limit: number; totalPages: number }
  }
}

export const salesApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get<SalesResponse>('/sales', { params }),

  getOne: (id: string) =>
    api.get<{ success: boolean; data: Sale }>(`/sales/${id}`),

  create: (data: {
    items: Array<{ product_id: string; quantity: number; unit_price?: number }>
    payment_method: string
    discount?: number
    note?: string
  }) => api.post<{ success: boolean; data: { id: string; total: number } }>('/sales', data),
}

export function cartToPayload(cart: CartItem[]) {
  return cart.map(c => ({
    product_id: c.product.id,
    quantity: c.quantity,
    unit_price: c.unit_price,
  }))
}
