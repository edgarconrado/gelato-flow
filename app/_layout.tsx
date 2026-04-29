// app/_layout.tsx — Root Layout simplificado
// Ya no usamos deep links — el flujo de invitación es:
// Login → "Tengo un código" → /welcome → crear contraseña → POS
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AuthProvider, useAuth } from '../context/AuthContext'

function RootGuard() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return

    const inAuth = segments[0] === 'auth'
    const inWelcome = segments[0] === 'welcome'

    // No redirigir si estamos en welcome
    if (inWelcome) return

    if (!session && !inAuth) {
      router.replace('/auth/login')
    } else if (session && inAuth) {
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