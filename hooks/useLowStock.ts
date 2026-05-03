// hooks/useLowStock.ts
import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export interface LowStockProduct {
    id: string
    name: string
    stock: number
    min_stock: number
    price: number
    image_url: string | null
    category_name: string | null
    category_emoji: string | null
    units_below_threshold: number
}

export function useLowStock() {
    const [products, setProducts] = useState<LowStockProduct[]>([])
    const [loading, setLoading] = useState(true)
    const { profile } = useAuth()

    const fetch = useCallback(async () => {
        if (!profile?.store_id) return
        setLoading(true)
        const { data } = await supabase
            .from('low_stock_products')
            .select('*')
            .eq('store_id', profile.store_id)
        setProducts((data as LowStockProduct[]) ?? [])
        setLoading(false)
    }, [profile?.store_id])

    useEffect(() => { fetch() }, [fetch])

    return { products, loading, refetch: fetch, count: products.length }
}