export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: 'super_admin' | 'company_owner' | 'manager' | 'cashier' | 'employee' | 'viewer'
  avatarUrl?: string
  phone?: string
  lastLoginAt?: string
  company?: Company | null
}

export interface Company {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  country: string
  logoUrl?: string
  businessType?: string
  status: 'pending' | 'active' | 'suspended' | 'rejected'
  subscriptionPlan: 'free' | 'basic' | 'premium' | 'enterprise'
  subscriptionExpiresAt?: string
  rejectionReason?: string
  validatedAt?: string
  userCount?: number
  createdAt: string
  updatedAt: string
}

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: Array<{ msg: string; field?: string }>
}

export interface DashboardStats {
  totalCompanies: number
  totalUsers: number
  pendingApprovals: number
}

export interface Category {
  id: string
  company_id: string
  name: string
  description?: string
  color: string
  product_count: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  company_id: string
  category_id?: string
  name: string
  description?: string
  price: number
  stock: number
  barcode?: string
  unit: string
  is_active: boolean
  category_name?: string
  category_color?: string
  created_at: string
  updated_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id?: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Sale {
  id: string
  company_id: string
  user_id?: string
  total: number
  discount: number
  payment_method: 'cash' | 'mobile_money' | 'card' | 'credit'
  note?: string
  seller_name?: string
  items?: SaleItem[]
  created_at: string
}

export interface CartItem {
  product: Product
  quantity: number
  unit_price: number
}

export interface AuditLog {
  id: string
  userId?: string
  companyId?: string
  action: string
  entityType?: string
  entityId?: string
  userName?: string
  companyName?: string
  createdAt: string
}
