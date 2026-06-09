// app/pos/checkout.tsx — Modal de cobro con ticket compartible
import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Linking, Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useCartStore } from '../../store'
import { useAuth } from '../../context/AuthContext'
import { PaymentMethod, CartItem } from '../../lib/supabase'
import { colors, radius, shadow } from '../../constants/theme'

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Efectivo', icon: '💵' },
  { value: 'card', label: 'Tarjeta', icon: '💳' },
  { value: 'transfer', label: 'Transferencia', icon: '📲' },
]

const PM_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia',
}

// ── Generador de HTML del ticket ──────────────────────────────

function buildTicketHTML(opts: {
  storeName: string
  folio: string
  fecha: string
  items: CartItem[]
  total: number
  paymentMethod: PaymentMethod
}) {
  const { storeName, folio, fecha, items, total, paymentMethod } = opts

  const rows = items.map(i => `
    <tr>
      <td class="item-name">${i.product.name}</td>
      <td class="item-qty">${i.quantity}</td>
      <td class="item-price">$${i.product.price.toFixed(2)}</td>
      <td class="item-total">$${(i.product.price * i.quantity).toFixed(2)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    background: #fff;
    padding: 0;
    max-width: 320px;
    margin: 0 auto;
  }
  .ticket {
    background: #fff;
    padding: 24px 20px;
    border: 1px solid #eee;
  }

  /* Header */
  .header { text-align: center; margin-bottom: 16px; }
  .logo { font-size: 32px; margin-bottom: 4px; }
  .store-name {
    font-size: 18px; font-weight: bold;
    color: #1A1A2E; letter-spacing: 1px;
    font-family: Arial, sans-serif;
  }
  .tagline { font-size: 10px; color: #9898B0; margin-top: 2px; }

  /* Divider */
  .dash { border: none; border-top: 1px dashed #ccc; margin: 12px 0; }

  /* Folio y fecha */
  .meta { font-size: 11px; color: #666; text-align: center; margin-bottom: 4px; }
  .folio { font-size: 13px; font-weight: bold; color: #1A1A2E; text-align: center; }

  /* Items */
  .items-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  .items-header th {
    font-size: 10px; color: #9898B0;
    text-align: left; padding: 4px 2px;
    border-bottom: 1px solid #eee;
    font-family: Arial, sans-serif;
  }
  .items-header th:last-child,
  .items-header th:nth-child(3) { text-align: right; }

  .item-name  { font-size: 12px; color: #1A1A2E; padding: 5px 2px; max-width: 140px; }
  .item-qty   { font-size: 12px; color: #666; text-align: center; padding: 5px 2px; width: 24px; }
  .item-price { font-size: 12px; color: #666; text-align: right; padding: 5px 2px; white-space: nowrap; }
  .item-total { font-size: 12px; color: #1A1A2E; text-align: right; padding: 5px 2px; white-space: nowrap; font-weight: bold; }

  /* Total */
  .total-row {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 8px; padding-top: 8px;
  }
  .total-label { font-size: 14px; font-weight: bold; color: #1A1A2E; font-family: Arial, sans-serif; }
  .total-amount {
    font-size: 22px; font-weight: bold;
    color: #3ECFB2; font-family: Arial, sans-serif;
    letter-spacing: -0.5px;
  }

  /* Pago */
  .pago-row {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 6px;
  }
  .pago-label { font-size: 11px; color: #9898B0; }
  .pago-value { font-size: 12px; font-weight: bold; color: #1A1A2E; }

  /* Footer */
  .footer { text-align: center; margin-top: 16px; }
  .footer-text { font-size: 10px; color: #9898B0; line-height: 1.6; }
  .footer-brand {
    font-size: 11px; font-weight: bold; color: #3ECFB2;
    font-family: Arial, sans-serif; margin-top: 6px;
  }
  .mint-bar {
    height: 3px; background: #3ECFB2;
    border-radius: 2px; margin-top: 12px;
  }
</style>
</head>
<body>
<div class="ticket">

  <div class="header">
    <div class="logo">🍦</div>
    <div class="store-name">${storeName.toUpperCase()}</div>
    <div class="tagline">Gracias por su compra</div>
  </div>

  <hr class="dash">

  <div class="folio">FOLIO: ${folio}</div>
  <div class="meta">${fecha}</div>

  <hr class="dash">

  <table class="items-table">
    <tr class="items-header">
      <th>PRODUCTO</th>
      <th style="text-align:center">CANT</th>
      <th style="text-align:right">P.U.</th>
      <th style="text-align:right">TOTAL</th>
    </tr>
    ${rows}
  </table>

  <hr class="dash">

  <div class="total-row">
    <span class="total-label">TOTAL</span>
    <span class="total-amount">$${total.toFixed(2)}</span>
  </div>
  <div class="pago-row">
    <span class="pago-label">Forma de pago</span>
    <span class="pago-value">${PM_LABELS[paymentMethod]}</span>
  </div>

  <hr class="dash">

  <div class="footer">
    <div class="footer-text">
      Este comprobante no tiene<br>validez fiscal
    </div>
    <div class="footer-brand">🍦 Gelato Flow</div>
  </div>

  <div class="mint-bar"></div>
</div>
</body>
</html>`
}

// ── Pantalla principal ────────────────────────────────────────

export default function CheckoutScreen() {
  const router = useRouter()
  const { items, total, updateQuantity, removeItem, clearCart, checkout } = useCartStore()
  const { profile } = useAuth()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [loading, setLoading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [lastFolio, setLastFolio] = useState<string | null>(null)
  const [lastItems, setLastItems] = useState<CartItem[]>([])
  const [lastTotal, setLastTotal] = useState(0)
  const [lastPM, setLastPM] = useState<PaymentMethod>('cash')
  const [saleComplete, setSaleComplete] = useState(false)

  const handleCheckout = async () => {
    if (!profile) { Alert.alert('Error', 'Sesión no válida.'); return }
    setLoading(true)

    // Guardar snapshot antes de limpiar el carrito
    const snapshotItems = [...items]
    const snapshotTotal = total()
    const snapshotPM = paymentMethod

    const { error, saleId } = await checkout(profile.store_id, profile.id, paymentMethod)
    setLoading(false)

    if (error) { Alert.alert('Error al registrar venta', error); return }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    // Guardar snapshot para poder imprimir el ticket
    setLastFolio(saleId?.slice(0, 8).toUpperCase() ?? '--------')
    setLastItems(snapshotItems)
    setLastTotal(snapshotTotal)
    setLastPM(snapshotPM)
    setSaleComplete(true)
  }

  const handleShareTicket = async () => {
    if (!lastFolio || !profile) return
    setSharing(true)

    try {
      const fecha = format(new Date(), "dd 'de' MMMM yyyy · HH:mm 'hrs'", { locale: es })
      const html = buildTicketHTML({
        storeName: profile.store?.name ?? 'Mi Tienda',
        folio: lastFolio,
        fecha,
        items: lastItems,
        total: lastTotal,
        paymentMethod: lastPM,
      })

      // Generar PDF desde HTML
      const { uri } = await Print.printToFileAsync({ html, base64: false })

      // Compartir — en Android abre el menú de compartir incluyendo WhatsApp
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Ticket ${lastFolio} — ${profile.store?.name ?? ''}`,
          UTI: 'com.adobe.pdf',
        })
      } else {
        Alert.alert('No disponible', 'Compartir no está disponible en este dispositivo.')
      }

    } catch (err: any) {
      Alert.alert('Error', 'No se pudo generar el ticket.')
    } finally {
      setSharing(false)
    }
  }

  const handleWhatsApp = async () => {
    if (!lastFolio || !profile) return

    // Mensaje de texto del ticket para WhatsApp
    const fecha = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })
    const lineas = [
      `🍦 *${(profile.store?.name ?? 'Mi Tienda').toUpperCase()}*`,
      `📋 Folio: *${lastFolio}*`,
      `📅 ${fecha}`,
      ``,
      `━━━━━━━━━━━━━━`,
      ...lastItems.map(i =>
        `• ${i.product.name}\n  ${i.quantity} × $${i.product.price.toFixed(2)} = *$${(i.product.price * i.quantity).toFixed(2)}*`
      ),
      `━━━━━━━━━━━━━━`,
      `💰 *TOTAL: $${lastTotal.toFixed(2)}*`,
      `💳 ${PM_LABELS[lastPM]}`,
      ``,
      `_Ticket Gelato Flow_`,
    ]
    const mensaje = lineas.join('\n')
    const url = `whatsapp://send?text=${encodeURIComponent(mensaje)}`

    const canOpen = await Linking.canOpenURL(url)
    if (canOpen) {
      await Linking.openURL(url)
    } else {
      // WhatsApp no instalado — compartir texto nativo
      await Share.share({ message: mensaje, title: `Ticket ${lastFolio}` })
    }
  }

  // ── Vista de venta completada ─────────────────────────────
  if (saleComplete) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successWrap}>

          {/* Ícono de éxito */}
          <View style={s.successIcon}>
            <Ionicons name="checkmark" size={36} color={colors.ink} />
          </View>

          <Text style={s.successTitle}>¡Venta registrada!</Text>
          <Text style={s.successFolio}>Folio {lastFolio}</Text>
          <Text style={s.successAmount}>${lastTotal.toFixed(2)}</Text>
          <Text style={s.successPM}>{PM_LABELS[lastPM]}</Text>

          {/* Botones de ticket */}
          <View style={s.ticketBtns}>
            {/* PDF para imprimir / compartir */}
            <TouchableOpacity
              style={s.pdfBtn}
              onPress={handleShareTicket}
              disabled={sharing}
              activeOpacity={0.85}
            >
              {sharing
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                  <Ionicons name="document-text-outline" size={18} color="#fff" />
                  <Text style={s.pdfBtnText}>Ticket PDF</Text>
                </>
              }
            </TouchableOpacity>

            {/* Texto por WhatsApp */}
            <TouchableOpacity
              style={s.waBtn}
              onPress={handleWhatsApp}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 18 }}>💬</Text>
              <Text style={s.waBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {/* Cerrar */}
          <TouchableOpacity style={s.doneBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={s.doneBtnText}>Nueva venta</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    )
  }

  // ── Vista normal del checkout ─────────────────────────────
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
            Alert.alert('Cancelar venta', '¿Vaciar todo el carrito?', [
              { text: 'No', style: 'cancel' },
              {
                text: 'Sí, vaciar', style: 'destructive', onPress: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
                  clearCart()
                  router.back()
                }
              },
            ])
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
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={s.itemRow}>
            <Text style={s.itemEmoji}>{item.product.category?.emoji ?? '🍽️'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.itemName}>{item.product.name}</Text>
              <Text style={s.itemUnit}>${item.product.price.toFixed(2)} c/u</Text>
            </View>
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
            <TouchableOpacity
              style={s.deleteItemBtn}
              onPress={() => {
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

      {/* Método de pago */}
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

// ── Estilos ───────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Toolbar
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

  // Items
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

  // Métodos de pago
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

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderTopWidth: 0.5, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  footerLabel: { fontSize: 12, color: colors.inkMuted, marginBottom: 2 },
  footerAmount: { fontSize: 28, fontWeight: '600', color: colors.ink, letterSpacing: -0.5 },
  confirmBtn: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: radius.lg },
  confirmDisabled: { opacity: 0.4 },
  confirmText: { color: colors.ink, fontSize: 16, fontWeight: '700' },

  // ── Pantalla de éxito ──
  successWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 8,
  },
  successIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    ...shadow.header,
  },
  successTitle: { fontSize: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.5 },
  successFolio: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
  successAmount: { fontSize: 40, fontWeight: '700', color: colors.ink, letterSpacing: -1, marginTop: 8 },
  successPM: { fontSize: 14, color: colors.inkMuted },

  // Botones de ticket
  ticketBtns: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  pdfBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.ink, paddingVertical: 14, borderRadius: radius.lg,
  },
  pdfBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  waBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#25D366', paddingVertical: 14, borderRadius: radius.lg,
  },
  waBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Botón nueva venta
  doneBtn: {
    marginTop: 16, width: '100%',
    paddingVertical: 16, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', backgroundColor: colors.surface,
  },
  doneBtnText: { fontSize: 15, fontWeight: '500', color: colors.inkMid },
})