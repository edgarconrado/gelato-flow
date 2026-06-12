// context/SubscriptionContext.tsx
// Provee el estado de suscripción a toda la app
import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useSubscription, SubscriptionInfo } from '../hooks/useSubscription'
import { checkSubscriptionNotification } from '../hooks/useNotifications'

const SubscriptionContext = createContext<SubscriptionInfo | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const subscription = useSubscription()

  // Verificar si hay que notificar al usuario cuando el estado esté listo
  useEffect(() => {
    if (subscription.isLoading) return
    checkSubscriptionNotification({
      status: subscription.status,
      trialDaysLeft: subscription.trialDaysLeft,
      expiresAt: subscription.expiresAt,
    })
  }, [subscription.isLoading, subscription.status])

  return (
    <SubscriptionContext.Provider value={subscription}>
      {children}
    </SubscriptionContext.Provider>
  )
}

// Hook principal para usar en cualquier pantalla
export function usePro(): SubscriptionInfo {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('[usePro] Debe usarse dentro de <SubscriptionProvider>')
  return ctx
}

// Hook simplificado: solo true/false
export function useIsPro(): boolean {
  return usePro().isPro
}