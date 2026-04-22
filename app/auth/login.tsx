// app/auth/login.tsx  —  Pantalla de Login
// Usa signInWithEmail del AuthContext. El guard en _layout.tsx
// se encarga de navegar tras el login exitoso.
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView,
} from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../constants/theme'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { signIn } = useAuth()

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Campo requerido', 'Ingresa tu correo electrónico.')
      return
    }
    if (!password) {
      Alert.alert('Campo requerido', 'Ingresa tu contraseña.')
      return
    }

    setSubmitting(true)
    const errorMsg = await signIn(email, password)
    setSubmitting(false)

    if (errorMsg) {
      // Traduce los errores más comunes de Supabase
      const friendly: Record<string, string> = {
        'Invalid login credentials': 'Correo o contraseña incorrectos.',
        'Email not confirmed': 'Confirma tu correo antes de continuar.',
        'Too many requests': 'Demasiados intentos. Espera un momento.',
      }
      Alert.alert('Error al iniciar sesión', friendly[errorMsg] ?? errorMsg)
    }
    // Si no hay error, onAuthStateChange + el guard en _layout.tsx
    // redirigen automáticamente a /(tabs)
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Branding ── */}
        <View style={styles.logoArea}>
          <Text style={styles.emoji}>🍦</Text>
          <Text style={styles.brand}>Paleterías</Text>
          <Text style={styles.brandSub}>El Paraíso</Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          <Text style={styles.title}>Iniciar sesión</Text>
          <Text style={styles.subtitle}>Acceso para personal autorizado</Text>

          {/* Email */}
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="cajero@paleteria.com"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            value={email}
            onChangeText={setEmail}
          />

          {/* Password */}
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(p => !p)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, submitting && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Entrar</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          ¿Problemas para acceder? Contacta a tu administrador.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  emoji: { fontSize: 64 },
  brand: {
    fontSize: 30, fontWeight: '800',
    color: colors.primary, letterSpacing: -0.5,
  },
  brandSub: { fontSize: 16, color: colors.muted, marginTop: 2 },

  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 24, padding: 28,
    shadowColor: '#000', shadowOpacity: 0.1,
    shadowRadius: 20, elevation: 6,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.muted, marginBottom: 24 },

  label: {
    fontSize: 13, fontWeight: '600',
    color: colors.muted, marginBottom: 6, marginTop: 12,
  },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 16, color: colors.text,
    backgroundColor: colors.background,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  eyeBtn: {
    position: 'absolute', right: 12, top: 0, bottom: 0,
    justifyContent: 'center', padding: 4,
  },
  eyeIcon: { fontSize: 18 },

  btn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
    shadowColor: colors.primary, shadowOpacity: 0.35,
    shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  footer: {
    marginTop: 24, textAlign: 'center',
    color: colors.muted, fontSize: 13, lineHeight: 18,
  },
})