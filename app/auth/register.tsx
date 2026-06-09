// app/auth/register.tsx — Registro de nuevo propietario
import { useState } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform,
    Alert, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors, radius, shadow } from '../../constants/theme'
import Constants from 'expo-constants'

type Step = 'account' | 'business' | 'done'

export default function RegisterScreen() {
    const router = useRouter()

    // ── Paso 1: Cuenta ────────────────────────────────────────
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPass, setShowPass] = useState(false)

    // ── Paso 2: Negocio ───────────────────────────────────────
    const [storeName, setStoreName] = useState('')
    const [storePhone, setStorePhone] = useState('')
    const [storeAddress, setStoreAddress] = useState('')

    const [step, setStep] = useState<Step>('account')
    const [submitting, setSubmitting] = useState(false)

    // ── Validar paso 1 ────────────────────────────────────────
    const handleNextStep = () => {
        if (!fullName.trim()) return Alert.alert('Nombre requerido', 'Ingresa tu nombre completo.')
        if (!email.trim() || !email.includes('@')) return Alert.alert('Correo inválido')
        if (password.length < 8) return Alert.alert('Contraseña muy corta', 'Mínimo 8 caracteres.')
        if (password !== confirm) return Alert.alert('Las contraseñas no coinciden')
        setStep('business')
    }

    // ── Crear cuenta y negocio ────────────────────────────────
    const handleRegister = async () => {
        if (!storeName.trim()) return Alert.alert('Nombre del negocio requerido')

        setSubmitting(true)

        try {
            // 1. Crear usuario en Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email.trim().toLowerCase(),
                password,
                options: {
                    data: { full_name: fullName.trim() },
                },
            })

            if (authError) throw new Error(authError.message)
            if (!authData.user) throw new Error('No se pudo crear el usuario.')

            // 2. Llamar Edge Function para crear tienda y perfil (bypasea RLS)
            const extra = Constants.expoConfig?.extra as any
            const supabaseUrl = extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
            const createStoreSecret = extra?.createStoreSecret ?? process.env.EXPO_PUBLIC_CREATE_STORE_SECRET ?? ''

            console.log('Secret enviado:', createStoreSecret) // quitar después de probar

            const response = await fetch(
                `${supabaseUrl}/functions/v1/create-store`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: authData.user.id,
                        storeName: storeName.trim(),
                        storePhone: storePhone.trim() || null,
                        storeAddress: storeAddress.trim() || null,
                        fullName: fullName.trim(),
                        email: email.trim().toLowerCase(),
                        secret: createStoreSecret,
                    }),
                }
            )

            const result = await response.json()

            if (!response.ok || result.error) {
                // Si la tienda falló pero el usuario se creó, informamos
                throw new Error(result.error ?? 'No se pudo crear el negocio.')
            }

            // 3. Mostrar pantalla de éxito
            setStep('done')

        } catch (err: any) {
            const friendly: Record<string, string> = {
                'User already registered': 'Ya existe una cuenta con ese correo.',
                'Este usuario ya tiene un negocio registrado.': 'Este correo ya tiene un negocio registrado.',
            }
            Alert.alert('Error', friendly[err.message] ?? err.message)
        } finally {
            setSubmitting(false)
        }
    }

    // ── Pantalla de éxito ─────────────────────────────────────
    if (step === 'done') {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.doneContainer}>
                    <View style={s.doneIconWrap}>
                        <Text style={s.doneIcon}>🎉</Text>
                    </View>
                    <Text style={s.doneTitle}>¡Bienvenido a GelatoFlow!</Text>
                    <Text style={s.doneSubtitle}>
                        Tu negocio <Text style={s.doneStoreName}>{storeName}</Text> está listo.
                        Tienes <Text style={s.doneHighlight}>7 días gratis</Text> de todas las funciones Pro.
                    </Text>

                    <View style={s.doneFeatures}>
                        {[
                            '✅ Punto de venta listo',
                            '✅ Inventario configurado',
                            '✅ 7 días Pro incluidos',
                            '✅ Invita a tu equipo',
                        ].map((f, i) => (
                            <Text key={i} style={s.doneFeatureItem}>{f}</Text>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={s.doneBtn}
                        onPress={() => router.replace('/auth/login')}
                        activeOpacity={0.85}
                    >
                        <Text style={s.doneBtnText}>Iniciar sesión</Text>
                        <Ionicons name="arrow-forward" size={16} color={colors.ink} />
                    </TouchableOpacity>
                    <Text style={s.doneNote}>
                        Revisa tu correo para confirmar tu cuenta
                    </Text>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <KeyboardAvoidingView
            style={s.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={s.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={() => step === 'business' ? setStep('account') : router.back()}>
                        <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                    <View style={s.stepIndicator}>
                        <View style={[s.stepDot, step === 'account' && s.stepDotActive]} />
                        <View style={s.stepLine} />
                        <View style={[s.stepDot, step === 'business' && s.stepDotActive]} />
                    </View>
                    <View style={{ width: 22 }} />
                </View>

                {/* Brand */}
                <View style={s.brand}>
                    <Text style={s.logoEmoji}>🍦</Text>
                    <Text style={s.brandName}>Gelato Flow</Text>
                    <Text style={s.brandTagline}>
                        {step === 'account' ? 'Crea tu cuenta' : 'Cuéntanos de tu negocio'}
                    </Text>
                </View>

                {/* ── PASO 1: Cuenta ──────────────────────────────── */}
                {step === 'account' && (
                    <View style={s.card}>
                        <Text style={s.cardTitle}>Tu información</Text>

                        <Text style={s.label}>Nombre completo</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Ej: María García"
                            placeholderTextColor={colors.inkMuted}
                            autoCapitalize="words"
                            returnKeyType="next"
                            value={fullName}
                            onChangeText={setFullName}
                        />

                        <Text style={s.label}>Correo electrónico</Text>
                        <TextInput
                            style={s.input}
                            placeholder="maria@minegocio.mx"
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
                                placeholder="Mínimo 8 caracteres"
                                placeholderTextColor={colors.inkMuted}
                                secureTextEntry={!showPass}
                                returnKeyType="next"
                                value={password}
                                onChangeText={setPassword}
                            />
                            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(p => !p)}>
                                <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={s.label}>Confirmar contraseña</Text>
                        <TextInput
                            style={s.input}
                            placeholder="••••••••"
                            placeholderTextColor={colors.inkMuted}
                            secureTextEntry={!showPass}
                            returnKeyType="done"
                            onSubmitEditing={handleNextStep}
                            value={confirm}
                            onChangeText={setConfirm}
                        />

                        <TouchableOpacity
                            style={s.submitBtn}
                            onPress={handleNextStep}
                            activeOpacity={0.85}
                        >
                            <Text style={s.submitBtnText}>Continuar</Text>
                            <Ionicons name="arrow-forward" size={16} color={colors.ink} style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── PASO 2: Negocio ─────────────────────────────── */}
                {step === 'business' && (
                    <View style={s.card}>
                        <Text style={s.cardTitle}>Tu negocio</Text>

                        <Text style={s.label}>Nombre del negocio *</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Ej: Nieves La Paloma"
                            placeholderTextColor={colors.inkMuted}
                            autoCapitalize="words"
                            returnKeyType="next"
                            value={storeName}
                            onChangeText={setStoreName}
                            autoFocus
                        />

                        <Text style={s.label}>Teléfono <Text style={s.optional}>(opcional)</Text></Text>
                        <TextInput
                            style={s.input}
                            placeholder="33 1234 5678"
                            placeholderTextColor={colors.inkMuted}
                            keyboardType="phone-pad"
                            returnKeyType="next"
                            value={storePhone}
                            onChangeText={setStorePhone}
                        />

                        <Text style={s.label}>Dirección <Text style={s.optional}>(opcional)</Text></Text>
                        <TextInput
                            style={s.input}
                            placeholder="Calle, colonia, ciudad"
                            placeholderTextColor={colors.inkMuted}
                            autoCapitalize="sentences"
                            returnKeyType="done"
                            onSubmitEditing={handleRegister}
                            value={storeAddress}
                            onChangeText={setStoreAddress}
                        />

                        {/* Trial badge */}
                        <View style={s.trialBadge}>
                            <Ionicons name="gift-outline" size={16} color={colors.primary} />
                            <Text style={s.trialBadgeText}>
                                Incluye <Text style={{ fontWeight: '700' }}>7 días gratis</Text> de GelatoFlow Pro
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[s.submitBtn, submitting && { opacity: 0.6 }]}
                            onPress={handleRegister}
                            disabled={submitting}
                            activeOpacity={0.85}
                        >
                            {submitting
                                ? <ActivityIndicator color={colors.ink} />
                                : <>
                                    <Text style={s.submitBtnText}>Crear mi negocio</Text>
                                    <Ionicons name="storefront-outline" size={16} color={colors.ink} style={{ marginLeft: 6 }} />
                                </>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity
                    style={s.loginLink}
                    onPress={() => router.back()}
                >
                    <Text style={s.loginLinkText}>
                        ¿Ya tienes cuenta? <Text style={{ color: colors.primary, fontWeight: '600' }}>Inicia sesión</Text>
                    </Text>
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const s = StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.ink },
    safe: { flex: 1, backgroundColor: colors.ink },
    container: { flexGrow: 1, padding: 24, paddingTop: 16 },

    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 24,
    },
    stepIndicator: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    stepDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    stepDotActive: { backgroundColor: colors.primary, width: 20, borderRadius: 4 },
    stepLine: {
        width: 20, height: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },

    brand: { alignItems: 'center', marginBottom: 28 },
    logoEmoji: { fontSize: 40, marginBottom: 8 },
    brandName: { fontSize: 24, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
    brandTagline: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 },

    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl, padding: 24,
        ...shadow.header,
    },
    cardTitle: { fontSize: 18, fontWeight: '600', color: colors.ink, marginBottom: 4, letterSpacing: -0.3 },

    label: { fontSize: 12, fontWeight: '500', color: colors.inkMuted, marginBottom: 6, marginTop: 16 },
    optional: { fontWeight: '400', color: colors.inkMuted },
    input: {
        borderWidth: 1, borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 15, color: colors.ink,
        backgroundColor: colors.background,
    },
    inputWrap: { position: 'relative' },
    eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
    eyeIcon: { fontSize: 16 },

    trialBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: `${colors.primary}12`,
        borderRadius: radius.md, padding: 12,
        borderWidth: 1, borderColor: `${colors.primary}25`,
        marginTop: 20,
    },
    trialBadgeText: { fontSize: 13, color: colors.inkMid, flex: 1 },

    submitBtn: {
        backgroundColor: colors.primary,
        borderRadius: radius.md, paddingVertical: 16,
        alignItems: 'center', marginTop: 24,
        flexDirection: 'row', justifyContent: 'center',
    },
    submitBtnText: { color: colors.ink, fontSize: 15, fontWeight: '700' },

    loginLink: { alignItems: 'center', marginTop: 24, paddingBottom: 16 },
    loginLinkText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },

    // ── Done ─────────────────────────────────────────────────
    doneContainer: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        padding: 32,
    },
    doneIconWrap: {
        width: 88, height: 88, borderRadius: 28,
        backgroundColor: `${colors.primary}20`,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
    },
    doneIcon: { fontSize: 44 },
    doneTitle: {
        fontSize: 26, fontWeight: '700', color: '#fff',
        letterSpacing: -0.5, marginBottom: 12, textAlign: 'center',
    },
    doneSubtitle: {
        fontSize: 15, color: 'rgba(255,255,255,0.5)',
        textAlign: 'center', lineHeight: 22, marginBottom: 28,
    },
    doneStoreName: { color: '#fff', fontWeight: '600' },
    doneHighlight: { color: colors.primary, fontWeight: '700' },
    doneFeatures: {
        width: '100%', gap: 10, marginBottom: 32,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: radius.lg, padding: 20,
    },
    doneFeatureItem: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },
    doneBtn: {
        backgroundColor: colors.primary,
        borderRadius: radius.md, paddingVertical: 16,
        paddingHorizontal: 32, flexDirection: 'row',
        alignItems: 'center', gap: 8, width: '100%',
        justifyContent: 'center',
    },
    doneBtnText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
    doneNote: {
        fontSize: 12, color: 'rgba(255,255,255,0.3)',
        marginTop: 16, textAlign: 'center',
    },
})