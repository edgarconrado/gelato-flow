// app/welcome.tsx — Aceptar invitación con código
// Maneja su propia sesión directamente con supabase — sin pasar por AuthContext
import { useState } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, KeyboardAvoidingView,
    Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { colors, radius, shadow } from '../constants/theme'

type Step = 'enter_token' | 'set_password' | 'completing'

export default function WelcomeScreen() {
    const router = useRouter()

    const [step, setStep] = useState<Step>('enter_token')
    const [email, setEmail] = useState('')
    const [token, setToken] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [fullName, setFullName] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)

    // ── Paso 1: Verificar token ───────────────────────────────────
    const handleVerifyToken = async () => {
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Correo inválido', 'Ingresa el correo al que te enviaron la invitación.')
            return
        }
        if (token.trim().length < 6) {
            Alert.alert('Token inválido', 'Ingresa el token del correo.')
            return
        }

        setLoading(true)

        const cleanEmail = email.trim().toLowerCase()
        const cleanToken = token.trim()

        // Intentar con los tipos que Supabase puede usar
        const types: Array<'invite' | 'magiclink' | 'email'> = ['invite', 'magiclink', 'email']
        let verified = false

        for (const t of types) {
            try {
                const { data, error } = await supabase.auth.verifyOtp({
                    email: cleanEmail,
                    token: cleanToken,
                    type: t,
                })
                if (!error && data?.user) {
                    verified = true
                    break
                }
            } catch (e) {
            }
        }

        setLoading(false)

        if (!verified) {
            Alert.alert(
                'Token incorrecto',
                'El token no es válido o ya expiró.\n\nPide al administrador que reenvíe la invitación.'
            )
            return
        }

        setStep('set_password')
    }

    // ── Paso 2: Crear contraseña ──────────────────────────────────
    const handleSetPassword = async () => {
        if (!fullName.trim() || fullName.trim().length < 2) {
            Alert.alert('Nombre requerido', 'Ingresa tu nombre completo.')
            return
        }
        if (password.length < 8) {
            Alert.alert('Contraseña muy corta', 'Debe tener al menos 8 caracteres.')
            return
        }
        if (password !== confirm) {
            Alert.alert('Las contraseñas no coinciden.')
            return
        }

        setLoading(true)

        try {
            // 1. Guardar contraseña
            const { error: updateError } = await supabase.auth.updateUser({
                password,
                data: { full_name: fullName.trim() },
            })

            if (updateError) {
                Alert.alert('Error', updateError.message)
                setLoading(false)
                return
            }

            setStep('completing')

            // 2. Crear/actualizar el perfil del invitado en la tabla profiles
            // usando la función RPC que busca la invitación por email
            // Actualizar full_name en el perfil
            await supabase
                .from('profiles')
                .update({ full_name: fullName.trim() })
                .eq('email', email.trim().toLowerCase())

            const { data: rpcData, error: rpcError } = await supabase
                .rpc('accept_invitation', {
                    p_email: email.trim().toLowerCase(),
                    p_full_name: fullName.trim(),
                })


            if (rpcError || rpcData?.error) {
                // No bloqueamos — el usuario puede entrar igual y el admin ajusta
            }

            // 3. Cerrar sesión para que el usuario entre limpio
            await new Promise(r => setTimeout(r, 600))
            await supabase.auth.signOut()
            await new Promise(r => setTimeout(r, 300))

            // 4. Ir al login
            Alert.alert(
                '✓ Cuenta creada',
                'Tu contraseña fue configurada. Ahora inicia sesión con tu correo y contraseña.',
                [{ text: 'Iniciar sesión', onPress: () => router.replace('/auth/login') }]
            )

        } catch (err: any) {
            Alert.alert('Error inesperado', err?.message ?? 'Intenta de nuevo.')
            setLoading(false)
        }
    }

    // ── Pantalla: Completando ─────────────────────────────────────
    if (step === 'completing') {
        return (
            <SafeAreaView style={s.safe}>
                <View style={s.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={s.verifyText}>Configurando tu cuenta…</Text>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <KeyboardAvoidingView
            style={s.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <SafeAreaView style={s.safe}>
                <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

                    {/* Brand */}
                    <View style={s.brand}>
                        <View style={s.logoWrap}><Text style={{ fontSize: 36 }}>🍦</Text></View>
                        <Text style={s.brandName}>Gelato Flow</Text>
                    </View>

                    <View style={s.card}>

                        {step === 'enter_token' ? (
                            <>
                                <View style={s.cardHeader}>
                                    <View style={s.iconWrap}>
                                        <Ionicons name="key-outline" size={22} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.cardTitle}>Código de invitación</Text>
                                        <Text style={s.cardSub}>Ingresa los datos del correo</Text>
                                    </View>
                                </View>

                                <View style={s.divider} />

                                <View style={s.infoBox}>
                                    <Ionicons name="mail-outline" size={16} color={colors.primaryDark} />
                                    <Text style={s.infoText}>
                                        Abre el correo de invitación, copia el token del cuadro oscuro y pégalo aquí.
                                    </Text>
                                </View>

                                <Text style={s.label}>Tu correo electrónico</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="tu@correo.com"
                                    placeholderTextColor={colors.inkMuted}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    value={email}
                                    onChangeText={setEmail}
                                />

                                <Text style={s.label}>Token del correo</Text>
                                <TextInput
                                    style={[s.input, s.tokenInput]}
                                    placeholder="Pega aquí el token..."
                                    placeholderTextColor={colors.inkMuted}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    value={token}
                                    onChangeText={setToken}
                                    multiline
                                    numberOfLines={2}
                                />

                                <TouchableOpacity
                                    style={[s.submitBtn,
                                    (loading || token.trim().length < 6 || !email.includes('@')) && s.submitDisabled
                                    ]}
                                    onPress={handleVerifyToken}
                                    disabled={loading || token.trim().length < 6 || !email.includes('@')}
                                    activeOpacity={0.85}
                                >
                                    {loading
                                        ? <ActivityIndicator color={colors.ink} />
                                        : <>
                                            <Ionicons name="checkmark-circle-outline" size={18} color={colors.ink} />
                                            <Text style={s.submitText}>Verificar código</Text>
                                        </>
                                    }
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => router.replace('/auth/login')}
                                    style={s.linkWrap}
                                >
                                    <Text style={s.link}>¿Ya tienes cuenta? Inicia sesión</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={s.cardHeader}>
                                    <View style={s.iconWrap}>
                                        <Ionicons name="lock-closed-outline" size={22} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.cardTitle}>Crea tu contraseña</Text>
                                        <Text style={s.cardSub}>Último paso para entrar</Text>
                                    </View>
                                </View>

                                <View style={s.divider} />

                                <Text style={s.label}>Tu nombre completo</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="Ej: Juan García"
                                    placeholderTextColor={colors.inkMuted}
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                    value={fullName}
                                    onChangeText={setFullName}
                                />

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

                                {password.length > 0 && (
                                    <View style={s.strengthRow}>
                                        {[1, 2, 3, 4].map(i => (
                                            <View key={i} style={[s.strengthBar, {
                                                backgroundColor:
                                                    password.length >= i * 3
                                                        ? password.length >= 12 ? colors.primary
                                                            : password.length >= 8 ? colors.amber
                                                                : colors.accent
                                                        : colors.border
                                            }]} />
                                        ))}
                                        <Text style={s.strengthLabel}>
                                            {password.length < 6 ? 'Muy corta' :
                                                password.length < 8 ? 'Corta' :
                                                    password.length < 12 ? 'Buena' : 'Excelente'}
                                        </Text>
                                    </View>
                                )}

                                <Text style={s.label}>Confirmar contraseña</Text>
                                <TextInput
                                    style={[s.input,
                                    confirm.length > 0 && confirm !== password && s.inputError
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

                                <TouchableOpacity
                                    style={[s.submitBtn,
                                    (loading || fullName.trim().length < 2 || password.length < 8 || password !== confirm) && s.submitDisabled
                                    ]}
                                    onPress={handleSetPassword}
                                    disabled={loading || fullName.trim().length < 2 || password.length < 8 || password !== confirm}
                                    activeOpacity={0.85}
                                >
                                    {loading
                                        ? <ActivityIndicator color={colors.ink} />
                                        : <>
                                            <Ionicons name="checkmark-circle-outline" size={18} color={colors.ink} />
                                            <Text style={s.submitText}>Crear cuenta y entrar</Text>
                                        </>
                                    }
                                </TouchableOpacity>
                            </>
                        )}

                    </View>
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    )
}

const s = StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: colors.ink },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    verifyText: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },

    brand: { alignItems: 'center', marginBottom: 32 },
    logoWrap: { width: 68, height: 68, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    brandName: { fontSize: 24, fontWeight: '600', color: '#fff', letterSpacing: -0.4 },

    card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 24, ...shadow.header },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    iconWrap: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 17, fontWeight: '600', color: colors.ink, letterSpacing: -0.2 },
    cardSub: { fontSize: 12, color: colors.inkMuted, marginTop: 1 },
    divider: { height: 0.5, backgroundColor: colors.border, marginBottom: 16 },

    infoBox: { flexDirection: 'row', gap: 8, backgroundColor: colors.primaryLight, padding: 12, borderRadius: radius.md, marginBottom: 8, alignItems: 'flex-start' },
    infoText: { flex: 1, fontSize: 12, color: colors.primaryDark, lineHeight: 18 },

    label: { fontSize: 12, fontWeight: '500', color: colors.inkMuted, marginTop: 14, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: colors.ink, backgroundColor: colors.background },
    tokenInput: { fontSize: 13, fontFamily: 'monospace', minHeight: 70, textAlignVertical: 'top', paddingTop: 12 },
    inputError: { borderColor: colors.accent },
    inputWrap: { position: 'relative' },
    eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
    errorText: { fontSize: 11, color: colors.accent, marginTop: 4 },

    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    strengthBar: { flex: 1, height: 3, borderRadius: 2 },
    strengthLabel: { fontSize: 11, color: colors.inkMuted, marginLeft: 4, minWidth: 60 },

    submitBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 24 },
    submitDisabled: { opacity: 0.45 },
    submitText: { color: colors.ink, fontSize: 15, fontWeight: '700' },

    linkWrap: { marginTop: 16, alignItems: 'center' },
    link: { color: colors.inkMuted, fontSize: 13 },
})