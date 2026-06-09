// app/paywall.tsx — Pantalla de suscripción GelatoFlow Pro
import { useState, useEffect, useRef } from 'react'
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Animated, Dimensions, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Purchases, { PurchasesPackage } from 'react-native-purchases'
import { colors, radius, shadow } from '../constants/theme'
import { usePro } from '../context/SubscriptionContext'

const { width } = Dimensions.get('window')

// ─── Features incluidas en Pro ────────────────────────────────
const FEATURES = [
    { icon: '💸', title: 'Módulo de Gastos', desc: 'Registra y categoriza todos los gastos de tu negocio' },
    { icon: '👥', title: 'Gestión de Equipo', desc: 'Invita cajeros y gerentes a tu tienda' },
    { icon: '📊', title: 'Reportes Anuales', desc: 'Analiza tendencias de todo el año' },
    { icon: '⚠️', title: 'Alertas de Stock', desc: 'Notificaciones cuando el inventario es bajo' },
    { icon: '🛍️', title: 'Productos Ilimitados', desc: 'Sin límite de productos en tu inventario' },
    { icon: '🔄', title: 'Actualizaciones', desc: 'Acceso a todas las funciones futuras' },
]

export default function PaywallScreen() {
    const router = useRouter()
    const { isPro, refresh } = usePro()
    const [packages, setPackages] = useState<PurchasesPackage[]>([])
    const [selected, setSelected] = useState<PurchasesPackage | null>(null)
    const [loading, setLoading] = useState(true)
    const [purchasing, setPurchasing] = useState(false)
    const [restoring, setRestoring] = useState(false)

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(30)).current

    useEffect(() => {
        // Si ya es Pro, cerrar el paywall
        if (isPro) { router.back(); return }
        loadOfferings()
    }, [isPro])

    const loadOfferings = async () => {
        try {
            const offerings = await Purchases.getOfferings()
            const pkgs = offerings.current?.availablePackages ?? []
            setPackages(pkgs)
            // Seleccionar anual por defecto (mejor valor)
            const yearly = pkgs.find(p => p.packageType === 'ANNUAL') ?? pkgs[0] ?? null
            setSelected(yearly)
        } catch (e) {
            console.warn('[Paywall] Error cargando offerings:', e)
        } finally {
            setLoading(false)
            // Animar entrada
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]).start()
        }
    }

    const handlePurchase = async () => {
        if (!selected) return
        setPurchasing(true)
        try {
            await Purchases.purchasePackage(selected)
            await refresh()
            Alert.alert('🎉 ¡Bienvenido a Pro!', 'Ya tienes acceso a todas las funciones de GelatoFlow.', [
                { text: 'Continuar', onPress: () => router.back() }
            ])
        } catch (e: any) {
            if (!e.userCancelled) {
                Alert.alert('Error', 'No se pudo completar la compra. Intenta de nuevo.')
            }
        } finally {
            setPurchasing(false)
        }
    }

    const handleRestore = async () => {
        setRestoring(true)
        try {
            await Purchases.restorePurchases()
            await refresh()
            Alert.alert('✓ Compras restauradas', 'Si tenías una suscripción activa, ya está disponible.')
        } catch {
            Alert.alert('Error', 'No se pudieron restaurar las compras.')
        } finally {
            setRestoring(false)
        }
    }

    // ── Calcular ahorro anual ─────────────────────────────────
    const monthlyPkg = packages.find(p => p.packageType === 'MONTHLY')
    const yearlyPkg = packages.find(p => p.packageType === 'ANNUAL')
    const savingsPct = monthlyPkg && yearlyPkg
        ? Math.round((1 - (yearlyPkg.product.price / (monthlyPkg.product.price * 12))) * 100)
        : null

    return (
        <SafeAreaView style={s.safe}>

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.closeBtn} activeOpacity={0.7}>
                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRestore} disabled={restoring} activeOpacity={0.7}>
                    {restoring
                        ? <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
                        : <Text style={s.restoreText}>Restaurar</Text>
                    }
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scroll}
                bounces={false}
            >
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    {/* Hero */}
                    <View style={s.hero}>
                        <View style={s.heroIconWrap}>
                            <Text style={s.heroIcon}>🍦</Text>
                        </View>
                        <Text style={s.heroTitle}>GelatoFlow Pro</Text>
                        <Text style={s.heroSubtitle}>
                            Todas las herramientas que necesitas para hacer crecer tu negocio
                        </Text>
                    </View>

                    {/* Features */}
                    <View style={s.featuresGrid}>
                        {FEATURES.map((f, i) => (
                            <View key={i} style={s.featureCard}>
                                <Text style={s.featureIcon}>{f.icon}</Text>
                                <Text style={s.featureTitle}>{f.title}</Text>
                                <Text style={s.featureDesc}>{f.desc}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Planes */}
                    {loading ? (
                        <View style={s.loadingWrap}>
                            <ActivityIndicator color={colors.primary} />
                            <Text style={s.loadingText}>Cargando planes…</Text>
                        </View>
                    ) : packages.length === 0 ? (
                        <View style={s.loadingWrap}>
                            <Text style={s.loadingText}>No hay planes disponibles en este momento.</Text>
                        </View>
                    ) : (
                        <View style={s.plansSection}>
                            <Text style={s.plansTitle}>Elige tu plan</Text>
                            {packages.map(pkg => {
                                const isSelected = selected?.identifier === pkg.identifier
                                const isYearly = pkg.packageType === 'ANNUAL'
                                const isMonthly = pkg.packageType === 'MONTHLY'

                                return (
                                    <TouchableOpacity
                                        key={pkg.identifier}
                                        style={[s.planCard, isSelected && s.planCardSelected]}
                                        onPress={() => setSelected(pkg)}
                                        activeOpacity={0.85}
                                    >
                                        {/* Badge de ahorro */}
                                        {isYearly && savingsPct && savingsPct > 0 && (
                                            <View style={s.savingsBadge}>
                                                <Text style={s.savingsBadgeText}>Ahorra {savingsPct}%</Text>
                                            </View>
                                        )}

                                        <View style={s.planRow}>
                                            {/* Radio */}
                                            <View style={[s.radio, isSelected && s.radioSelected]}>
                                                {isSelected && <View style={s.radioDot} />}
                                            </View>

                                            {/* Info */}
                                            <View style={{ flex: 1 }}>
                                                <Text style={[s.planName, isSelected && s.planNameSelected]}>
                                                    {isYearly ? 'Anual' : isMonthly ? 'Mensual' : pkg.product.title}
                                                </Text>
                                                {isYearly && monthlyPkg && (
                                                    <Text style={s.planEquiv}>
                                                        Equivale a {(yearlyPkg!.product.price / 12).toLocaleString('es-MX', {
                                                            style: 'currency', currency: yearlyPkg!.product.currencyCode ?? 'MXN'
                                                        })}/mes
                                                    </Text>
                                                )}
                                            </View>

                                            {/* Precio */}
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={[s.planPrice, isSelected && s.planPriceSelected]}>
                                                    {pkg.product.priceString}
                                                </Text>
                                                <Text style={s.planPeriod}>
                                                    {isYearly ? '/año' : isMonthly ? '/mes' : ''}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    )}

                    {/* Nota de trial */}
                    <View style={s.trialNote}>
                        <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                        <Text style={s.trialNoteText}>
                            Cancela cuando quieras desde la tienda de apps
                        </Text>
                    </View>

                </Animated.View>
            </ScrollView>

            {/* Botón de compra fijo abajo */}
            <View style={s.footer}>
                <TouchableOpacity
                    style={[s.buyBtn, (!selected || purchasing || loading) && s.buyBtnDisabled]}
                    onPress={handlePurchase}
                    disabled={!selected || purchasing || loading}
                    activeOpacity={0.88}
                >
                    {purchasing
                        ? <ActivityIndicator color={colors.ink} />
                        : (
                            <>
                                <Ionicons name="star" size={16} color={colors.ink} style={{ marginRight: 8 }} />
                                <Text style={s.buyBtnText}>
                                    {selected
                                        ? `Suscribirse · ${selected.product.priceString}`
                                        : 'Selecciona un plan'}
                                </Text>
                            </>
                        )
                    }
                </TouchableOpacity>
                <Text style={s.footerNote}>
                    Al suscribirte aceptas los Términos de Servicio y Política de Privacidad
                </Text>
            </View>

        </SafeAreaView>
    )
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.ink },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    restoreText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },

    scroll: { paddingBottom: 160 },

    // ── Hero ──────────────────────────────────────────────────
    hero: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 8, paddingBottom: 28 },
    heroIconWrap: {
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: `${colors.primary}20`,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
    },
    heroIcon: { fontSize: 40 },
    heroTitle: {
        fontSize: 28, fontWeight: '700', color: '#fff',
        letterSpacing: -0.5, marginBottom: 10,
    },
    heroSubtitle: {
        fontSize: 15, color: 'rgba(255,255,255,0.5)',
        textAlign: 'center', lineHeight: 22,
    },

    // ── Features ──────────────────────────────────────────────
    featuresGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: 16, gap: 10,
        marginBottom: 8,
    },
    featureCard: {
        width: (width - 42) / 2,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: radius.lg,
        padding: 14,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    featureIcon: { fontSize: 22, marginBottom: 6 },
    featureTitle: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 3 },
    featureDesc: { fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 15 },

    // ── Planes ────────────────────────────────────────────────
    plansSection: { paddingHorizontal: 16, marginTop: 16 },
    plansTitle: {
        fontSize: 12, fontWeight: '600',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 0.08,
        marginBottom: 10,
    },
    planCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: radius.lg,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
    },
    planCardSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}12`,
    },
    planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    radio: {
        width: 20, height: 20, borderRadius: 10,
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center', justifyContent: 'center',
    },
    radioSelected: { borderColor: colors.primary },
    radioDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: colors.primary,
    },
    planName: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
    planNameSelected: { color: '#fff' },
    planEquiv: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    planPrice: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
    planPriceSelected: { color: colors.primary },
    planPeriod: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
    savingsBadge: {
        position: 'absolute', top: 10, right: 10,
        backgroundColor: colors.primary,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: radius.pill,
    },
    savingsBadgeText: { fontSize: 10, fontWeight: '700', color: colors.ink },

    // ── Trial note ────────────────────────────────────────────
    trialNote: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: 20, marginTop: 16,
        paddingVertical: 12, paddingHorizontal: 14,
        backgroundColor: `${colors.primary}10`,
        borderRadius: radius.md,
        borderWidth: 0.5, borderColor: `${colors.primary}20`,
    },
    trialNoteText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', flex: 1, lineHeight: 17 },

    // ── Loading ───────────────────────────────────────────────
    loadingWrap: { alignItems: 'center', padding: 32, gap: 12 },
    loadingText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },

    // ── Footer / botón ────────────────────────────────────────
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 20,
        backgroundColor: colors.ink,
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    buyBtn: {
        backgroundColor: colors.primary,
        borderRadius: radius.lg,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buyBtnDisabled: { opacity: 0.5 },
    buyBtnText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
    footerNote: {
        fontSize: 10, color: 'rgba(255,255,255,0.25)',
        textAlign: 'center', marginTop: 10, lineHeight: 14,
    },
})