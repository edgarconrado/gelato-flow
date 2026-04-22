// lib/supabase.ts — SDK 54 compatible
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase] Faltan variables de entorno.\n' +
    'EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY requeridas.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// ─── Tipos ────────────────────────────────────────────────────

export type UserRole = 'owner' | 'manager' | 'cashier'
export type PaymentMethod = 'cash' | 'card' | 'transfer'
export type DateFilter = 'day' | 'week' | 'month' | 'year'

export interface Store {
  id: string
  name: string
  address: string | null
  phone: string | null
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  store_id: string
  store?: Store
}

export interface Category {
  id: string
  store_id: string
  name: string
  emoji: string
  sort_order: number
}

export interface Product {
  id: string
  store_id: string
  name: string
  type: string          // legacy — se mantiene por compatibilidad
  category_id: string | null
  category?: Category
  price: number
  stock: number
  active: boolean
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface Sale {
  id: string
  store_id: string
  cashier_id: string | null
  cashier?: Pick<Profile, 'full_name' | 'email'>
  total: number
  payment_method: PaymentMethod
  created_at: string
  sale_items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  product?: Pick<Product, 'id' | 'name' | 'type' | 'category_id'>
}

export interface CartItem {
  product: Product
  quantity: number
}