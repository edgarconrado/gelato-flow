// app/auth/confirm.tsx
// Maneja el deep link de confirmación de correo
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors, radius } from '../../constants/theme'

export default function ConfirmScreen() {
    const router = useRouter()
    const params = useLocalSearchParams()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('')

    useEffect(() => {
        handleConfirmation()
    }, [])

    const handleConfirmation = async () => {
        try {
            // Supabase maneja automáticamente el token del deep link
            const { data: { session }, error } = await supabase.auth.getSession()

            if (error) throw error

            if (session) {
                setStatus('success')
                // Redirigir al dashboard después de 2 segundos
                setTimeout(() => router.replace('/(tabs)'), 2000)
            } else {
                setStatus('error')
                setMessage('No se pudo verificar tu cuenta. El enlace puede haber expirado.')
            }
        } catch (err: any) {
            setStatus('error')
            setMessage(err.message ?? 'Ocurrió un error al verificar tu cuenta.')
        }
    }

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.container}>
                {status === 'loading' && (
                    <>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={s.title}>Verificando tu cuenta...</Text>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <View style={s.iconWrap}>
                            <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
                        </View>
                        <Text style={s.title}>¡Cuenta verificada!</Text>
                        <Text style={s.subtitle}>Bienvenido a GelatoFlow. Entrando a tu negocio...</Text>
                        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
                    </>
                )}

                {status === 'error' && (
                    <>
                        <View style={s.iconWrap}>
                            <Ionicons name="close-circle" size={64} color={colors.accent} />
                        </View>
                        <Text style={s.title}>Error de verificación</Text>
                        <Text style={s.subtitle}>{message}</Text>
                        <TouchableOpacity
                            style={s.btn}
                            onPress={() => router.replace('/auth/login')}
                            activeOpacity={0.85}
                        >
                            <Text style={s.btnText}>Ir al inicio de sesión</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </SafeAreaView>
    )
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.ink },
    container: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        padding: 32, gap: 16,
    },
    iconWrap: {
        width: 96, height: 96, borderRadius: 32,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 22, fontWeight: '700', color: '#fff',
        textAlign: 'center', letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 14, color: 'rgba(255,255,255,0.5)',
        textAlign: 'center', lineHeight: 20,
    },
    btn: {
        backgroundColor: colors.primary, borderRadius: radius.md,
        paddingVertical: 14, paddingHorizontal: 32, marginTop: 16,
    },
    btnText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
})