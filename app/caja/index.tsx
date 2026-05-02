// app/caja/index.tsx — Cierre de caja · Ink & Mint
import { useEffect, useState } from 'react'
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, Share, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useCierreCaja } from '../../hooks/useCierreCaja'
import { useAuth } from '../../context/AuthContext'
import { colors, radius, shadow } from '../../constants/theme'

const PM_INFO = {
    cash: { label: 'Efectivo', icon: '💵', color: '#3ECFB2' },
    card: { label: 'Tarjeta', icon: '💳', color: '#F5A623' },
    transfer: { label: 'Transferencia', icon: '📲', color: '#9898B0' },
}

export default function CierreCajaScreen() {
    const router = useRouter()
    const { profile } = useAuth()
    const [date] = useState(new Date())
    const { data, loading, fetch } = useCierreCaja(date)

    useEffect(() => { fetch() }, [])

    // ── Generar texto para WhatsApp ───────────────────────────────
    const generarMensajeWhatsApp = () => {
        if (!data) return ''

        const lineas = [
            `🍦 *CIERRE DE CAJA — GELATO FLOW*`,
            `📅 ${data.fecha.toUpperCase()}`,
            `🏪 ${profile?.store?.name ?? 'Mi tienda'}`,
            ``,
            `━━━━━━━━━━━━━━━━━━━━`,
            `💰 *RESUMEN GENERAL*`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `Total de ventas:  $${data.totalGeneral.toFixed(2)}`,
            `Núm. de tickets:  ${data.totalVentas}`,
            `Ticket promedio:  $${data.ticketPromedio.toFixed(2)}`,
            ``,
            `━━━━━━━━━━━━━━━━━━━━`,
            `💳 *POR MÉTODO DE PAGO*`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `💵 Efectivo:       $${data.porMetodo.cash.total.toFixed(2)} (${data.porMetodo.cash.count} vtas)`,
            `💳 Tarjeta:        $${data.porMetodo.card.total.toFixed(2)} (${data.porMetodo.card.count} vtas)`,
            `📲 Transferencia:  $${data.porMetodo.transfer.total.toFixed(2)} (${data.porMetodo.transfer.count} vtas)`,
        ]

        if (data.productoTop) {
            lineas.push(``)
            lineas.push(`⭐ *MÁS VENDIDO DEL DÍA*`)
            lineas.push(`${data.productoTop.name} — ${data.productoTop.quantity} uds · $${data.productoTop.revenue.toFixed(2)}`)
        }

        if (data.primerVenta && data.ultimaVenta) {
            lineas.push(``)
            lineas.push(`🕐 Primer ticket: ${data.primerVenta} hrs`)
            lineas.push(`🕐 Último ticket: ${data.ultimaVenta} hrs`)
        }

        if (data.horaPico) {
            lineas.push(`⚡ Hora pico: ${data.horaPico} hrs`)
        }

        lineas.push(``)
        lineas.push(`_Generado con Gelato Flow_`)

        return lineas.join('\n')
    }

    const handleCompartirWhatsApp = async () => {
        const mensaje = generarMensajeWhatsApp()
        if (!mensaje) return

        // Intentar abrir WhatsApp directamente
        const url = `whatsapp://send?text=${encodeURIComponent(mensaje)}`
        const canOpen = await Linking.canOpenURL(url)

        if (canOpen) {
            await Linking.openURL(url)
        } else {
            // Fallback: compartir nativo del sistema
            await Share.share({ message: mensaje, title: 'Cierre de Caja — Gelato Flow' })
        }
    }

    const handleCompartir = async () => {
        const mensaje = generarMensajeWhatsApp()
        if (!mensaje) return
        await Share.share({ message: mensaje, title: 'Cierre de Caja — Gelato Flow' })
    }

    return (
        <SafeAreaView style={s.safe}>

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.title}>Cierre de caja</Text>
                    <Text style={s.subtitle}>
                        {format(date, "EEEE d 'de' MMMM", { locale: es })}
                    </Text>
                </View>
                <TouchableOpacity style={s.refreshBtn} onPress={fetch} disabled={loading}>
                    <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={s.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={s.loadingText}>Calculando cierre…</Text>
                </View>
            ) : !data || data.totalVentas === 0 ? (
                <View style={s.center}>
                    <Text style={{ fontSize: 48, marginBottom: 16 }}>🍦</Text>
                    <Text style={s.emptyTitle}>Sin ventas hoy</Text>
                    <Text style={s.emptyDesc}>Cuando registres ventas aparecerán aquí el cierre del día.</Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>

                    {/* Tienda y fecha */}
                    <View style={s.storeCard}>
                        <View style={s.storeIconWrap}>
                            <Ionicons name="storefront" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.storeName}>{profile?.store?.name ?? 'Mi tienda'}</Text>
                            <Text style={s.storeDate}>{data.fecha}</Text>
                        </View>
                        <View style={s.statusBadge}>
                            <View style={s.statusDot} />
                            <Text style={s.statusText}>Cierre del día</Text>
                        </View>
                    </View>

                    {/* KPIs principales */}
                    <View style={s.kpiRow}>
                        <KPICard
                            label="INGRESOS TOTALES"
                            value={`$${data.totalGeneral.toFixed(2)}`}
                            highlight
                        />
                        <View style={s.kpiCol}>
                            <KPICard label="VENTAS" value={`${data.totalVentas}`} small />
                            <KPICard label="TICKET PROM." value={`$${data.ticketPromedio.toFixed(2)}`} small />
                        </View>
                    </View>

                    {/* Por método de pago */}
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Por método de pago</Text>
                        <View style={s.card}>
                            {(Object.entries(PM_INFO) as [keyof typeof PM_INFO, typeof PM_INFO['cash']][]).map(([key, info], idx) => {
                                const m = data.porMetodo[key]
                                const pct = data.totalGeneral > 0 ? (m.total / data.totalGeneral) * 100 : 0
                                return (
                                    <View key={key} style={[s.pmRow, idx < 2 && s.pmRowBorder]}>
                                        <Text style={s.pmIcon}>{info.icon}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.pmLabel}>{info.label}</Text>
                                            <View style={s.barWrap}>
                                                <View style={[s.barFill, { width: `${pct}%`, backgroundColor: info.color }]} />
                                            </View>
                                        </View>
                                        <View style={s.pmRight}>
                                            <Text style={s.pmTotal}>${m.total.toFixed(2)}</Text>
                                            <Text style={s.pmCount}>{m.count} {m.count === 1 ? 'venta' : 'ventas'}</Text>
                                        </View>
                                    </View>
                                )
                            })}
                        </View>
                    </View>

                    {/* Producto estrella */}
                    {data.productoTop && (
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>Producto estrella del día</Text>
                            <View style={[s.card, s.starCard]}>
                                <View style={s.starLeft}>
                                    <Text style={s.starBadge}>⭐ #1</Text>
                                    <Text style={s.starName}>{data.productoTop.name}</Text>
                                    <Text style={s.starDesc}>
                                        {data.productoTop.quantity} unidades vendidas
                                    </Text>
                                </View>
                                <Text style={s.starRevenue}>${data.productoTop.revenue.toFixed(2)}</Text>
                            </View>
                        </View>
                    )}

                    {/* Horarios */}
                    {(data.primerVenta || data.horaPico) && (
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>Horarios del día</Text>
                            <View style={s.card}>
                                {data.primerVenta && (
                                    <View style={[s.horaRow, s.pmRowBorder]}>
                                        <View style={s.horaIconWrap}>
                                            <Ionicons name="sunny-outline" size={16} color={colors.primary} />
                                        </View>
                                        <Text style={s.horaLabel}>Primera venta</Text>
                                        <Text style={s.horaValue}>{data.primerVenta} hrs</Text>
                                    </View>
                                )}
                                {data.ultimaVenta && (
                                    <View style={[s.horaRow, s.pmRowBorder]}>
                                        <View style={s.horaIconWrap}>
                                            <Ionicons name="moon-outline" size={16} color={colors.inkMuted} />
                                        </View>
                                        <Text style={s.horaLabel}>Última venta</Text>
                                        <Text style={s.horaValue}>{data.ultimaVenta} hrs</Text>
                                    </View>
                                )}
                                {data.horaPico && (
                                    <View style={s.horaRow}>
                                        <View style={[s.horaIconWrap, { backgroundColor: `${colors.amber}20` }]}>
                                            <Ionicons name="flash-outline" size={16} color={colors.amber} />
                                        </View>
                                        <Text style={s.horaLabel}>Hora pico</Text>
                                        <Text style={s.horaValue}>{data.horaPico}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    <View style={{ height: 20 }} />

                </ScrollView>
            )}

            {/* Footer con botones de compartir */}
            {!loading && data && data.totalVentas > 0 && (
                <View style={s.footer}>
                    <TouchableOpacity style={s.shareBtn} onPress={handleCompartir} activeOpacity={0.8}>
                        <Ionicons name="share-outline" size={18} color={colors.inkMid} />
                        <Text style={s.shareBtnText}>Compartir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.whatsappBtn} onPress={handleCompartirWhatsApp} activeOpacity={0.85}>
                        <Text style={{ fontSize: 18 }}>💬</Text>
                        <Text style={s.whatsappBtnText}>Enviar por WhatsApp</Text>
                    </TouchableOpacity>
                </View>
            )}

        </SafeAreaView>
    )
}

// ── Componentes internos ──────────────────────────────────────

function KPICard({ label, value, highlight, small }: {
    label: string; value: string; highlight?: boolean; small?: boolean
}) {
    return (
        <View style={[s.kpi, highlight && s.kpiHighlight, small && s.kpiSmall]}>
            <Text style={[s.kpiLabel, highlight && s.kpiLabelHighlight]}>{label}</Text>
            <Text style={[s.kpiValue, highlight && s.kpiValueHighlight, small && s.kpiValueSmall]}>
                {value}
            </Text>
        </View>
    )
}

// ── Estilos ───────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    header: {
        backgroundColor: colors.ink,
        paddingHorizontal: 20, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        ...shadow.header,
    },
    backBtn: { padding: 2 },
    title: { fontSize: 18, fontWeight: '600', color: '#fff', letterSpacing: -0.3 },
    subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1, textTransform: 'capitalize' },
    refreshBtn: {
        width: 36, height: 36, borderRadius: radius.md,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center', justifyContent: 'center',
    },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    loadingText: { color: colors.inkMuted, fontSize: 14, marginTop: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.ink },
    emptyDesc: { fontSize: 14, color: colors.inkMuted, textAlign: 'center', lineHeight: 20 },

    body: { padding: 20, gap: 16 },

    storeCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg, padding: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderWidth: 0.5, borderColor: colors.border,
        ...shadow.sm,
    },
    storeIconWrap: {
        width: 40, height: 40, borderRadius: radius.md,
        backgroundColor: colors.primaryLight,
        alignItems: 'center', justifyContent: 'center',
    },
    storeName: { fontSize: 15, fontWeight: '600', color: colors.ink },
    storeDate: { fontSize: 12, color: colors.inkMuted, marginTop: 1, textTransform: 'capitalize' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.primary },
    statusText: { fontSize: 11, color: colors.primary, fontWeight: '500' },

    // KPIs
    kpiRow: { flexDirection: 'row', gap: 12, height: 120 },
    kpiCol: { flex: 1, gap: 12 },
    kpi: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg, padding: 14,
        borderWidth: 0.5, borderColor: colors.border,
        justifyContent: 'space-between',
        ...shadow.sm,
    },
    kpiHighlight: { backgroundColor: colors.ink, borderColor: colors.ink },
    kpiSmall: { padding: 10 },
    kpiLabel: { fontSize: 10, fontWeight: '600', color: colors.inkMuted, letterSpacing: 0.06 },
    kpiLabelHighlight: { color: 'rgba(255,255,255,0.45)' },
    kpiValue: { fontSize: 22, fontWeight: '600', color: colors.ink, letterSpacing: -0.4 },
    kpiValueHighlight: { color: colors.primary, fontSize: 24 },
    kpiValueSmall: { fontSize: 16 },

    // Secciones
    section: {},
    sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 10 },
    card: {
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 0.5, borderColor: colors.border,
        overflow: 'hidden', ...shadow.sm,
    },

    // Por método
    pmRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    pmRowBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.border },
    pmIcon: { fontSize: 22, width: 32, textAlign: 'center' },
    pmLabel: { fontSize: 13, fontWeight: '500', color: colors.ink, marginBottom: 6 },
    barWrap: {
        height: 4, borderRadius: 2,
        backgroundColor: colors.border, overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: 2 },
    pmRight: { alignItems: 'flex-end' },
    pmTotal: { fontSize: 15, fontWeight: '600', color: colors.ink },
    pmCount: { fontSize: 11, color: colors.inkMuted, marginTop: 2 },

    // Estrella
    starCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, gap: 12,
    },
    starLeft: { flex: 1 },
    starBadge: {
        fontSize: 11, fontWeight: '600', color: colors.primaryDark,
        backgroundColor: colors.primaryLight,
        alignSelf: 'flex-start',
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: radius.pill, marginBottom: 6,
    },
    starName: { fontSize: 15, fontWeight: '600', color: colors.ink },
    starDesc: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
    starRevenue: { fontSize: 20, fontWeight: '600', color: colors.primary, letterSpacing: -0.3 },

    // Horarios
    horaRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    },
    horaIconWrap: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: colors.primaryLight,
        alignItems: 'center', justifyContent: 'center',
    },
    horaLabel: { flex: 1, fontSize: 13, color: colors.inkMid },
    horaValue: { fontSize: 14, fontWeight: '600', color: colors.ink },

    // Footer
    footer: {
        flexDirection: 'row', gap: 12,
        padding: 20, paddingBottom: 24,
        borderTopWidth: 0.5, borderTopColor: colors.border,
        backgroundColor: colors.surface,
    },
    shareBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 7,
        paddingHorizontal: 18, paddingVertical: 14,
        borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.background,
    },
    shareBtnText: { fontSize: 14, fontWeight: '500', color: colors.inkMid },
    whatsappBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 8,
        backgroundColor: '#25D366',
        paddingVertical: 14, borderRadius: radius.lg,
    },
    whatsappBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})