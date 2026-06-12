// hooks/useRealtime.ts
// Hook que gestiona suscripciones de Supabase Realtime de forma eficiente.
// - Un solo canal por store_id (no crea N canales)
// - Se desuscribe automáticamente al desmontar
// - Respeta el store_id — solo escucha eventos de la tienda del usuario

import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'
type TableName = 'products' | 'categories' | 'sales' | 'sale_items'

interface RealtimeSubscription {
    table: TableName
    event?: RealtimeEvent
    onchange: (payload: any) => void
}

export function useRealtime(subscriptions: RealtimeSubscription[]) {
    const { profile } = useAuth()
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
    const storeId = profile?.store_id

    useEffect(() => {
        if (!storeId || subscriptions.length === 0) return

        // Crear un único canal por store_id para todas las tablas
        const channelName = `store-${storeId}-${Date.now()}`
        const channel = supabase.channel(channelName)

        subscriptions.forEach(({ table, event = '*', onchange }) => {
            channel.on(
                'postgres_changes' as any,
                {
                    event,
                    schema: 'public',
                    table,
                    // Filtrar por store_id para no recibir eventos de otras tiendas
                    filter: `store_id=eq.${storeId}`,
                },
                (payload: any) => {
                    onchange(payload)
                }
            )
        })

        channel.subscribe((status) => {
        })

        channelRef.current = channel

        // Cleanup al desmontar — evita memory leaks y consumo de batería
        return () => {
            supabase.removeChannel(channel)
        }
    }, [storeId]) // Solo re-suscribir si cambia la tienda
}