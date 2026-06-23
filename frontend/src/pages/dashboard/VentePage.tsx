import { useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, X } from 'lucide-react'
import { productsApi } from '../../api/products'
import { salesApi, cartToPayload } from '../../api/sales'
import type { Product, CartItem } from '../../types'
import toast from 'react-hot-toast'

const PAYMENT_METHODS = [
  { value: 'cash', label: '💵 Espèces' },
  { value: 'mobile_money', label: '📱 Mobile Money' },
  { value: 'card', label: '💳 Carte bancaire' },
  { value: 'credit', label: '🤝 Crédit client' },
]

function formatPrice(amount: number) {
  return new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF', maximumFractionDigits: 0 }).format(amount)
}

export default function VentePage() {
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [discount, setDiscount] = useState(0)
  const [note, setNote] = useState('')
  const [success, setSuccess] = useState<{ id: string; total: number } | null>(null)

  // Recherche produits en temps réel
  const { data, isLoading: searchLoading } = useQuery({
    queryKey: ['products-search', search],
    queryFn: () =>
      productsApi.getAll({ search, active_only: true, limit: 30 }).then(r => r.data.data.products),
    enabled: true,
  })

  const products: Product[] = data ?? []

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id)
      if (existing) {
        return prev.map(c =>
          c.product.id === product.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      }
      return [...prev, { product, quantity: 1, unit_price: product.price }]
    })
  }, [])

  const updateQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(c => c.product.id === productId ? { ...c, quantity: c.quantity + delta } : c)
        .filter(c => c.quantity > 0)
    )
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(c => c.product.id !== productId))
  }

  const subtotal = cart.reduce((sum, c) => sum + c.unit_price * c.quantity, 0)
  const total = Math.max(0, subtotal - discount)

  const saleMutation = useMutation({
    mutationFn: () =>
      salesApi.create({
        items: cartToPayload(cart),
        payment_method: paymentMethod,
        discount,
        note: note || undefined,
      }),
    onSuccess: ({ data }) => {
      setSuccess(data.data)
      setCart([])
      setDiscount(0)
      setNote('')
      setSearch('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erreur lors de la vente'),
  })

  const resetSuccess = () => setSuccess(null)

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-16">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle size={44} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Vente enregistrée !</h2>
        <p className="text-gray-500">Total encaissé : <strong className="text-gray-900">{formatPrice(success.total)}</strong></p>
        <button type="button" onClick={resetSuccess} className="btn-primary mt-2">
          Nouvelle vente
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">

      {/* Colonne gauche — recherche + liste produits */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle vente</h1>
          <p className="text-gray-500 text-sm mt-1">Recherchez un produit et ajoutez-le au panier</p>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            className="input-field pl-10 py-3 text-base"
            placeholder="Rechercher par nom ou code-barres..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Liste produits */}
        <div className="flex-1 overflow-y-auto">
          {searchLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {search ? `Aucun produit trouvé pour "${search}"` : 'Aucun produit disponible'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {products.map(p => {
                const inCart = cart.find(c => c.product.id === p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    disabled={p.stock === 0}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      p.stock === 0
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : inCart
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-100 bg-white hover:border-primary-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                        {p.category_name && (
                          <span
                            className="inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: (p.category_color ?? '#16a34a') + '20', color: p.category_color ?? '#16a34a' }}
                          >
                            {p.category_name}
                          </span>
                        )}
                      </div>
                      {inCart && (
                        <span className="shrink-0 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {inCart.quantity}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-primary-600 font-bold text-sm">{formatPrice(p.price)}</p>
                      <p className={`text-xs ${p.stock <= 5 ? 'text-amber-600' : 'text-gray-400'}`}>
                        Stock: {p.stock} {p.unit}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Colonne droite — panier */}
      <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
        <div className="card flex flex-col gap-0 !p-0 overflow-hidden">
          {/* En-tête panier */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <ShoppingCart size={18} className="text-gray-600" />
            <span className="font-semibold text-gray-800">Panier</span>
            {cart.length > 0 && (
              <span className="ml-auto text-xs bg-primary-500 text-white rounded-full px-2 py-0.5">
                {cart.reduce((s, c) => s + c.quantity, 0)} article(s)
              </span>
            )}
          </div>

          {/* Articles */}
          <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-gray-50">
            {cart.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Le panier est vide</p>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-400">{formatPrice(item.unit_price)} / {item.product.unit}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQty(item.product.id, -1)}
                      className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                      aria-label="Diminuer"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.product.id, 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-40 transition-colors"
                      aria-label="Augmenter"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 w-20 text-right shrink-0">
                    {formatPrice(item.unit_price * item.quantity)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                    aria-label="Retirer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Récapitulatif */}
          <div className="border-t border-gray-100 p-4 space-y-3">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Sous-total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 shrink-0">Remise (GNF)</label>
              <input
                type="number"
                min={0}
                max={subtotal}
                value={discount || ''}
                onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="input-field text-right py-1 text-sm"
                placeholder="0"
              />
            </div>

            <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-3">
              <span>Total</span>
              <span className="text-primary-600">{formatPrice(total)}</span>
            </div>

            {/* Moyen de paiement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Paiement</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${
                      paymentMethod === m.value
                        ? 'bg-primary-50 border-primary-500 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              className="input-field text-sm"
              placeholder="Note (optionnel)..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />

            <button
              type="button"
              disabled={cart.length === 0 || saleMutation.isPending}
              onClick={() => saleMutation.mutate()}
              className="btn-primary w-full py-3 text-base"
            >
              {saleMutation.isPending ? 'Enregistrement...' : `Valider la vente — ${formatPrice(total)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
