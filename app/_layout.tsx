// app/_layout.tsx  —  Root Layout con auth guard y AuthProvider
// SDK 54 / expo-router v6
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AuthProvider, useAuth } from '../context/AuthContext'

// ─── Guard interno ────────────────────────────────────────────────────────────
// Separado del Provider para poder consumir useAuth() dentro del árbol.
function RootGuard() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return  // Esperar a que Supabase resuelva la sesión inicial

    const inAuthGroup = segments[0] === 'auth'

    if (!session && !inAuthGroup) {
      // Sin sesión → ir a Login
      router.replace('/auth/login')
    } else if (session && inAuthGroup) {
      // Con sesión → ir a la app principal
      router.replace('/(tabs)')
    }
  }, [session, loading, segments])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="pos/checkout"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="inventory/form"
        options={{ presentation: 'modal' }}
      />
    </Stack>
  )
}

// ─── Root Layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      {/* AuthProvider envuelve todo el árbol para que useAuth()
          esté disponible en cualquier pantalla */}
      <AuthProvider>
        <RootGuard />
      </AuthProvider>
    </GestureHandlerRootView>
  )
}