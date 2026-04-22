// store/index.ts  —  Zustand v5
// Solo gestiona el CarritoStore (POS).
// La autenticación y el profile/store_id se manejan en context/AuthContext.tsx
import { create } from 'zustand'
import { supabase, Product, CartItem, PaymentMethod } from '../lib/supabase'

// ─── Cart Store (Punto de Venta) ──────────────────────────────────────────────

interface CartState {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: () => number
  checkout: (
    storeId: string,
    cashierId: string,
    paymentMethod: PaymentMethod
  ) => Promise<{ error: string | null; saleId: string | null }>
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product) => {
    const existing = get().items.find(i => i.product.id === product.id)
    if (existing) {
      set({
        items: get().items.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      })
    } else {
      set({ items: [...get().items, { product, quantity: 1 }] })
    }
  },

  removeItem: (productId) =>
    set({ items: get().items.filter(i => i.product.id !== productId) }),

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }
    set({
      items: get().items.map(i =>
        i.product.id === productId ? { ...i, quantity } : i
      ),
    })
  },

  clearCart: () => set({ items: [] }),

  total: () =>
    get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

  // Ahora recibe storeId y cashierId como parámetros explícitos
  // en lugar de leerlos del AuthStore
  checkout: async (storeId, cashierId, paymentMethod) => {
    const { items, total, clearCart } = get()
    if (items.length === 0) {
      return { error: 'El carrito está vacío', saleId: null }
    }

    // 1. Registrar la venta
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        store_id: storeId,
        cashier_id: cashierId,
        total: total(),
        payment_method: paymentMethod,
      })
      .select()
      .single()

    if (saleError) return { error: saleError.message, saleId: null }

    // 2. Registrar los items de la venta
    const saleItems = items.map(i => ({
      sale_id: sale.id,
      product_id: i.product.id,
      quantity: i.quantity,
      unit_price: i.product.price,
    }))

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems)

    if (itemsError) return { error: itemsError.message, saleId: null }

    // 3. Decrementar stock usando RPC
    for (const item of items) {
      await supabase.rpc('decrement_stock', {
        p_product_id: item.product.id,
        p_quantity: item.quantity,
      })
    }

    clearCart()
    return { error: null, saleId: sale.id }
  },
}))