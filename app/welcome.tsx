// app/welcome.tsx — Pantalla de bienvenida para usuarios invitados
// Se abre cuando el usuario toca "Aceptar invitación" en el correo.
// Flujo: verificar token → crear contraseña → entrar al POS
import { useState, useEffect } from 'react'
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
    Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { colors, radius, shadow } from '../constants/theme'

type Step = 'verifying' | 'set_password' | 'completing' | 'error'

export default function WelcomeScreen() {
    const router = useRouter()
    const params = useLocalSearchParams<{ token_hash?: string; type?: string }>()
    const { refreshProfile } = useAuth()

    const [step, setStep] = useState<Step>('verifying')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [saving, setSaving] = useState(false)
    const [userEmail, setUserEmail] = useState('')
    const [errorMsg, setErrorMsg] = useState('')

    // ── Verificar el token al montar ──────────────────────────────
    useEffect(() => {
        verifyToken()
    }, [params.token_hash])

    const verifyToken = async () => {
        setStep('verifying')

        const tokenHash = params.token_hash
        const type = (params.type as any) ?? 'invite'

        if (!tokenHash) {
            // Sin token — puede ser que Supabase ya procesó la sesión via onAuthStateChange
            // Verificar si hay sesión activa
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                setUserEmail(session.user.email ?? '')
                setStep('set_password')
            } else {
                setErrorMsg('Link inválido o expirado. Solicita una nueva invitación.')
                setStep('error')
            }
            return
        }

        try {
            // Verificar el token con Supabase
            const { data, error } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: type === 'recovery' ? 'recovery' : 'invite',
            })

            if (error) {
                console.log('[Welcome] verifyOtp error:', error.message)
                // Si el token ya fue usado pero hay sesión, continuar
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    setUserEmail(session.user.email ?? '')
                    setStep('set_password')
                } else {
                    setErrorMsg(`El link de invitación ${error.message.includes('expired') ? 'ha expirado' : 'no es válido'}. Solicita una nueva invitación al administrador.`)
                    setStep('error')
                }
                return
            }

            setUserEmail(data.user?.email ?? '')
            setStep('set_password')

        } catch (err: any) {
            console.log('[Welcome] Error:', err)
            setErrorMsg('Ocurrió un error al verificar el enlace. Intenta de nuevo.')
            setStep('error')
        }
    }

    // ── Guardar contraseña y completar registro ───────────────────
    const handleSetPassword = async () => {
        if (password.length < 8) {
            Alert.alert('Contraseña muy corta', 'Debe tener al menos 8 caracteres.')
            return
        }
        if (password !== confirm) {
            Alert.alert('Las contraseñas no coinciden', 'Verifica que ambas sean iguales.')
            return
        }

        setSaving(true)
        try {
            // Actualizar la contraseña del usuario
            const { error } = await supabase.auth.updateUser({ password })

            if (error) {
                Alert.alert('Error', error.message)
                setSaving(false)
                return
            }

            setStep('completing')

            // Refrescar el perfil para cargar store_id y rol asignados
            await refreshProfile()

            // Pequeña pausa para que el usuario vea el mensaje de éxito
            await new Promise(r => setTimeout(r, 1500))

            // Ir al POS
            router.replace('/(tabs)')

        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'No se pudo guardar la contraseña.')
            setSaving(false)
        }
    }

    // ── Renders por step ──────────────────────────────────────────

    if (step === 'verifying') {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={s.verifyingText}>Verificando invitación…</Text>
                </View>
            </SafeAreaView>
        )
    }

    if (step === 'completing') {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <View style={s.successIcon}>
                        <Text style={{ fontSize: 36 }}>🎉</Text>
                    </View>
                    <Text style={s.successTitle}>¡Bienvenido al equipo!</Text>
                    <Text style={s.successSub}>Entrando a la app…</Text>
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                </View>
            </SafeAreaView>
        )
    }

    if (step === 'error') {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <View style={s.errorIcon}>
                        <Ionicons name="alert-circle-outline" size={48} color={colors.accent} />
                    </View>
                    <Text style={s.errorTitle}>Link inválido</Text>
                    <Text style={s.errorDesc}>{errorMsg}</Text>
                    <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => router.replace('/auth/login')}
                    >
                        <Text style={s.backBtnText}>Ir al inicio de sesión</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    // step === 'set_password'
    return (
        <KeyboardAvoidingView
            style={s.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <SafeAreaView style={s.safe}>
                <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

                    {/* Brand */}
                    <View style={s.brand}>
                        <View style={s.logoWrap}>
                            <Text style={{ fontSize: 36 }}>🍦</Text>
                        </View>
                        <Text style={s.brandName}>Gelato Flow</Text>
                    </View>

                    {/* Card */}
                    <View style={s.card}>

                        {/* Header */}
                        <View style={s.cardHeader}>
                            <View style={s.welcomeIconWrap}>
                                <Ionicons name="people" size={22} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.cardTitle}>¡Te han invitado!</Text>
                                <Text style={s.cardSubtitle} numberOfLines={1}>{userEmail}</Text>
                            </View>
                        </View>

                        <View style={s.divider} />

                        <Text style={s.instruction}>
                            Crea una contraseña para tu cuenta. La usarás cada vez que inicies sesión en Gelato Flow.
                        </Text>

                        {/* Password */}
                        <Text style={s.label}>Contraseña</Text>
                        <View style={s.inputWrap}>
                            <TextInput
                                style={s.input}
                                placeholder="Mínimo 8 caracteres"
                                placeholderTextColor={colors.inkMuted}
                                secureTextEntry={!showPass}
                                value={password}
                                onChangeText={setPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(p => !p)}>
                                <Text style={{ fontSize: 16 }}>{showPass ? '🙈' : '👁️'}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Strength indicator */}
                        {password.length > 0 && (
                            <View style={s.strengthRow}>
                                {[1, 2, 3, 4].map(i => (
                                    <View
                                        key={i}
                                        style={[
                                            s.strengthBar,
                                            {
                                                backgroundColor:
                                                    password.length >= i * 3
                                                        ? password.length >= 12 ? colors.primary
                                                            : password.length >= 8 ? colors.amber
                                                                : colors.accent
                                                        : colors.border,
                                            },
                                        ]}
                                    />
                                ))}
                                <Text style={s.strengthLabel}>
                                    {password.length < 6 ? 'Muy corta' :
                                        password.length < 8 ? 'Corta' :
                                            password.length < 12 ? 'Buena' : 'Excelente'}
                                </Text>
                            </View>
                        )}

                        {/* Confirm */}
                        <Text style={s.label}>Confirmar contraseña</Text>
                        <TextInput
                            style={[
                                s.input,
                                confirm.length > 0 && confirm !== password && s.inputError,
                            ]}
                            placeholder="Repite tu contraseña"
                            placeholderTextColor={colors.inkMuted}
                            secureTextEntry={!showPass}
                            value={confirm}
                            onChangeText={setConfirm}
                            autoCapitalize="none"
                        />
                        {confirm.length > 0 && confirm !== password && (
                            <Text style={s.errorText}>Las contraseñas no coinciden</Text>
                        )}

                        {/* Submit */}
                        <TouchableOpacity
                            style={[
                                s.submitBtn,
                                (saving || password.length < 8 || password !== confirm) && s.submitBtnDisabled,
                            ]}
                            onPress={handleSetPassword}
                            disabled={saving || password.length < 8 || password !== confirm}
                            activeOpacity={0.85}
                        >
                            {saving
                                ? <ActivityIndicator color={colors.ink} />
                                : <>
                                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.ink} />
                                    <Text style={s.submitBtnText}>Crear cuenta y entrar</Text>
                                </>
                            }
                        </TouchableOpacity>

                    </View>

                    <TouchableOpacity onPress={() => router.replace('/auth/login')} style={{ marginTop: 20 }}>
                        <Text style={s.loginLink}>¿Ya tienes cuenta? Inicia sesión</Text>
                    </TouchableOpacity>

                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    )
}

const s = StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: colors.ink },

    // Estados de carga / éxito / error
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    verifyingText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, marginTop: 16 },

    successIcon: {
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: colors.primaryLight,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    successTitle: { fontSize: 22, fontWeight: '600', color: '#fff', letterSpacing: -0.3 },
    successSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },

    errorIcon: { marginBottom: 8 },
    errorTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },
    errorDesc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20 },
    backBtn: {
        marginTop: 16, backgroundColor: colors.primary,
        paddingHorizontal: 28, paddingVertical: 14, borderRadius: radius.md,
    },
    backBtnText: { color: colors.ink, fontWeight: '700', fontSize: 15 },

    // Scroll
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },

    // Brand
    brand: { alignItems: 'center', marginBottom: 32 },
    logoWrap: {
        width: 68, height: 68, borderRadius: 18,
        backgroundColor: colors.primaryLight,
        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    brandName: { fontSize: 24, fontWeight: '600', color: '#fff', letterSpacing: -0.4 },

    // Card
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl, padding: 24,
        ...shadow.header,
    },
    cardHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
    },
    welcomeIconWrap: {
        width: 44, height: 44, borderRadius: radius.md,
        backgroundColor: colors.primaryLight,
        alignItems: 'center', justifyContent: 'center',
    },
    cardTitle: { fontSize: 17, fontWeight: '600', color: colors.ink, letterSpacing: -0.2 },
    cardSubtitle: { fontSize: 12, color: colors.inkMuted, marginTop: 1 },
    divider: { height: 0.5, backgroundColor: colors.border, marginBottom: 16 },
    instruction: { fontSize: 13, color: colors.inkMid, lineHeight: 19, marginBottom: 8 },

    // Form
    label: { fontSize: 12, fontWeight: '500', color: colors.inkMuted, marginTop: 14, marginBottom: 6 },
    inputWrap: { position: 'relative' },
    input: {
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
        paddingHorizontal: 16, paddingVertical: 13,
        fontSize: 15, color: colors.ink, backgroundColor: colors.background,
    },
    inputError: { borderColor: colors.accent },
    eyeBtn: {
        position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center',
    },
    errorText: { fontSize: 11, color: colors.accent, marginTop: 4 },

    // Strength
    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    strengthBar: { flex: 1, height: 3, borderRadius: 2 },
    strengthLabel: { fontSize: 11, color: colors.inkMuted, marginLeft: 4, minWidth: 60 },

    // Submit
    submitBtn: {
        backgroundColor: colors.primary, borderRadius: radius.md,
        paddingVertical: 16, alignItems: 'center',
        flexDirection: 'row', justifyContent: 'center',
        gap: 8, marginTop: 24,
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitBtnText: { color: colors.ink, fontSize: 15, fontWeight: '700' },

    loginLink: { color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center' },
})