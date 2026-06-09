// app/gastos/index.tsx — Módulo de gastos · Ink & Mint
import { useState } from 'react'
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, Modal, TextInput, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useExpenses, CATEGORY_INFO, ExpenseCategory, Expense } from '../../hooks/useExpenses'
import { colors, radius, shadow } from '../../constants/theme'
import { ProGate, TrialBanner } from '../../components/ProGate'

const FILTERS = [
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'year', label: 'Año' },
]

export default function GastosScreen() {
    const router = useRouter()
    const { profile } = useAuth()
    const [filter, setFilter] = useState('month')
    const [showForm, setShowForm] = useState(false)
    const { expenses, loading, fetch, total, byCategory } = useExpenses(filter)
    const isOwner = profile?.role === 'owner'

    const handleDelete = (expense: Expense) => {
        Alert.alert(
            'Eliminar gasto',
            `¿Eliminar "${expense.description}" ($${expense.amount.toFixed(2)})?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar', style: 'destructive', onPress: async () => {
                        const { error } = await supabase.from('expenses').delete().eq('id', expense.id)
                        if (error) Alert.alert('Error', error.message)
                        else fetch()
                    }
                },
            ]
        )
    }

    return (
        <ProGate feature="Módulo de Gastos">
            <SafeAreaView style={s.safe}>
                <TrialBanner />

                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                        <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={s.title}>Gastos</Text>
                        <Text style={s.subtitle}>{profile?.store?.name ?? '—'}</Text>
                    </View>
                    {isOwner && (
                        <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
                            <Ionicons name="add" size={18} color={colors.ink} />
                            <Text style={s.addBtnText}>Agregar</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filtros */}
                <View style={s.filterRow}>
                    {FILTERS.map(f => (
                        <TouchableOpacity
                            key={f.value}
                            style={[s.pill, filter === f.value && s.pillActive]}
                            onPress={() => setFilter(f.value)}
                        >
                            <Text style={[s.pillText, filter === f.value && s.pillTextActive]}>{f.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading ? (
                    <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
                ) : (
                    <FlatList
                        data={expenses}
                        keyExtractor={e => e.id}
                        contentContainerStyle={s.list}
                        refreshing={loading}
                        onRefresh={fetch}
                        ListHeaderComponent={
                            <>
                                {/* Total del período */}
                                <View style={s.totalCard}>
                                    <View>
                                        <Text style={s.totalLabel}>TOTAL GASTOS</Text>
                                        <Text style={s.totalAmount}>${total.toFixed(2)}</Text>
                                        <Text style={s.totalSub}>{expenses.length} registro{expenses.length !== 1 ? 's' : ''}</Text>
                                    </View>
                                    <View style={s.totalIcon}>
                                        <Ionicons name="trending-down" size={28} color={colors.accent} />
                                    </View>
                                </View>

                                {/* Por categoría */}
                                {byCategory.length > 0 && (
                                    <View style={[s.card, { marginBottom: 8 }]}>
                                        <Text style={s.sectionTitle}>Por categoría</Text>
                                        {byCategory.map((c, i) => {
                                            const info = CATEGORY_INFO[c.category]
                                            const pct = total > 0 ? (c.total / total) * 100 : 0
                                            return (
                                                <View key={c.category} style={[s.catRow, i > 0 && s.catRowBorder]}>
                                                    <Text style={{ fontSize: 20, width: 28 }}>{info.emoji}</Text>
                                                    <View style={{ flex: 1 }}>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                            <Text style={s.catLabel}>{info.label}</Text>
                                                            <Text style={s.catAmount}>${c.total.toFixed(2)}</Text>
                                                        </View>
                                                        <View style={s.barWrap}>
                                                            <View style={[s.barFill, { width: `${pct}%`, backgroundColor: info.color }]} />
                                                        </View>
                                                    </View>
                                                    <Text style={s.catPct}>{pct.toFixed(0)}%</Text>
                                                </View>
                                            )
                                        })}
                                    </View>
                                )}

                                {expenses.length > 0 && (
                                    <Text style={[s.sectionTitle, { marginBottom: 8, paddingHorizontal: 4 }]}>
                                        Historial
                                    </Text>
                                )}
                            </>
                        }
                        renderItem={({ item }) => {
                            const info = CATEGORY_INFO[item.category]
                            return (
                                <View style={s.expenseCard}>
                                    <View style={[s.expenseEmoji, { backgroundColor: `${info.color}18` }]}>
                                        <Text style={{ fontSize: 20 }}>{info.emoji}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.expenseDesc} numberOfLines={1}>{item.description}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                                            <View style={[s.catBadge, { backgroundColor: `${info.color}18` }]}>
                                                <Text style={[s.catBadgeText, { color: info.color }]}>{info.label}</Text>
                                            </View>
                                            <Text style={s.expenseDate}>
                                                {format(new Date(item.date + 'T12:00:00'), "d 'de' MMM", { locale: es })}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={s.expenseAmount}>−${item.amount.toFixed(2)}</Text>
                                    {isOwner && (
                                        <TouchableOpacity
                                            onPress={() => handleDelete(item)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            style={{ marginLeft: 4 }}
                                        >
                                            <Ionicons name="trash-outline" size={16} color={colors.accent} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )
                        }}
                        ListEmptyComponent={
                            <View style={s.center}>
                                <Text style={{ fontSize: 48, marginBottom: 12 }}>💸</Text>
                                <Text style={s.emptyTitle}>Sin gastos registrados</Text>
                                <Text style={s.emptyDesc}>
                                    {isOwner
                                        ? 'Toca "Agregar" para registrar el primer gasto del período.'
                                        : 'El propietario aún no ha registrado gastos.'}
                                </Text>
                            </View>
                        }
                    />
                )}

                {/* Modal agregar gasto */}
                {isOwner && (
                    <AddExpenseModal
                        visible={showForm}
                        onClose={() => setShowForm(false)}
                        onSaved={() => { setShowForm(false); fetch() }}
                        storeId={profile!.store_id}
                        userId={profile!.id}
                    />
                )}
            </SafeAreaView>
        </ProGate>
    )
}

// ─── Modal agregar gasto ──────────────────────────────────────

function AddExpenseModal({ visible, onClose, onSaved, storeId, userId }: {
    visible: boolean; onClose: () => void; onSaved: () => void
    storeId: string; userId: string
}) {
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState<ExpenseCategory>('ingredientes')
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        const amt = parseFloat(amount)
        if (isNaN(amt) || amt <= 0) { Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.'); return }
        if (!description.trim()) { Alert.alert('Descripción requerida'); return }

        setSaving(true)
        const { error } = await supabase.from('expenses').insert({
            store_id: storeId,
            created_by: userId,
            amount: amt,
            category,
            description: description.trim(),
            date,
        })
        setSaving(false)

        if (error) { Alert.alert('Error', error.message); return }

        setAmount(''); setDescription(''); setCategory('ingredientes')
        setDate(format(new Date(), 'yyyy-MM-dd'))
        onSaved()
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={s.safe}>
                <View style={s.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                    <Text style={[s.title, { flex: 1, textAlign: 'center', fontSize: 17 }]}>Nuevo gasto</Text>
                    <View style={{ width: 22 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, gap: 4, paddingBottom: 90 }} keyboardShouldPersistTaps="handled">

                    {/* Monto grande */}
                    <View style={s.amountWrap}>
                        <Text style={s.amountPrefix}>$</Text>
                        <TextInput
                            style={s.amountInput}
                            placeholder="0.00"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            keyboardType="decimal-pad"
                            value={amount}
                            onChangeText={setAmount}
                            autoFocus
                        />
                    </View>

                    {/* Descripción */}
                    <Text style={s.formLabel}>Descripción</Text>
                    <TextInput
                        style={s.input}
                        placeholder="Ej: Compra de frutas en el mercado"
                        placeholderTextColor={colors.inkMuted}
                        value={description}
                        onChangeText={setDescription}
                    />

                    {/* Categoría */}
                    <Text style={s.formLabel}>Categoría</Text>
                    <View style={s.catGrid}>
                        {(Object.entries(CATEGORY_INFO) as [ExpenseCategory, typeof CATEGORY_INFO['otro']][]).map(([key, info]) => (
                            <TouchableOpacity
                                key={key}
                                style={[s.catOption, category === key && s.catOptionActive]}
                                onPress={() => setCategory(key)}
                                activeOpacity={0.8}
                            >
                                <Text style={{ fontSize: 20 }}>{info.emoji}</Text>
                                <Text style={[s.catOptionText, category === key && s.catOptionTextActive]}>
                                    {info.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Fecha */}
                    <Text style={s.formLabel}>Fecha</Text>
                    <TextInput
                        style={s.input}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.inkMuted}
                        value={date}
                        onChangeText={setDate}
                        keyboardType="numbers-and-punctuation"
                    />

                    {/* Guardar */}
                    <TouchableOpacity
                        style={[s.saveBtn, saving && { opacity: 0.6 }]}
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.85}
                    >
                        {saving
                            ? <ActivityIndicator color={colors.ink} />
                            : <Text style={s.saveBtnText}>Registrar gasto</Text>
                        }
                    </TouchableOpacity>

                </ScrollView>
            </SafeAreaView>
        </Modal>
    )
}

// ─── Estilos ─────────────────────────────────────────────────

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
    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.primary,
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.md,
    },
    addBtnText: { color: colors.ink, fontWeight: '700', fontSize: 13 },

    filterRow: {
        flexDirection: 'row', padding: 14, gap: 8,
        backgroundColor: colors.ink,
        borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
        ...shadow.header,
    },
    pill: {
        flex: 1, paddingVertical: 8, borderRadius: radius.pill,
        alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)',
    },
    pillActive: { backgroundColor: colors.primary },
    pillText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.55)' },
    pillTextActive: { color: colors.ink, fontWeight: '700' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.ink },
    emptyDesc: { fontSize: 14, color: colors.inkMuted, textAlign: 'center', lineHeight: 20 },

    list: { padding: 16, gap: 10, paddingBottom: 40 },

    // Total card
    totalCard: {
        backgroundColor: colors.ink, borderRadius: radius.xl,
        padding: 20, marginBottom: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        ...shadow.header,
    },
    totalLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.06 },
    totalAmount: { fontSize: 32, fontWeight: '700', color: colors.accent, letterSpacing: -0.5, marginVertical: 4 },
    totalSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
    totalIcon: {
        width: 56, height: 56, borderRadius: 16,
        backgroundColor: `${colors.accent}15`,
        alignItems: 'center', justifyContent: 'center',
    },

    card: {
        backgroundColor: colors.surface, borderRadius: radius.lg,
        padding: 16, borderWidth: 0.5, borderColor: colors.border, ...shadow.sm,
    },
    sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 8 },

    // Categorías
    catRow: { paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
    catRowBorder: { borderTopWidth: 0.5, borderTopColor: colors.border },
    catLabel: { fontSize: 13, fontWeight: '500', color: colors.ink },
    catAmount: { fontSize: 13, fontWeight: '600', color: colors.ink },
    barWrap: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 2 },
    catPct: { fontSize: 11, color: colors.inkMuted, width: 32, textAlign: 'right' },

    // Expense card
    expenseCard: {
        backgroundColor: colors.surface, borderRadius: radius.lg,
        padding: 14, borderWidth: 0.5, borderColor: colors.border,
        flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow.sm,
    },
    expenseEmoji: {
        width: 44, height: 44, borderRadius: radius.md,
        alignItems: 'center', justifyContent: 'center',
    },
    expenseDesc: { fontSize: 14, fontWeight: '500', color: colors.ink },
    expenseDate: { fontSize: 11, color: colors.inkMuted },
    expenseAmount: { fontSize: 15, fontWeight: '700', color: colors.accent },
    catBadge: {
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill,
    },
    catBadgeText: { fontSize: 10, fontWeight: '600' },

    // Form
    amountWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.ink, borderRadius: radius.xl,
        padding: 24, gap: 8, marginBottom: 8,
    },
    amountPrefix: { fontSize: 36, fontWeight: '300', color: 'rgba(255,255,255,0.5)' },
    amountInput: {
        flex: 1, fontSize: 48, fontWeight: '700',
        color: '#fff', letterSpacing: -1,
        includeFontPadding: false, padding: 0,
    },
    formLabel: { fontSize: 12, fontWeight: '500', color: colors.inkMuted, marginTop: 16, marginBottom: 6 },
    input: {
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 15, color: colors.ink, backgroundColor: colors.surface,
    },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catOption: {
        width: '22%', alignItems: 'center', gap: 4,
        paddingVertical: 12, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    catOptionActive: { borderColor: colors.ink, backgroundColor: colors.ink },
    catOptionText: { fontSize: 10, fontWeight: '500', color: colors.inkMid, textAlign: 'center' },
    catOptionTextActive: { color: '#fff' },
    saveBtn: {
        backgroundColor: colors.primary, borderRadius: radius.md,
        paddingVertical: 17, alignItems: 'center', marginTop: 24,
        flexDirection: 'row', justifyContent: 'center',
    },
    saveBtnText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
})