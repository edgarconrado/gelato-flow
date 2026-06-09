// hooks/useSubscription.ts
// Verifica si la tienda tiene acceso Pro combinando RevenueCat + Supabase
import { useEffect, useState, useCallback } from 'react'
import { supabase, SubscriptionStatus } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export interface SubscriptionInfo {
  isPro: boolean
  status: SubscriptionStatus
  expiresAt: Date | null
  trialDaysLeft: number | null
  isLoading: boolean
  refresh: () => Promise<void>
}

export function useSubscription(): SubscriptionInfo {
  const { profile } = useAuth()
  const [isPro, setIsPro] = useState(false)
  const [status, setStatus] = useState<SubscriptionStatus>('free')
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const check = useCallback(async () => {
    if (!profile?.store_id) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      // ── 1. Verificar RevenueCat (opcional, no bloquea si falla) ──
      let rcIsPro = false
      try {
        const Purchases = (await import('react-native-purchases')).default
        const RC_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? ''
        if (RC_API_KEY) {
          await Purchases.configure({ apiKey: RC_API_KEY, appUserID: profile.store_id })
          const customerInfo = await Purchases.getCustomerInfo()
          rcIsPro = typeof customerInfo.entitlements.active['GelatoFlow Pro'] !== 'undefined'
        }
      } catch (rcError) {
        // RevenueCat no disponible — continuamos con Supabase
        console.warn('[useSubscription] RevenueCat no disponible:', rcError)
      }

      // ── 2. Leer datos de suscripción desde Supabase ──────────
      const { data: store, error } = await supabase
        .from('stores')
        .select('subscription_status, subscription_expires_at, trial_started_at')
        .eq('id', profile.store_id)
        .single()

      if (error || !store) {
        console.warn('[useSubscription] Error al leer store:', error?.message)
        setIsPro(rcIsPro)
        setIsLoading(false)
        return
      }

      const dbStatus = (store.subscription_status ?? 'free') as SubscriptionStatus
      const expires = store.subscription_expires_at ? new Date(store.subscription_expires_at) : null
      const now = new Date()

      // ── 3. Calcular días de trial restantes ──────────────────
      let daysLeft: number | null = null
      if (dbStatus === 'trial' && store.trial_started_at) {
        const trialEnd = new Date(new Date(store.trial_started_at).getTime() + 7 * 24 * 60 * 60 * 1000)
        const ms = trialEnd.getTime() - now.getTime()
        daysLeft = ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0
      }

      // ── 4. Determinar acceso Pro ──────────────────────────────
      const dbIsPro =
        (dbStatus === 'trial' && daysLeft !== null && daysLeft > 0) ||
        (dbStatus === 'gifted' && expires !== null && expires > now) ||
        dbStatus === 'pro'

      const finalIsPro = rcIsPro || dbIsPro

      // ── 5. Sincronizar si RC dice Pro pero Supabase no ───────
      if (rcIsPro && dbStatus !== 'pro') {
        await supabase
          .from('stores')
          .update({ subscription_status: 'pro', subscription_expires_at: null })
          .eq('id', profile.store_id)
      }

      // ── 6. Expirar trial si venció ───────────────────────────
      if (dbStatus === 'trial' && daysLeft === 0) {
        await supabase
          .from('stores')
          .update({ subscription_status: 'free' })
          .eq('id', profile.store_id)
        setStatus('free')
        setIsPro(false)
      } else {
        setStatus(finalIsPro ? dbStatus : 'free')
        setIsPro(finalIsPro)
      }

      setExpiresAt(expires)
      setTrialDaysLeft(daysLeft)
    } catch (e) {
      console.error('[useSubscription] Error general:', e)
      // En caso de error total, no bloquear la app
      setIsPro(false)
      setStatus('free')
    } finally {
      setIsLoading(false)
    }
  }, [profile?.store_id])

  useEffect(() => {
    check()
  }, [check])

  return { isPro, status, expiresAt, trialDaysLeft, isLoading, refresh: check }
}