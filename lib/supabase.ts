// lib/supabase.ts — SDK 54 compatible
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

// Las variables EXPO_PUBLIC_* se leen de dos fuentes:
// 1. process.env — funciona en desarrollo con .env local
// 2. Constants.expoConfig?.extra — funciona en builds de EAS
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  (Constants.expoConfig?.extra as any)?.supabaseUrl ?? ''

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  (Constants.expoConfig?.extra as any)?.supabaseAnonKey ?? ''

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    '[Supabase] Variables de entorno no encontradas.\n' +
    'Crea un archivo .env con EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY'
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
  type: string
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

export interface StoreInvitation {
  id: string
  store_id: string
  email: string
  role: 'manager' | 'cashier'
  invited_by: string
  accepted: boolean
  created_at: string
  expires_at: string
}

export interface TeamMember extends Profile {
  // Profile ya tiene id, email, full_name, role, store_id, avatar_url
}