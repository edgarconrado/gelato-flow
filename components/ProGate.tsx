// components/ProGate.tsx
// Componente para bloquear features Pro con un mensaje de upgrade
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { usePro } from '../context/SubscriptionContext'
import { colors, radius, shadow } from '../constants/theme'

interface ProGateProps {
  children: React.ReactNode
  feature?: string  // Nombre de la feature bloqueada (para el mensaje)
}

export function ProGate({ children, feature }: ProGateProps) {
  const { isPro, isLoading, trialDaysLeft, status } = usePro()
  const router = useRouter()

  // Mientras carga, mostrar los children (evita flash de bloqueo)
  if (isLoading) return <>{children}</>

  // Si tiene Pro, mostrar normalmente
  if (isPro) return <>{children}</>

  // Si no tiene Pro, mostrar pantalla de bloqueo
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Ionicons name="lock-closed" size={36} color={colors.primary} />
        </View>

        <Text style={styles.title}>Función Pro</Text>
        <Text style={styles.description}>
          {feature
            ? `${feature} está disponible en GelatoFlow Pro.`
            : 'Esta función está disponible en GelatoFlow Pro.'}
        </Text>

        {status === 'free' && (
          <Text style={styles.subtitle}>
            Tu prueba gratuita ha terminado.
          </Text>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/paywall')}
          activeOpacity={0.85}
        >
          <Ionicons name="star" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.buttonText}>Ver planes Pro</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// Banner pequeño para mostrar días restantes del trial
export function TrialBanner() {
  const { trialDaysLeft, status } = usePro()
  const router = useRouter()

  if (status !== 'trial' || trialDaysLeft === null || trialDaysLeft <= 0) return null

  return (
    <TouchableOpacity
      style={styles.trialBanner}
      onPress={() => router.push('/paywall')}
      activeOpacity={0.85}
    >
      <Ionicons name="time-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
      <Text style={styles.trialText}>
        {trialDaysLeft === 1
          ? 'Último día de tu prueba Pro'
          : `${trialDaysLeft} días restantes de prueba Pro`}
        {' · '}
        <Text style={{ fontWeight: '700' }}>Suscribirse</Text>
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.ink,
    padding: 24,
  },
  card: {
    backgroundColor: colors.ink,

    padding: 32,
    alignItems: 'center',
    width: '100%',

  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.primary}22`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,

    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  trialText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
})