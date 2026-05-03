// hooks/useExpenses.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
    startOfDay, endOfDay, startOfWeek, endOfWeek,
    startOfMonth, endOfMonth, startOfYear, endOfYear,
    format
} from 'date-fns'

export type ExpenseCategory =
    | 'ingredientes' | 'renta' | 'servicios' | 'nomina'
    | 'equipo' | 'marketing' | 'impuestos' | 'otro'

export interface Expense {
    id: string
    store_id: string
    created_by: string
    amount: number
    category: ExpenseCategory
    description: string
    date: string
    created_at: string
}

export const CATEGORY_INFO: Record<ExpenseCategory, { label: string; emoji: string; color: string }> = {
    ingredientes: { label: 'Ingredientes', emoji: '🧂', color: '#3ECFB2' },
    renta: { label: 'Renta', emoji: '🏠', color: '#F5A623' },
    servicios: { label: 'Servicios', emoji: '⚡', color: '#9898B0' },
    nomina: { label: 'Nómina', emoji: '👥', color: '#F56B5C' },
    equipo: { label: 'Equipo', emoji: '🔧', color: '#4A90D9' },
    marketing: { label: 'Marketing', emoji: '📣', color: '#B06EC6' },
    impuestos: { label: 'Impuestos', emoji: '🧾', color: '#E8A838' },
    otro: { label: 'Otro', emoji: '📦', color: '#6B6B8A' },
}

function getRange(filter: string) {
    const now = new Date()
    switch (filter) {
        case 'day': return { start: startOfDay(now), end: endOfDay(now) }
        case 'week': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
        case 'month': return { start: startOfMonth(now), end: endOfMonth(now) }
        case 'year': return { start: startOfYear(now), end: endOfYear(now) }
        default: return { start: startOfMonth(now), end: endOfMonth(now) }
    }
}

export function useExpenses(filter = 'month') {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const { profile } = useAuth()

    const fetch = useCallback(async () => {
        if (!profile?.store_id) return
        setLoading(true)
        const { start, end } = getRange(filter)
        const { data } = await supabase
            .from('expenses')
            .select('*')
            .eq('store_id', profile.store_id)
            .gte('date', format(start, 'yyyy-MM-dd'))
            .lte('date', format(end, 'yyyy-MM-dd'))
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
        setExpenses((data as Expense[]) ?? [])
        setLoading(false)
    }, [profile?.store_id, filter])

    useEffect(() => { fetch() }, [fetch])

    const total = expenses.reduce((s, e) => s + e.amount, 0)

    const byCategory = Object.keys(CATEGORY_INFO).map(cat => ({
        category: cat as ExpenseCategory,
        total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
        count: expenses.filter(e => e.category === cat).length,
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

    return { expenses, loading, fetch, total, byCategory }
}