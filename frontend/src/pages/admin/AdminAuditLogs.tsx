import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { AuditLog } from '../../types'

const ACTION_COLORS: Record<string, string> = {
  COMPANY_APPROVED: 'bg-green-100 text-green-700',
  COMPANY_REJECTED: 'bg-red-100 text-red-700',
  COMPANY_SUSPENDED: 'bg-orange-100 text-orange-700',
  COMPANY_REACTIVATED: 'bg-blue-100 text-blue-700',
}

const ACTION_LABELS: Record<string, string> = {
  COMPANY_APPROVED: 'Approuvé',
  COMPANY_REJECTED: 'Refusé',
  COMPANY_SUSPENDED: 'Suspendu',
  COMPANY_REACTIVATED: 'Réactivé',
}

export default function AdminAuditLogs() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => adminApi.getAuditLogs({ limit: 100 }).then(r => r.data.data),
  })

  const logs: AuditLog[] = data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Journaux d'activité</h1>
        <p className="text-gray-500 text-sm mt-1">Historique des actions administratives</p>
      </div>

      <div className="card !p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400">Aucun journal d'activité</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50">
                <div className="w-2 h-2 bg-primary-400 rounded-full mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    {log.companyName && (
                      <span className="text-sm font-medium text-gray-800">{log.companyName}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Par <span className="text-gray-600">{log.userName || 'Système'}</span>
                    {' · '}
                    {new Date(log.createdAt).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
