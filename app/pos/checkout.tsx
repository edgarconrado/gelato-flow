// app/pos/checkout.tsx — Modal de cobro · Ink & Mint design
import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useCartStore } from '../../store'
import { useAuth } from '../../context/AuthContext'
import { PaymentMethod } from '../../lib/supabase'
import { colors, radius, shadow } from '../../constants/theme'

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Efectivo', icon: '💵' },
  { value: 'card', label: 'Tarjeta', icon: '💳' },
  { value: 'transfer', label: 'Transferencia', icon: '📲' },
]

export default function CheckoutScreen() {
  const router = useRouter()
  const { items, total, updateQuantity, removeItem, clearCart, checkout } = useCartStore()
  const { profile } = useAuth()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    if (!profile) { Alert.alert('Error', 'Sesión no válida.'); return }
    setLoading(true)
    const { error, saleId } = await checkout(profile.store_id, profile.id, paymentMethod)
    setLoading(false)
    if (error) { Alert.alert('Error al registrar venta', error); return }
    Alert.alert(
      '✓ Venta registrada',
      `Folio: ${saleId?.slice(0, 8).toUpperCase()}`,
      [{ text: 'Listo', onPress: () => router.back() }]
    )
  }

  return (
    <SafeAreaView style={s.safe}>

      {/* Toolbar */}
      <View style={s.toolbar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-down" size={22} color={colors.inkMid} />
        </TouchableOpacity>
        <Text style={s.toolbarTitle}>Resumen</Text>
        <TouchableOpacity
          style={s.clearAllBtn}
          onPress={() =>
            Alert.alert(
              'Cancelar venta',
              '¿Vaciar todo el carrito?',
              [
                { text: 'No', style: 'cancel' },
                { text: 'Sí, vaciar', style: 'destructive', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); clearCart(); router.back() } },
              ]
            )
          }
        >
          <Ionicons name="trash-outline" size={16} color={colors.accent} />
          <Text style={s.clearBtn}>Cancelar</Text>
        </TouchableOpacity>
      </View>

      {/* Items */}
      <FlatList
        data={items}
        keyExtractor={i => i.product.id}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        renderItem={({ item }) => (
          <View style={s.itemRow}>
            {/* Emoji / imagen */}
            {(item.product as any).image_url ? (
              <View style={s.itemImageWrap}>
                <Text style={{ fontSize: 0 }} />
              </View>
            ) : (
              <Text style={s.itemEmoji}>{item.product.category?.emoji ?? '🍽️'}</Text>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.itemName}>{item.product.name}</Text>
              <Text style={s.itemUnit}>${item.product.price.toFixed(2)} c/u</Text>
            </View>
            {/* Controles de cantidad */}
            <View style={s.qtyCtrl}>
              <TouchableOpacity
                style={s.qtyBtn}
                onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
              >
                <Ionicons name="remove" size={14} color={colors.inkMid} />
              </TouchableOpacity>
              <Text style={s.qty}>{item.quantity}</Text>
              <TouchableOpacity
                style={s.qtyBtn}
                onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
              >
                <Ionicons name="add" size={14} color={colors.inkMid} />
              </TouchableOpacity>
            </View>
            <Text style={s.itemSubtotal}>
              ${(item.product.price * item.quantity).toFixed(2)}
            </Text>
            {/* Botón eliminar item */}
            <TouchableOpacity
              style={s.deleteItemBtn}
              onPress={() => {
                // Warning haptic al eliminar — distinto al de agregar
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                removeItem(item.product.id)
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>El carrito está vacío</Text>
          </View>
        }
      />

      {/* Payment method */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Método de pago</Text>
        <View style={s.pmRow}>
          {PAYMENT_METHODS.map(pm => (
            <TouchableOpacity
              key={pm.value}
              style={[s.pmChip, paymentMethod === pm.value && s.pmChipActive]}
              onPress={() => setPaymentMethod(pm.value)}
              activeOpacity={0.8}
            >
              <Text style={s.pmIcon}>{pm.icon}</Text>
              <Text style={[s.pmLabel, paymentMethod === pm.value && s.pmLabelActive]}>
                {pm.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <View>
          <Text style={s.footerLabel}>Total a cobrar</Text>
          <Text style={s.footerAmount}>${total().toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[s.confirmBtn, (loading || items.length === 0) && s.confirmDisabled]}
          onPress={handleCheckout}
          disabled={loading || items.length === 0}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={colors.ink} />
            : <Text style={s.confirmText}>Cobrar</Text>
          }
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  toolbarTitle: { fontSize: 17, fontWeight: '600', color: colors.ink, letterSpacing: -0.3 },
  clearAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: `${colors.accent}12`,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: `${colors.accent}30`,
  },
  clearBtn: { color: colors.accent, fontWeight: '600', fontSize: 13 },
  deleteItemBtn: { marginLeft: 4 },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 14, borderWidth: 0.5, borderColor: colors.border,
  },
  itemEmoji: { fontSize: 26 },
  itemName: { fontSize: 14, fontWeight: '500', color: colors.ink },
  itemUnit: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  qtyCtrl: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.background, borderRadius: radius.md,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  qtyBtn: { padding: 2 },
  qty: { fontSize: 15, fontWeight: '600', color: colors.ink, minWidth: 20, textAlign: 'center' },
  itemSubtotal: { fontSize: 15, fontWeight: '600', color: colors.ink, minWidth: 60, textAlign: 'right' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: colors.inkMuted, fontSize: 15 },

  section: { paddingHorizontal: 20, paddingBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '500', color: colors.inkMuted, marginBottom: 10, letterSpacing: 0.04 },
  pmRow: { flexDirection: 'row', gap: 10 },
  pmChip: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pmChipActive: { borderColor: colors.ink, backgroundColor: colors.ink },
  pmIcon: { fontSize: 18, marginBottom: 4 },
  pmLabel: { fontSize: 11, fontWeight: '500', color: colors.inkMid },
  pmLabelActive: { color: '#fff' },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderTopWidth: 0.5, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  footerLabel: { fontSize: 12, color: colors.inkMuted, marginBottom: 2 },
  footerAmount: { fontSize: 28, fontWeight: '600', color: colors.ink, letterSpacing: -0.5 },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32, paddingVertical: 16, borderRadius: radius.lg,
  },
  confirmDisabled: { opacity: 0.4 },
  confirmText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
})