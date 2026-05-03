// hooks/useData.ts — con Realtime + comparativa de períodos
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, Product, Category, Sale, DateFilter } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  startOfDay, startOfWeek, startOfMonth, startOfYear,
  subDays, subWeeks, subMonths, subYears,
  endOfDay, endOfWeek, endOfMonth, endOfYear,
  format,
} from 'date-fns'

function useRealtimeTable(table: string, storeId: string | undefined, onchange: () => void) {
  const onchangeRef = useRef(onchange)
  onchangeRef.current = onchange

  useEffect(() => {
    if (!storeId) return
    const channelName = `${table}-${storeId}-${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes' as any, {
        event: '*', schema: 'public', table,
        filter: `store_id=eq.${storeId}`,
      }, () => { onchangeRef.current() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [table, storeId])
}

// ── Helpers de rango de fechas ─────────────────────────────────

function getCurrentRange(filter: DateFilter, now = new Date()) {
  switch (filter) {
    case 'day': return { start: startOfDay(now), end: endOfDay(now) }
    case 'week': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'month': return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'year': return { start: startOfYear(now), end: endOfYear(now) }
  }
}

function getPreviousRange(filter: DateFilter, now = new Date()) {
  switch (filter) {
    case 'day': return getCurrentRange('day', subDays(now, 1))
    case 'week': return getCurrentRange('week', subWeeks(now, 1))
    case 'month': return getCurrentRange('month', subMonths(now, 1))
    case 'year': return getCurrentRange('year', subYears(now, 1))
  }
}

function getPreviousLabel(filter: DateFilter) {
  return { day: 'ayer', week: 'semana pasada', month: 'mes pasado', year: 'año pasado' }[filter]
}

async function fetchSalesInRange(storeId: string, start: Date, end: Date) {
  const { data } = await supabase
    .from('sales')
    .select('total, created_at, payment_method, sale_items(quantity, subtotal, product:products(name))')
    .eq('store_id', storeId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true })
  return (data ?? []) as any[]
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
      .from('categories').select('*')
      .eq('store_id', profile.store_id).order('sort_order')
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
      .eq('store_id', profile.store_id).eq('active', true).order('name')
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
      .eq('store_id', profile.store_id).order('name')
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }, [profile?.store_id])

  useEffect(() => { fetch() }, [fetch])
  useRealtimeTable('products', profile?.store_id, fetch)
  return { products, loading, refetch: fetch }
}

// ─── useSalesReport — con comparativa ────────────────────────

export interface PeriodComparison {
  currentTotal: number
  previousTotal: number
  currentCount: number
  previousCount: number
  pctChangeTotal: number   // % cambio en ingresos
  pctChangeCount: number   // % cambio en número de ventas
  previousLabel: string
}

export function useSalesReport(filter: DateFilter) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  const fetch = useCallback(async () => {
    if (!profile?.store_id) return
    setLoading(true)

    const now = new Date()
    const current = getCurrentRange(filter, now)
    const previous = getPreviousRange(filter, now)

    // Fetch ambos períodos en paralelo
    const [currentSales, previousSales] = await Promise.all([
      fetchSalesInRange(profile.store_id, current.start, current.end),
      fetchSalesInRange(profile.store_id, previous.start, previous.end),
    ])

    // ── Métricas período actual ───────────────────────────────
    const total = currentSales.reduce((s: number, v: any) => s + v.total, 0)
    const count = currentSales.length
    const ticketPromedio = count > 0 ? total / count : 0

    // ── Métricas período anterior ─────────────────────────────
    const prevTotal = previousSales.reduce((s: number, v: any) => s + v.total, 0)
    const prevCount = previousSales.length

    const pctChangeTotal = prevTotal > 0
      ? ((total - prevTotal) / prevTotal) * 100
      : total > 0 ? 100 : 0
    const pctChangeCount = prevCount > 0
      ? ((count - prevCount) / prevCount) * 100
      : count > 0 ? 100 : 0

    const comparison: PeriodComparison = {
      currentTotal: total,
      previousTotal: prevTotal,
      currentCount: count,
      previousCount: prevCount,
      pctChangeTotal,
      pctChangeCount,
      previousLabel: getPreviousLabel(filter),
    }

    // ── Ventas por día (para gráfica de tendencia) ───────────
    // Incluye los dos períodos para mostrar tendencia comparativa
    const buildDayMap = (sales: any[]) => {
      const map: Record<string, number> = {}
      sales.forEach((v: any) => {
        const day = format(new Date(v.created_at), 'yyyy-MM-dd')
        map[day] = (map[day] ?? 0) + v.total
      })
      return map
    }

    const currentDayMap = buildDayMap(currentSales)
    const previousDayMap = buildDayMap(previousSales)

    // Normalizar días para comparativa (día 1, día 2, etc.)
    const trendData = Array.from({ length: filter === 'day' ? 24 : filter === 'week' ? 7 : filter === 'month' ? 30 : 12 }, (_, i) => {
      let label = ''
      let currentVal = 0
      let previousVal = 0

      if (filter === 'week') {
        const curDay = format(new Date(current.start.getTime() + i * 86400000), 'yyyy-MM-dd')
        const prevDay = format(new Date(previous.start.getTime() + i * 86400000), 'yyyy-MM-dd')
        label = format(new Date(current.start.getTime() + i * 86400000), 'EEE')
        currentVal = currentDayMap[curDay] ?? 0
        previousVal = previousDayMap[prevDay] ?? 0
      } else if (filter === 'month') {
        const curDay = format(new Date(current.start.getFullYear(), current.start.getMonth(), i + 1), 'yyyy-MM-dd')
        const prevDay = format(new Date(previous.start.getFullYear(), previous.start.getMonth(), i + 1), 'yyyy-MM-dd')
        label = String(i + 1)
        currentVal = currentDayMap[curDay] ?? 0
        previousVal = previousDayMap[prevDay] ?? 0
      } else if (filter === 'year') {
        const curDay = format(new Date(current.start.getFullYear(), i, 1), 'yyyy-MM-dd').slice(0, 7)
        const prevDay = format(new Date(previous.start.getFullYear(), i, 1), 'yyyy-MM-dd').slice(0, 7)
        label = format(new Date(2024, i, 1), 'MMM')
        currentVal = Object.entries(currentDayMap).filter(([k]) => k.startsWith(curDay)).reduce((s, [, v]) => s + v, 0)
        previousVal = Object.entries(previousDayMap).filter(([k]) => k.startsWith(prevDay)).reduce((s, [, v]) => s + v, 0)
      } else {
        label = `${i}h`
        currentVal = 0
        previousVal = 0
      }

      return { label, currentVal, previousVal }
    }).filter(d => d.label !== '')

    // ── Por día simple (para gráfica original) ────────────────
    const byDay = Object.entries(currentDayMap)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)

    // ── Top productos ─────────────────────────────────────────
    const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
    currentSales.forEach((v: any) => {
      ; (v.sale_items ?? []).forEach((item: any) => {
        const name = item.product?.name ?? 'Producto'
        if (!productMap[name]) productMap[name] = { name, quantity: 0, revenue: 0 }
        productMap[name].quantity += item.quantity
        productMap[name].revenue += item.subtotal ?? 0
      })
    })
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue).slice(0, 5)

    setData({
      total, count, ticketPromedio,
      byDay, topProducts,
      recentSales: currentSales.slice().reverse().slice(0, 20),
      comparison,
      trendData,
    })
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
      .eq('id', saleId).single()
      .then(({ data }) => { setSale(data as Sale); setLoading(false) })
  }, [saleId])

  return { sale, loading }
}