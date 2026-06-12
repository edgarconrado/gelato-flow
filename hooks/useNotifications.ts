// hooks/useNotifications.ts
// Gestiona permisos y envío de notificaciones locales con expo-notifications.

import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
})

// Clave para evitar notificar múltiples veces el mismo día
const NOTIF_KEY = 'gelatoflow:sub_notif_last_sent'

export function useNotifications() {
    const notificationListener = useRef<any>(null)

    useEffect(() => {
        registerForNotifications()

        notificationListener.current =
            Notifications.addNotificationResponseReceivedListener(response => {
                console.log('[Notifications] Tapped:', response.notification.request.content.title)
            })

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current)
            }
        }
    }, [])

    return { notify }
}

// Solicitar permisos de notificaciones
async function registerForNotifications() {
    if (!Device.isDevice) return

    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing

    if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
    }

    if (finalStatus !== 'granted') {
        console.warn('[Notifications] Permiso denegado')
        return
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('gelato-flow', {
            name: 'Gelato Flow',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3ECFB2',
        })
    }
}

// Notificación local inmediata
export async function notify(
    title: string,
    body: string,
    type: 'success' | 'warning' | 'info' = 'info'
) {
    const icons = { success: '✅', warning: '⚠️', info: 'ℹ️' }
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: `${icons[type]} ${title}`,
                body,
                sound: true,
                data: { type },
                ...(Platform.OS === 'android' && { channelId: 'gelato-flow' }),
            },
            trigger: null,
        })
    } catch (err) {
        console.warn('[Notifications] Error:', err)
    }
}

// ─────────────────────────────────────────────────────────────
// Notificaciones de suscripción por vencer
// Llámala al iniciar la app cuando el perfil ya esté listo
// ─────────────────────────────────────────────────────────────
export async function checkSubscriptionNotification(params: {
    status: 'free' | 'trial' | 'pro' | 'gifted'
    trialDaysLeft: number | null
    expiresAt: Date | null
}) {
    const { status, trialDaysLeft, expiresAt } = params

    // Solo notificar en trial o gifted próximos a vencer
    if (status !== 'trial' && status !== 'gifted') return

    // Calcular días restantes
    let daysLeft: number | null = trialDaysLeft
    if (status === 'gifted' && expiresAt) {
        const ms = expiresAt.getTime() - Date.now()
        daysLeft = ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0
    }

    // Solo notificar en los últimos 3 días
    if (daysLeft === null || daysLeft <= 0 || daysLeft > 3) return

    // Evitar notificar más de una vez por día
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const lastSent = await AsyncStorage.getItem(NOTIF_KEY)
    if (lastSent === today) return

    // Construir mensaje según días restantes
    let title = ''
    let body = ''

    if (daysLeft === 1) {
        title = status === 'trial' ? '⏰ Último día de tu prueba Pro' : '⏰ Tu Pro vence mañana'
        body = 'Suscríbete ahora para no perder acceso a Gastos, Equipo y Reportes anuales.'
    } else {
        title = status === 'trial'
            ? `Tu prueba Pro vence en ${daysLeft} días`
            : `Tu suscripción Pro vence en ${daysLeft} días`
        body = 'Activa tu plan para seguir disfrutando todas las funciones sin interrupciones.'
    }

    await notify(title, body, 'warning')
    await AsyncStorage.setItem(NOTIF_KEY, today)
    console.log(`[Notifications] Aviso de suscripción enviado (${daysLeft} días restantes)`)
}