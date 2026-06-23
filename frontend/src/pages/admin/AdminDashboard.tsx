import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Building2, Users, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { Company } from '../../types'

function StatCard({ label, value, icon: Icon, color, subtext }: {
  label: string; value: number; icon: any; color: string; subtext?: string
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'badge-pending',
  active: 'badge-active',
  rejected: 'badge-rejected',
  suspended: 'badge-suspended',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  active: 'Actif',
  rejected: 'Refusé',
  suspended: 'Suspendu',
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard().then(r => r.data.data),
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const stats = data?.stats ?? { totalCompanies: 0, totalUsers: 0, pendingApprovals: 0 }
  const byStatus = data?.companiesByStatus ?? {}
  const recent: Company[] = data?.recentCompanies ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de la plateforme SmartStock Guinée</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Entreprises totales" value={stats.totalCompanies} icon={Building2} color="bg-primary-500" />
        <StatCard label="Utilisateurs totaux" value={stats.totalUsers} icon={Users} color="bg-blue-500" />
        <StatCard
          label="En attente de validation"
          value={stats.pendingApprovals}
          icon={Clock}
          color={stats.pendingApprovals > 0 ? 'bg-amber-500' : 'bg-gray-400'}
          subtext={stats.pendingApprovals > 0 ? 'Action requise' : 'Tout est à jour'}
        />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { key: 'active', label: 'Actives', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { key: 'pending', label: 'En attente', icon: Clock, color: 'text-amber-600 bg-amber-50' },
          { key: 'suspended', label: 'Suspendues', icon: XCircle, color: 'text-gray-600 bg-gray-50' },
          { key: 'rejected', label: 'Refusées', icon: XCircle, color: 'text-red-600 bg-red-50' },
        ].map(({ key, label, icon: Icon, color }) => (
          <div key={key} className={`rounded-xl p-4 ${color.split(' ')[1]}`}>
            <div className="flex items-center gap-2">
              <Icon size={16} className={color.split(' ')[0]} />
              <span className="text-xs font-medium text-gray-600">{label}</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${color.split(' ')[0]}`}>{byStatus[key] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Recent companies */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Dernières inscriptions</h2>
          <Link to="/admin/companies" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Voir tout →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Aucune entreprise enregistrée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Entreprise</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <Link to={`/admin/companies/${c.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-gray-500">{c.email}</td>
                    <td className="py-3 px-3">
                      <span className={STATUS_COLORS[c.status]}>{STATUS_LABELS[c.status]}</span>
                    </td>
                    <td className="py-3 px-3 text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
