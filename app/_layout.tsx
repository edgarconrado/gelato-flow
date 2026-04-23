// app/_layout.tsx — Root Layout con deep link handler para invitaciones
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as Linking from 'expo-linking'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function RootGuard() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  // ── Manejar deep links de invitación ─────────────────────────────────────────
  // Cuando el usuario toca "Aceptar invitación" en el correo, Supabase redirige a:
  // gelatoflow://welcome?token_hash=XXX&type=invite
  // Este handler intercepta ese URL y navega a la pantalla de bienvenida.
  useEffect(() => {
    // Procesar URL inicial si la app se abrió desde un link
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url, router)
    })

    // Escuchar links mientras la app está en primer plano
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url, router)
    })

    return () => sub.remove()
  }, [])

  // ── Escuchar eventos de auth de Supabase ─────────────────────────────────────
  // PASSWORD_RECOVERY y USER_UPDATED se disparan cuando el usuario
  // hace click en "Accept the invite" y Supabase procesa el token.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          // El token fue válido — ir a crear contraseña
          router.replace('/welcome')
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  // ── Guard de navegación ───────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === 'auth'
    const inWelcome = segments[0] === 'welcome'

    // No redirigir si estamos en la pantalla de bienvenida
    if (inWelcome) return

    if (!session && !inAuthGroup) {
      router.replace('/auth/login')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, loading, segments])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="pos/checkout" options={{ presentation: 'modal' }} />
      <Stack.Screen name="inventory/form" options={{ presentation: 'modal' }} />
      <Stack.Screen name="team/index" options={{ headerShown: false }} />
    </Stack>
  )
}

// Parsear el deep link y navegar según el tipo
function handleDeepLink(url: string, router: any) {
  console.log('[DeepLink] URL recibida:', url)

  try {
    const parsed = Linking.parse(url)
    console.log('[DeepLink] Parsed:', JSON.stringify(parsed))

    const params = parsed.queryParams as Record<string, string> ?? {}

    // Supabase envía invitaciones como:
    // gelatoflow://welcome?token_hash=XXX&type=invite
    // o a veces como fragmento #access_token=XXX&type=invite
    if (
      params.type === 'invite' ||
      params.type === 'recovery' ||
      params.token_hash ||
      url.includes('type=invite')
    ) {
      // Extraer token_hash si viene como query param
      const tokenHash = params.token_hash ?? params.token
      router.replace({
        pathname: '/welcome',
        params: { token_hash: tokenHash, type: params.type ?? 'invite' },
      })
    }
  } catch (err) {
    console.log('[DeepLink] Error parsing:', err)
  }
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AuthProvider>
        <RootGuard />
      </AuthProvider>
    </GestureHandlerRootView>
  )
}