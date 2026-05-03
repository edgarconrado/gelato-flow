// hooks/useNotifications.ts
// Gestiona permisos y envío de notificaciones locales con expo-notifications.
// Las notificaciones son locales (in-app) — no requieren servidor push.

import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
})

export function useNotifications() {
    const notificationListener = useRef<any>()

    useEffect(() => {
        registerForNotifications()

        // Listener para cuando el usuario toca una notificación
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
    if (!Device.isDevice) return // No funciona en simulador

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

    // Configuración específica para Android
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('gelato-flow', {
            name: 'Gelato Flow',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3ECFB2',
        })
    }
}

// Función para enviar notificaciones locales
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
            trigger: null, // Inmediata
        })
    } catch (err) {
        console.warn('[Notifications] Error:', err)
    }
}