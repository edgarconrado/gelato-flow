// app/_layout.tsx — Root Layout con AnimatedSplash
import { useState, useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import { AnimatedSplash } from '../components/AnimatedSplash'

// Mantener el splash nativo visible mientras carga
SplashScreen.preventAutoHideAsync()

function RootGuard() {
  const { session, loading } = useAuth()
  const [splashDone, setSplashDone] = useState(false)
  const router = useRouter()
  const segments = useSegments()

  useNotifications()

  // Guard de navegación — solo actúa cuando splash Y auth están listos
  useEffect(() => {
    if (!splashDone || loading) return

    const inAuth = segments[0] === 'auth'
    const inWelcome = segments[0] === 'welcome'
    if (inWelcome) return

    if (!session && !inAuth) {
      router.replace('/auth/login')
    } else if (session && inAuth) {
      router.replace('/(tabs)')
    }
  }, [session, loading, segments, splashDone])

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="pos/checkout" options={{ presentation: 'modal' }} />
        <Stack.Screen name="inventory/form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="team/index" options={{ headerShown: false }} />
        <Stack.Screen name="caja/index" options={{ headerShown: false }} />
        <Stack.Screen name="stock/index" options={{ headerShown: false }} />
      </Stack>

      {/* Splash animado encima de todo — desaparece cuando auth termina de cargar */}
      {!splashDone && (
        <AnimatedSplash
          onReady={() => setSplashDone(true)}
        />
      )}
    </>
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