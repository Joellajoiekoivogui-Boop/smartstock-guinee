import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, TrendingUp } from 'lucide-react'
import { authApi } from '../../api/auth'
import toast from 'react-hot-toast'

const businessTypes = [
  'Boutique générale', 'Alimentation / Épicerie', 'Pharmacie', 'Électronique',
  'Vêtements / Mode', 'Matériaux de construction', 'Restaurant / Traiteur',
  'Quincaillerie', 'Cosmétiques', 'Autre',
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    companyName: '', ownerFirstName: '', ownerLastName: '',
    email: '', password: '', confirmPassword: '',
    phone: '', address: '', city: '', businessType: '',
  })

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      const { data } = await authApi.register({
        companyName: form.companyName,
        ownerFirstName: form.ownerFirstName,
        ownerLastName: form.ownerLastName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        address: form.address,
        city: form.city,
        businessType: form.businessType,
      })
      if (data.success) {
        toast.success('Compte créé ! En attente de validation par l\'administrateur.')
        navigate('/login')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erreur lors de l\'inscription'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-500 rounded-2xl mb-3 shadow-lg">
            <TrendingUp className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white">SmartStock Guinée</h1>
          <p className="text-gray-400 text-sm mt-1">Créer le compte de votre entreprise</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-primary-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          <p className="text-xs text-gray-500 mb-6">Étape {step} sur 2</p>

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2) } : handleSubmit}>
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Informations de l'entreprise</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise *</label>
                  <input
                    className="input-field"
                    value={form.companyName}
                    onChange={e => update('companyName', e.target.value)}
                    placeholder="Ex: Boutique Mamadou & Frères"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                    <input className="input-field" value={form.city} onChange={e => update('city', e.target.value)} placeholder="Conakry" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input className="input-field" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+224 000 000 000" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de commerce</label>
                  <select className="input-field" value={form.businessType} onChange={e => update('businessType', e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {businessTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input className="input-field" value={form.address} onChange={e => update('address', e.target.value)} placeholder="Quartier, rue..." />
                </div>
                <button type="submit" className="btn-primary w-full py-2.5">
                  Suivant →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Compte administrateur</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                    <input className="input-field" value={form.ownerFirstName} onChange={e => update('ownerFirstName', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                    <input className="input-field" value={form.ownerLastName} onChange={e => update('ownerLastName', e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" className="input-field" value={form.email} onChange={e => update('email', e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                  <input type="password" className="input-field" value={form.password} onChange={e => update('password', e.target.value)} required minLength={8} />
                  <p className="text-xs text-gray-400 mt-1">Min. 8 caractères, majuscule, minuscule et chiffre</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe *</label>
                  <input type="password" className="input-field" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} required />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 py-2.5">
                    ← Retour
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5">
                    {loading ? 'Création...' : 'Créer le compte'}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Se connecter</Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Votre compte sera activé après validation par un administrateur.
        </p>
      </div>
    </div>
  )
}
