// app/auth/login.tsx — Ink & Mint design
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import { colors, radius, shadow } from '../../constants/theme'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const { signIn } = useAuth()

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.')
      return
    }
    setSubmitting(true)
    const errorMsg = await signIn(email, password)
    setSubmitting(false)
    if (errorMsg) {
      const friendly: Record<string, string> = {
        'Invalid login credentials': 'Correo o contraseña incorrectos.',
        'Email not confirmed': 'Confirma tu correo antes de continuar.',
        'Too many requests': 'Demasiados intentos. Espera un momento.',
      }
      Alert.alert('Error', friendly[errorMsg] ?? errorMsg)
    }
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

        {/* Brand mark */}
        <View style={s.brand}>
          <View style={s.logoWrap}>
            <Text style={s.logoEmoji}>🍦</Text>
          </View>
          <Text style={s.brandName}>Gelato Flow</Text>
          <Text style={s.brandTagline}>Sistema de gestión</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Iniciar sesión</Text>

          <Text style={s.label}>Correo electrónico</Text>
          <TextInput
            style={s.input}
            placeholder="cajero@gelatoflow.mx"
            placeholderTextColor={colors.inkMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={s.label}>Contraseña</Text>
          <View style={s.inputWrap}>
            <TextInput
              style={[s.input, { paddingRight: 48 }]}
              placeholder="••••••••"
              placeholderTextColor={colors.inkMuted}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(p => !p)}>
              <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.submitBtn, submitting && s.submitBtnDisabled]}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color={colors.ink} />
              : <Text style={s.submitBtnText}>Entrar</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={{ marginBottom: 16, alignItems: 'center' }}
          onPress={() => router.push('/welcome')}
        >
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
            Tengo un enlace de invitacion
          </Text>
        </TouchableOpacity>
        <Text style={s.footer}>Solo para personal autorizado</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.ink },
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  brand: { alignItems: 'center', marginBottom: 36 },
  logoWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoEmoji: { fontSize: 36 },
  brandName: { fontSize: 26, fontWeight: '600', color: '#fff', letterSpacing: -0.5 },
  brandTagline: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 },

  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.xl, padding: 28,
    ...shadow.header,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.ink, marginBottom: 24, letterSpacing: -0.3 },

  label: { fontSize: 12, fontWeight: '500', color: colors.inkMuted, marginBottom: 6, marginTop: 16, letterSpacing: 0.02 },
  input: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.ink,
    backgroundColor: colors.background,
  },
  inputWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: 12,
    top: 0, bottom: 0, justifyContent: 'center',
  },
  eyeIcon: { fontSize: 16 },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md, paddingVertical: 16,
    alignItems: 'center', marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.ink, fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

  footer: { marginTop: 24, color: 'rgba(255,255,255,0.25)', fontSize: 12 },
})