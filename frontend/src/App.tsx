import { type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import AdminLayout from './components/layout/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminCompanies from './pages/admin/AdminCompanies'
import AdminCompanyDetail from './pages/admin/AdminCompanyDetail'
import AdminUsers from './pages/admin/AdminUsers'
import AdminAuditLogs from './pages/admin/AdminAuditLogs'
import DashboardLayout from './components/layout/DashboardLayout'
import VentePage from './pages/dashboard/VentePage'
import CategoriesPage from './pages/dashboard/CategoriesPage'

function PrivateRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

const COMPANY_ROLES = ['company_owner', 'manager', 'cashier', 'employee', 'viewer']

export default function App() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to={user?.role === 'super_admin' ? '/admin' : '/dashboard'} replace />
            : <LoginPage />
        }
      />
      <Route path="/register" element={<RegisterPage />} />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <PrivateRoute roles={['super_admin']}>
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="companies" element={<AdminCompanies />} />
        <Route path="companies/:id" element={<AdminCompanyDetail />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
      </Route>

      {/* Dashboard routes (company users) */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute roles={COMPANY_ROLES}>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<VentePage />} />
        <Route path="vente" element={<VentePage />} />
        <Route path="categories" element={<CategoriesPage />} />
      </Route>

      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to={user?.role === 'super_admin' ? '/admin' : '/dashboard'} replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
