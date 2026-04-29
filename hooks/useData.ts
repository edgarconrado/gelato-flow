// hooks/useData.ts — con Supabase Realtime corregido
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, Product, Category, Sale, DateFilter } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { startOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns'

// ── Helper: canal realtime con nombre único por instancia ─────
function useRealtimeTable(
  table: string,
  storeId: string | undefined,
  onchange: () => void
) {
  // Guardar la función en un ref para evitar re-suscripciones por cambios de closure
  const onchangeRef = useRef(onchange)
  onchangeRef.current = onchange

  useEffect(() => {
    if (!storeId) return

    // Nombre único por instancia — evita colisión entre hooks del mismo componente
    const channelName = `${table}-${storeId}-${Math.random().toString(36).slice(2)}`

    // IMPORTANTE: .on() SIEMPRE antes de .subscribe()
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table,
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          console.log(`[Realtime] ${table} changed, refreshing...`)
          onchangeRef.current()
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Listening to ${table}`)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, storeId]) // No incluir onchange — usamos ref
}

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
  useRealtimeTable('categories', profile?.store_id, fetch)

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
    if (categoryId) query = query.eq('category_id', categoryId)
    const { data } = await query
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }, [profile?.store_id, categoryId])

  useEffect(() => { fetch() }, [fetch])
  useRealtimeTable('products', profile?.store_id, fetch)

  return { products, loading, refetch: fetch }
}

// ─── useAllProducts ───────────────────────────────────────────

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
  useRealtimeTable('products', profile?.store_id, fetch)

  return { products, loading, refetch: fetch }
}

// ─── useSalesReport ───────────────────────────────────────────

export function useSalesReport(filter: DateFilter) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  const fetch = useCallback(async () => {
    if (!profile?.store_id) return
    setLoading(true)

    const now = new Date()
    const start = {
      day: startOfDay(now),
      week: startOfWeek(now, { weekStartsOn: 1 }),
      month: startOfMonth(now),
      year: startOfYear(now),
    }[filter]

    const { data: sales } = await supabase
      .from('sales')
      .select('*, sale_items(*, product:products(name))')
      .eq('store_id', profile.store_id)
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: false })

    if (!sales) { setLoading(false); return }

    const total = sales.reduce((s: number, sale: any) => s + sale.total, 0)
    const count = sales.length

    const byDayMap: Record<string, number> = {}
    sales.forEach((sale: any) => {
      const day = format(new Date(sale.created_at), 'yyyy-MM-dd')
      byDayMap[day] = (byDayMap[day] ?? 0) + sale.total
    })
    const byDay = Object.entries(byDayMap)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)

    const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
    sales.forEach((sale: any) => {
      ; (sale.sale_items ?? []).forEach((item: any) => {
        const name = item.product?.name ?? 'Producto'
        if (!productMap[name]) productMap[name] = { name, quantity: 0, revenue: 0 }
        productMap[name].quantity += item.quantity
        productMap[name].revenue += item.subtotal
      })
    })
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    setData({ total, count, byDay, topProducts, recentSales: sales.slice(0, 20) })
    setLoading(false)
  }, [profile?.store_id, filter])

  useEffect(() => { fetch() }, [fetch])
  useRealtimeTable('sales', profile?.store_id, fetch)

  return { data, loading, refetch: fetch }
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
      .select('*, sale_items(*, product:products(name, category:categories(emoji)))')
      .eq('id', saleId)
      .single()
      .then(({ data }) => {
        setSale(data as Sale)
        setLoading(false)
      })
  }, [saleId])

  return { sale, loading }
}