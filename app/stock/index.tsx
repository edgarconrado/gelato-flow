// app/stock/index.tsx — Alertas de stock bajo · Ink & Mint
import {
    View, Text, FlatList, StyleSheet,
    TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useLowStock, LowStockProduct } from '../../hooks/useLowStock'
import { supabase } from '../../lib/supabase'
import { colors, radius, shadow } from '../../constants/theme'

export default function StockAlertsScreen() {
    const router = useRouter()
    const { products, loading, refetch, count } = useLowStock()

    const handleAddStock = (product: LowStockProduct) => {
        Alert.prompt(
            `Agregar stock — ${product.name}`,
            `Stock actual: ${product.stock} · Mínimo: ${product.min_stock}`,
            async (value) => {
                const cantidad = parseInt(value ?? '0')
                if (isNaN(cantidad) || cantidad <= 0) return
                const { error } = await supabase
                    .from('products')
                    .update({ stock: product.stock + cantidad })
                    .eq('id', product.id)
                if (error) Alert.alert('Error', error.message)
                else refetch()
            },
            'plain-text',
            '',
            'number-pad'
        )
    }

    // Nivel de urgencia por color
    const getUrgency = (p: LowStockProduct) => {
        if (p.stock === 0) return { color: '#E53E3E', label: 'AGOTADO', icon: 'alert-circle' as const }
        if (p.stock <= p.min_stock / 2) return { color: colors.accent, label: 'CRÍTICO', icon: 'warning' as const }
        return { color: colors.amber, label: 'BAJO', icon: 'alert' as const }
    }

    return (
        <SafeAreaView style={s.safe}>

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.title}>Alertas de stock</Text>
                    <Text style={s.subtitle}>
                        {count === 0 ? 'Sin alertas activas' : `${count} producto${count !== 1 ? 's' : ''} con stock bajo`}
                    </Text>
                </View>
                <TouchableOpacity style={s.refreshBtn} onPress={refetch} disabled={loading}>
                    <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={s.center}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : count === 0 ? (
                <View style={s.center}>
                    <Text style={{ fontSize: 56, marginBottom: 16 }}>✅</Text>
                    <Text style={s.emptyTitle}>Todo en orden</Text>
                    <Text style={s.emptyDesc}>
                        Ningún producto está por debajo de su umbral mínimo de stock.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={p => p.id}
                    contentContainerStyle={s.list}
                    refreshing={loading}
                    onRefresh={refetch}
                    ListHeaderComponent={
                        <View style={s.legendRow}>
                            {[
                                { color: '#E53E3E', label: 'Agotado' },
                                { color: colors.accent, label: 'Crítico' },
                                { color: colors.amber, label: 'Stock bajo' },
                            ].map(l => (
                                <View key={l.label} style={s.legendItem}>
                                    <View style={[s.legendDot, { backgroundColor: l.color }]} />
                                    <Text style={s.legendText}>{l.label}</Text>
                                </View>
                            ))}
                        </View>
                    }
                    renderItem={({ item }) => {
                        const urgency = getUrgency(item)
                        const pct = item.min_stock > 0
                            ? Math.max(0, Math.min(100, (item.stock / item.min_stock) * 100))
                            : 0

                        return (
                            <View style={[s.card, { borderLeftColor: urgency.color, borderLeftWidth: 3 }]}>
                                {/* Icono / imagen */}
                                <View style={s.cardLeft}>
                                    {item.image_url ? (
                                        <Image
                                            source={{ uri: item.image_url }}
                                            style={s.productImage}
                                            contentFit="cover"
                                        />
                                    ) : (
                                        <View style={[s.emojiWrap, { backgroundColor: `${urgency.color}15` }]}>
                                            <Text style={{ fontSize: 24 }}>{item.category_emoji ?? '📦'}</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Info */}
                                <View style={s.cardBody}>
                                    <View style={s.cardTop}>
                                        <Text style={s.productName} numberOfLines={1}>{item.name}</Text>
                                        <View style={[s.urgencyBadge, { backgroundColor: `${urgency.color}18` }]}>
                                            <Ionicons name={urgency.icon} size={11} color={urgency.color} />
                                            <Text style={[s.urgencyText, { color: urgency.color }]}>{urgency.label}</Text>
                                        </View>
                                    </View>

                                    <Text style={s.categoryLabel}>{item.category_name ?? '—'}</Text>

                                    {/* Barra de progreso */}
                                    <View style={s.barWrap}>
                                        <View style={[s.barFill, {
                                            width: `${pct}%`,
                                            backgroundColor: urgency.color,
                                        }]} />
                                    </View>

                                    <View style={s.stockRow}>
                                        <Text style={s.stockCurrent}>
                                            <Text style={[s.stockNum, { color: urgency.color }]}>{item.stock}</Text>
                                            {' '}de {item.min_stock} mínimo
                                        </Text>
                                        {item.units_below_threshold > 0 && (
                                            <Text style={[s.stockDiff, { color: urgency.color }]}>
                                                −{item.units_below_threshold} uds
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* Botón agregar stock */}
                                <TouchableOpacity
                                    style={[s.addBtn, { backgroundColor: `${urgency.color}12`, borderColor: `${urgency.color}30` }]}
                                    onPress={() => handleAddStock(item)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="add" size={18} color={urgency.color} />
                                </TouchableOpacity>
                            </View>
                        )
                    }}
                />
            )}
        </SafeAreaView>
    )
}

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
    subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
    refreshBtn: {
        width: 36, height: 36, borderRadius: radius.md,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center', justifyContent: 'center',
    },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
    emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.ink },
    emptyDesc: { fontSize: 14, color: colors.inkMuted, textAlign: 'center', lineHeight: 20 },

    list: { padding: 16, gap: 10 },

    legendRow: {
        flexDirection: 'row', gap: 16, marginBottom: 8,
        paddingHorizontal: 4,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, color: colors.inkMuted },

    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 0.5, borderColor: colors.border,
        flexDirection: 'row', alignItems: 'center',
        overflow: 'hidden', ...shadow.sm,
    },
    cardLeft: { padding: 14 },
    productImage: {
        width: 48, height: 48, borderRadius: radius.md,
    },
    emojiWrap: {
        width: 48, height: 48, borderRadius: radius.md,
        alignItems: 'center', justifyContent: 'center',
    },

    cardBody: { flex: 1, paddingVertical: 12, paddingRight: 8 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },

    productName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
    categoryLabel: { fontSize: 11, color: colors.inkMuted, marginBottom: 8 },

    urgencyBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        paddingHorizontal: 7, paddingVertical: 3,
        borderRadius: radius.pill,
    },
    urgencyText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.04 },

    barWrap: {
        height: 5, borderRadius: 3,
        backgroundColor: colors.border,
        marginBottom: 6, overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: 3 },

    stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stockCurrent: { fontSize: 12, color: colors.inkMuted },
    stockNum: { fontWeight: '700', fontSize: 13 },
    stockDiff: { fontSize: 12, fontWeight: '600' },

    addBtn: {
        width: 44, height: '100%',
        alignItems: 'center', justifyContent: 'center',
        borderLeftWidth: 1, borderLeftColor: colors.border,
    },
})