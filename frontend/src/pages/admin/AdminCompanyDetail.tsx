import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, XCircle, PauseCircle, PlayCircle, Mail, Phone, MapPin, Building2 } from 'lucide-react'
import { adminApi } from '../../api/admin'
import toast from 'react-hot-toast'
import type { User } from '../../types'

interface CompanyUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: User['role']
  isActive: boolean
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'badge-pending',
  active: 'badge-active',
  rejected: 'badge-rejected',
  suspended: 'badge-suspended',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente de validation',
  active: 'Compte actif',
  rejected: 'Compte refusé',
  suspended: 'Compte suspendu',
}
const ROLE_LABELS: Record<string, string> = {
  company_owner: 'Propriétaire',
  manager: 'Manager',
  cashier: 'Caissier',
  employee: 'Employé',
  viewer: 'Lecteur',
}

export default function AdminCompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-company', id],
    queryFn: () => adminApi.getCompany(id!).then(r => r.data.data),
    enabled: !!id,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-company', id] })
    qc.invalidateQueries({ queryKey: ['admin-companies'] })
    qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
  }

  const approveMutation = useMutation({
    mutationFn: () => adminApi.approveCompany(id!),
    onSuccess: () => { toast.success('Entreprise approuvée !'); invalidate() },
    onError: () => toast.error('Erreur lors de l\'approbation'),
  })

  const rejectMutation = useMutation({
    mutationFn: () => adminApi.rejectCompany(id!, rejectReason),
    onSuccess: () => { toast.success('Entreprise refusée'); setShowRejectModal(false); invalidate() },
    onError: () => toast.error('Erreur lors du refus'),
  })

  const suspendMutation = useMutation({
    mutationFn: () => adminApi.suspendCompany(id!),
    onSuccess: () => { toast.success('Entreprise suspendue'); invalidate() },
    onError: () => toast.error('Erreur lors de la suspension'),
  })

  const reactivateMutation = useMutation({
    mutationFn: () => adminApi.reactivateCompany(id!),
    onSuccess: () => { toast.success('Entreprise réactivée'); invalidate() },
    onError: () => toast.error('Erreur lors de la réactivation'),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-center text-gray-500 py-16">Entreprise introuvable</div>
  }

  const company = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Retour à la liste"
          onClick={() => navigate('/admin/companies')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
          <span className={`mt-1 ${STATUS_COLORS[company.status]}`}>{STATUS_LABELS[company.status]}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {company.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <CheckCircle size={16} />
                Approuver
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                className="btn-danger flex items-center gap-2"
              >
                <XCircle size={16} />
                Refuser
              </button>
            </>
          )}
          {company.status === 'active' && (
            <button
              type="button"
              onClick={() => suspendMutation.mutate()}
              disabled={suspendMutation.isPending}
              className="btn-secondary flex items-center gap-2 text-orange-600 border-orange-300"
            >
              <PauseCircle size={16} />
              Suspendre
            </button>
          )}
          {company.status === 'suspended' && (
            <button
              type="button"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              <PlayCircle size={16} />
              Réactiver
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Informations de l'entreprise</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={Building2} label="Nom" value={company.name} />
              <InfoRow icon={Mail} label="Email" value={company.email} />
              <InfoRow icon={Phone} label="Téléphone" value={company.phone || '—'} />
              <InfoRow icon={MapPin} label="Ville" value={company.city || '—'} />
              <InfoRow icon={Building2} label="Type de commerce" value={company.business_type || '—'} />
              <InfoRow icon={MapPin} label="Adresse" value={company.address || '—'} />
            </div>
          </div>

          {/* Users list */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">
              Utilisateurs ({company.users?.length ?? 0})
            </h2>
            {!company.users?.length ? (
              <p className="text-gray-400 text-sm">Aucun utilisateur</p>
            ) : (
              <div className="space-y-2">
                {company.users.map((u: CompanyUser) => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{ROLE_LABELS[u.role] ?? u.role}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Détails du compte</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium capitalize">{company.subscription_plan || 'free'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Inscrit le</span>
                <span className="font-medium">{new Date(company.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              {company.validated_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Validé le</span>
                  <span className="font-medium">{new Date(company.validated_at).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
              {company.rejection_reason && (
                <div>
                  <span className="text-gray-500 block mb-1">Raison du refus :</span>
                  <p className="text-red-600 text-xs bg-red-50 p-2 rounded">{company.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Refuser le compte</h3>
            <p className="text-sm text-gray-500 mb-4">
              Indiquez la raison du refus pour <strong>{company.name}</strong>.
            </p>
            <textarea
              className="input-field h-28 resize-none"
              placeholder="Raison du refus (obligatoire)..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate()}
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

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-800 font-medium">{value}</p>
      </div>
    </div>
  )
}
