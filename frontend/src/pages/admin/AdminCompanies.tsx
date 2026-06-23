import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, Eye, CheckCircle, XCircle, PauseCircle, PlayCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '../../api/admin'
import toast from 'react-hot-toast'
import type { Company } from '../../types'

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

export default function AdminCompanies() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-companies', search, statusFilter, page],
    queryFn: () => adminApi.getCompanies({ search, status: statusFilter, page, limit: 15 }).then(r => r.data.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-companies'] })

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveCompany(id),
    onSuccess: () => { toast.success('Entreprise approuvée'); invalidate() },
    onError: () => toast.error('Erreur lors de l\'approbation'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.rejectCompany(id, reason),
    onSuccess: () => { toast.success('Entreprise refusée'); setRejectModal(null); setRejectReason(''); invalidate() },
    onError: () => toast.error('Erreur lors du refus'),
  })

  const suspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.suspendCompany(id),
    onSuccess: () => { toast.success('Entreprise suspendue'); invalidate() },
    onError: () => toast.error('Erreur'),
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => adminApi.reactivateCompany(id),
    onSuccess: () => { toast.success('Entreprise réactivée'); invalidate() },
    onError: () => toast.error('Erreur'),
  })

  const companies: Company[] = data?.companies ?? []
  const pagination = data?.pagination

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Entreprises</h1>
        <p className="text-gray-500 text-sm mt-1">Gestion des comptes entreprises</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="input-field pl-9"
            placeholder="Rechercher une entreprise..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="input-field sm:w-48"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="active">Actifs</option>
          <option value="suspended">Suspendus</option>
          <option value="rejected">Refusés</option>
        </select>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Aucune entreprise trouvée</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Entreprise', 'Email', 'Type', 'Statut', 'Utilisateurs', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link to={`/admin/companies/${c.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{c.email}</td>
                    <td className="py-3 px-4 text-gray-500">{c.businessType || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={STATUS_COLORS[c.status]}>{STATUS_LABELS[c.status]}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-center">{c.userCount ?? 0}</td>
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/admin/companies/${c.id}`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Voir"
                        >
                          <Eye size={15} />
                        </Link>
                        {c.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => approveMutation.mutate(c.id)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Approuver"
                              aria-label="Approuver"
                            >
                              <CheckCircle size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectModal({ id: c.id, name: c.name })}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Refuser"
                              aria-label="Refuser"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {c.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => suspendMutation.mutate(c.id)}
                            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                            title="Suspendre"
                            aria-label="Suspendre"
                          >
                            <PauseCircle size={15} />
                          </button>
                        )}
                        {c.status === 'suspended' && (
                          <button
                            type="button"
                            onClick={() => reactivateMutation.mutate(c.id)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Réactiver"
                            aria-label="Réactiver"
                          >
                            <PlayCircle size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {pagination.total} entreprise{pagination.total > 1 ? 's' : ''} • Page {page} sur {pagination.totalPages}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Page précédente"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-40 rounded"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Page suivante"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-40 rounded"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Refuser l'entreprise</h3>
            <p className="text-sm text-gray-500 mb-4">
              Vous allez refuser le compte de <strong>{rejectModal.name}</strong>.
            </p>
            <textarea
              className="input-field h-28 resize-none"
              placeholder="Raison du refus (obligatoire)..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setRejectModal(null)} className="btn-secondary flex-1">
                Annuler
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason })}
                className="btn-danger flex-1"
              >
                {rejectMutation.isPending ? 'En cours...' : 'Refuser'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
