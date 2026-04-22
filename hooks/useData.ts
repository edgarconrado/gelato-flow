// hooks/useData.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase, Product, Category, Sale, DateFilter } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { startOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns'

// ─── useCategories ────────────────────────────────────────────

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  const fetch = useCallback(async () => {
    if (!profile?.store_id) return
    setLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', profile.store_id)
      .order('sort_order')
    setCategories((data as Category[]) ?? [])
    setLoading(false)
  }, [profile?.store_id])

  useEffect(() => { fetch() }, [fetch])
  return { categories, loading, refetch: fetch }
}

// ─── useProducts ──────────────────────────────────────────────

export function useProducts(categoryId?: string | null) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  const fetch = useCallback(async () => {
    if (!profile?.store_id) return
    setLoading(true)

    let query = supabase
      .from('products')
      .select('*, category:categories(id,name,emoji,sort_order)')
      .eq('store_id', profile.store_id)
      .eq('active', true)
      .order('name')

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data } = await query
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }, [profile?.store_id, categoryId])

  useEffect(() => { fetch() }, [fetch])
  return { products, loading, refetch: fetch }
}

// ─── useAllProducts (para inventario, sin filtro activo) ──────

export function useAllProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  const fetch = useCallback(async () => {
    if (!profile?.store_id) return
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(id,name,emoji,sort_order)')
      .eq('store_id', profile.store_id)
      .order('name')
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }, [profile?.store_id])

  useEffect(() => { fetch() }, [fetch])
  return { products, loading, refetch: fetch }
}

// ─── useSalesReport ───────────────────────────────────────────

export interface ReportData {
  total: number
  count: number
  byDay: { date: string; total: number }[]
  topProducts: { name: string; quantity: number; revenue: number }[]
  recentSales: Sale[]
}

export function useSalesReport(filter: DateFilter) {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  const getStartDate = (): string => {
    const now = new Date()
    switch (filter) {
      case 'day': return startOfDay(now).toISOString()
      case 'week': return startOfWeek(now, { weekStartsOn: 1 }).toISOString()
      case 'month': return startOfMonth(now).toISOString()
      case 'year': return startOfYear(now).toISOString()
    }
  }

  useEffect(() => {
    if (!profile?.store_id) return

    const load = async () => {
      setLoading(true)

      const { data: sales } = await supabase
        .from('sales')
        .select(`
          id, total, created_at, payment_method, cashier_id,
          cashier:profiles!cashier_id (full_name, email),
          sale_items (
            id, quantity, unit_price, subtotal,
            product:products (id, name, type, category_id)
          )
        `)
        .eq('store_id', profile.store_id)
        .gte('created_at', getStartDate())
        .order('created_at', { ascending: false })

      if (!sales) { setLoading(false); return }

      const total = (sales as Sale[]).reduce((s, sale) => s + sale.total, 0)
      const count = sales.length

      // Agrupar por día para gráfica
      const dayMap = new Map<string, number>()
      for (const sale of sales as Sale[]) {
        const key = format(new Date(sale.created_at), 'yyyy-MM-dd')
        dayMap.set(key, (dayMap.get(key) ?? 0) + sale.total)
      }
      const byDay = Array.from(dayMap.entries())
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Top productos
      const productMap = new Map<string, { quantity: number; revenue: number }>()
      for (const sale of sales as Sale[]) {
        for (const item of sale.sale_items ?? []) {
          const name = item.product?.name ?? 'Desconocido'
          const prev = productMap.get(name) ?? { quantity: 0, revenue: 0 }
          productMap.set(name, {
            quantity: prev.quantity + item.quantity,
            revenue: prev.revenue + item.subtotal,
          })
        }
      }
      const topProducts = Array.from(productMap.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      setData({
        total,
        count,
        byDay,
        topProducts,
        recentSales: sales as Sale[],
      })
      setLoading(false)
    }

    load()
  }, [profile?.store_id, filter])

  return { data, loading }
}

// ─── useSaleDetail ────────────────────────────────────────────

export function useSaleDetail(saleId: string | null) {
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!saleId) { setSale(null); return }
    setLoading(true)
    supabase
      .from('sales')
      .select(`
        id, total, created_at, payment_method,
        cashier:profiles!cashier_id (full_name, email),
        sale_items (
          id, quantity, unit_price, subtotal,
          product:products (id, name, type, category_id)
        )
      `)
      .eq('id', saleId)
      .single()
      .then(({ data }) => {
        setSale(data as Sale ?? null)
        setLoading(false)
      })
  }, [saleId])

  return { sale, loading }
}