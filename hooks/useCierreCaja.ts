// hooks/useCierreCaja.ts
// Datos del cierre de caja del día actual
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { startOfDay, endOfDay, format } from 'date-fns'
import { es } from 'date-fns/locale'

export interface CierreCajaData {
    fecha: string
    totalGeneral: number
    totalVentas: number
    ticketPromedio: number
    porMetodo: {
        cash: { total: number; count: number }
        card: { total: number; count: number }
        transfer: { total: number; count: number }
    }
    productoTop: { name: string; quantity: number; revenue: number } | null
    horaPico: string | null  // La hora con más ventas
    primerVenta: string | null
    ultimaVenta: string | null
}

export function useCierreCaja(date: Date = new Date()) {
    const [data, setData] = useState<CierreCajaData | null>(null)
    const [loading, setLoading] = useState(false)
    const { profile } = useAuth()

    const fetch = useCallback(async () => {
        if (!profile?.store_id) return
        setLoading(true)

        const inicio = startOfDay(date).toISOString()
        const fin = endOfDay(date).toISOString()

        const { data: sales, error } = await supabase
            .from('sales')
            .select('*, sale_items(*, product:products(name))')
            .eq('store_id', profile.store_id)
            .gte('created_at', inicio)
            .lte('created_at', fin)
            .order('created_at', { ascending: true })

        if (error || !sales) { setLoading(false); return }

        const totalGeneral = sales.reduce((s: number, v: any) => s + v.total, 0)
        const totalVentas = sales.length
        const ticketPromedio = totalVentas > 0 ? totalGeneral / totalVentas : 0

        // Totales por método de pago
        const porMetodo = {
            cash: { total: 0, count: 0 },
            card: { total: 0, count: 0 },
            transfer: { total: 0, count: 0 },
        }
        sales.forEach((v: any) => {
            const m = v.payment_method as keyof typeof porMetodo
            if (porMetodo[m]) {
                porMetodo[m].total += v.total
                porMetodo[m].count += 1
            }
        })

        // Producto más vendido del día
        const prodMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
        sales.forEach((v: any) => {
            ; (v.sale_items ?? []).forEach((item: any) => {
                const name = item.product?.name ?? 'Producto'
                if (!prodMap[name]) prodMap[name] = { name, quantity: 0, revenue: 0 }
                prodMap[name].quantity += item.quantity
                prodMap[name].revenue += item.subtotal ?? (item.unit_price * item.quantity)
            })
        })
        const productoTop = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue)[0] ?? null

        // Hora pico (con más ventas)
        const horaMap: Record<string, number> = {}
        sales.forEach((v: any) => {
            const hora = format(new Date(v.created_at), 'HH')
            horaMap[hora] = (horaMap[hora] ?? 0) + 1
        })
        const horaPico = Object.entries(horaMap).sort((a, b) => b[1] - a[1])[0]?.[0]
        const horaPicoLabel = horaPico ? `${horaPico}:00 – ${horaPico}:59` : null

        setData({
            fecha: format(date, "EEEE d 'de' MMMM yyyy", { locale: es }),
            totalGeneral,
            totalVentas,
            ticketPromedio,
            porMetodo,
            productoTop,
            horaPico: horaPicoLabel,
            primerVenta: sales.length > 0 ? format(new Date(sales[0].created_at), 'HH:mm') : null,
            ultimaVenta: sales.length > 0 ? format(new Date(sales[sales.length - 1].created_at), 'HH:mm') : null,
        })
        setLoading(false)
    }, [profile?.store_id, date])

    return { data, loading, fetch }
}