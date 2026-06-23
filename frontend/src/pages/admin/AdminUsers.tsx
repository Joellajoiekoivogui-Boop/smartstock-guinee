import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { User } from '../../types'

// Fix #9 — type correspondant à la réponse snake_case de l'API
interface UserRow {
  id: string
  first_name: string
  last_name: string
  email: string
  role: User['role']
  is_active: boolean
  last_login_at: string | null
  company_id: string | null
  company_name: string | null
}

const ROLE_LABELS: Record<string, string> = {
  company_owner: 'Propriétaire',
  manager: 'Manager',
  cashier: 'Caissier',
  employee: 'Employé',
  viewer: 'Lecteur',
}

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => adminApi.getUsers({ search, page, limit: 20 }).then(r => r.data.data),
  })

  const users = data?.users ?? []
  const pagination = data?.pagination

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
        <p className="text-gray-500 text-sm mt-1">Tous les utilisateurs de la plateforme</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          className="input-field pl-9"
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      <div className="card !p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Aucun utilisateur trouvé</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Utilisateur', 'Email', 'Rôle', 'Entreprise', 'Statut', 'Dernière connexion'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u: UserRow) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold shrink-0">
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </div>
                        <span className="font-medium text-gray-900">{u.first_name} {u.last_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.company_id ? (
                        <Link to={`/admin/companies/${u.company_id}`} className="text-primary-600 hover:underline text-sm">
                          {u.company_name}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('fr-FR') : 'Jamais'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">{pagination.total} utilisateur{pagination.total > 1 ? 's' : ''}</p>
            <div className="flex gap-1">
              <button type="button" aria-label="Page précédente" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-40 rounded">
                <ChevronLeft size={16} />
              </button>
              <button type="button" aria-label="Page suivante" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-40 rounded">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
