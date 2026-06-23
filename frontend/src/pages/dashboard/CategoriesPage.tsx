import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { categoriesApi } from '../../api/categories'
import type { Category } from '../../types'
import toast from 'react-hot-toast'

const PRESET_COLORS = [
  '#16a34a', '#2563eb', '#dc2626', '#d97706', '#7c3aed',
  '#db2777', '#0891b2', '#65a30d', '#ea580c', '#6b7280',
]

interface CategoryFormState {
  name: string
  description: string
  color: string
}

const EMPTY_FORM: CategoryFormState = { name: '', description: '', color: '#16a34a' }

export default function CategoriesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; category?: Category } | null>(null)
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then(r => r.data.data),
  })

  const categories: Category[] = data ?? []

  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] })

  const createMutation = useMutation({
    mutationFn: (d: CategoryFormState) => categoriesApi.create(d),
    onSuccess: () => { toast.success('Catégorie créée'); closeModal(); invalidate() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erreur'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: CategoryFormState }) => categoriesApi.update(id, d),
    onSuccess: () => { toast.success('Catégorie modifiée'); closeModal(); invalidate() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => { toast.success('Catégorie supprimée'); setDeleteTarget(null); invalidate() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erreur'),
  })

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setModal({ mode: 'create' })
  }

  const openEdit = (cat: Category) => {
    setForm({ name: cat.name, description: cat.description ?? '', color: cat.color })
    setModal({ mode: 'edit', category: cat })
  }

  const closeModal = () => setModal(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (modal?.mode === 'edit' && modal.category) {
      updateMutation.mutate({ id: modal.category.id, d: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catégories</h1>
          <p className="text-gray-500 text-sm mt-1">Organisez vos produits par catégorie</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nouvelle catégorie
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="card text-center py-16">
          <Tag size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune catégorie</p>
          <p className="text-gray-400 text-sm mt-1">Créez votre première catégorie pour organiser vos produits.</p>
          <button type="button" onClick={openCreate} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> Créer une catégorie
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="card flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: cat.color + '20' }}
                >
                  <Tag size={18} style={{ color: cat.color }} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{cat.name}</p>
                  {cat.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{cat.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {cat.product_count} produit{cat.product_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  title="Modifier"
                  aria-label="Modifier"
                  onClick={() => openEdit(cat)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  title="Supprimer"
                  aria-label="Supprimer"
                  onClick={() => setDeleteTarget(cat)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal créer / modifier */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {modal.mode === 'create' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  className="input-field"
                  placeholder="Ex: Alimentation, Électronique..."
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  className="input-field"
                  placeholder="Description optionnelle..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        form.color === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Couleur ${c}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-8 h-8 rounded-full border-0 cursor-pointer"
                    title="Couleur personnalisée"
                  />
                </div>
              </div>

              {/* Aperçu */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: form.color + '20' }}
                >
                  <Tag size={16} style={{ color: form.color }} />
                </div>
                <span className="font-medium text-gray-800 text-sm">
                  {form.name || 'Aperçu de la catégorie'}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={isPending || !form.name.trim()} className="btn-primary flex-1">
                  {isPending ? 'Enregistrement...' : modal.mode === 'create' ? 'Créer' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Supprimer la catégorie</h3>
            <p className="text-sm text-gray-500 mb-1">
              Voulez-vous supprimer <strong>"{deleteTarget.name}"</strong> ?
            </p>
            {deleteTarget.product_count > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
                ⚠️ {deleteTarget.product_count} produit(s) associé(s) seront détachés de cette catégorie.
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">
                Annuler
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="btn-danger flex-1"
              >
                {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
