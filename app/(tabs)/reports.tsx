// app/(tabs)/reports.tsx — Reportes con historial y detalle de tickets
import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Modal, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useSalesReport, useSaleDetail } from '../../hooks/useData'
import { Sale, DateFilter, PaymentMethod } from '../../lib/supabase'
import { colors } from '../../constants/theme'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'day',   label: 'Hoy' },
  { value: 'week',  label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year',  label: 'Año' },
]

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: '💵 Efectivo', card: '💳 Tarjeta', transfer: '📲 Transferencia',
}

export default function ReportsScreen() {
  const [filter, setFilter]         = useState<DateFilter>('day')
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const { data, loading } = useSalesReport(filter)

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reportes</Text>
        <Text style={styles.subtitle}>
          {format(new Date(), "dd 'de' MMMM yyyy", { locale: es })}
        </Text>
      </View>

      {/* Filtros */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.pill, filter === f.value && styles.pillActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.pillText, filter === f.value && styles.pillTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

          {/* KPIs */}
          <View style={styles.kpiRow}>
            <KPICard icon="cash-outline"    label="Ingresos"  value={`$${(data?.total ?? 0).toFixed(2)}`} color={colors.success} />
            <KPICard icon="receipt-outline" label="Ventas"    value={`${data?.count ?? 0}`}               color={colors.primary} />
          </View>
          {(data?.count ?? 0) > 0 && (
            <KPICard
              icon="trending-up-outline"
              label="Ticket promedio"
              value={`$${((data?.total ?? 0) / (data?.count ?? 1)).toFixed(2)}`}
              color={colors.accent}
              full
            />
          )}

          {/* Gráfica de barras */}
          {(data?.byDay?.length ?? 0) > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ventas por día</Text>
              <BarChart data={data!.byDay} />
            </View>
          )}

          {/* Top productos */}
          {(data?.topProducts?.length ?? 0) > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏆 Más vendidos</Text>
              {data!.topProducts.map((p, i) => (
                <View key={p.name} style={styles.topRow}>
                  <Text style={styles.rank}>#{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topName}>{p.name}</Text>
                    <Text style={styles.topQty}>{p.quantity} unidades</Text>
                  </View>
                  <Text style={styles.topRevenue}>${p.revenue.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Historial de tickets */}
          {(data?.recentSales?.length ?? 0) > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🧾 Ventas recientes</Text>
              {data!.recentSales.map(sale => (
                <TouchableOpacity
                  key={sale.id}
                  style={styles.saleRow}
                  onPress={() => setSelectedSaleId(sale.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.saleLeft}>
                    <Text style={styles.saleTime}>
                      {format(new Date(sale.created_at), 'dd/MM HH:mm')}
                    </Text>
                    <Text style={styles.salePayment}>
                      {PAYMENT_LABELS[sale.payment_method]}
                    </Text>
                  </View>
                  <View style={styles.saleRight}>
                    <Text style={styles.saleTotal}>${sale.total.toFixed(2)}</Text>
                    <Text style={styles.saleItems}>
                      {sale.sale_items?.length ?? 0} productos
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!data || data.count === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyText}>Sin ventas en este periodo</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Modal detalle de ticket */}
      <TicketModal
        saleId={selectedSaleId}
        onClose={() => setSelectedSaleId(null)}
      />
    </SafeAreaView>
  )
}

// ─── Modal Detalle de Ticket ──────────────────────────────────

function TicketModal({ saleId, onClose }: { saleId: string | null; onClose: () => void }) {
  const { sale, loading } = useSaleDetail(saleId)

  return (
    <Modal
      visible={!!saleId}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafe}>
        {/* Toolbar */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Detalle de venta</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
        ) : !sale ? null : (
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>

            {/* Info de la venta */}
            <View style={styles.ticketHeader}>
              <View style={styles.ticketHeaderLeft}>
                <Text style={styles.ticketFolio}>
                  # {sale.id.slice(0, 8).toUpperCase()}
                </Text>
                <Text style={styles.ticketDate}>
                  {format(new Date(sale.created_at), "dd 'de' MMMM, HH:mm", { locale: es })}
                </Text>
                <Text style={styles.ticketCashier}>
                  {(sale.cashier as any)?.full_name ?? (sale.cashier as any)?.email ?? 'Cajero'}
                </Text>
              </View>
              <View style={[styles.paymentBadge]}>
                <Text style={styles.paymentBadgeText}>
                  {PAYMENT_LABELS[sale.payment_method]}
                </Text>
              </View>
            </View>

            {/* Separador estilo ticket */}
            <View style={styles.divider} />

            {/* Items */}
            <View style={styles.itemsSection}>
              <View style={styles.itemsHeader}>
                <Text style={[styles.itemCol, { flex: 3 }]}>Producto</Text>
                <Text style={[styles.itemCol, { width: 40, textAlign: 'center' }]}>Cant</Text>
                <Text style={[styles.itemCol, { width: 70, textAlign: 'right' }]}>Precio</Text>
                <Text style={[styles.itemCol, { width: 75, textAlign: 'right' }]}>Subtotal</Text>
              </View>
              {(sale.sale_items ?? []).map(item => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={[styles.itemName, { flex: 3 }]} numberOfLines={2}>
                    {item.product?.name ?? 'Producto'}
                  </Text>
                  <Text style={[styles.itemValue, { width: 40, textAlign: 'center' }]}>
                    {item.quantity}
                  </Text>
                  <Text style={[styles.itemValue, { width: 70, textAlign: 'right' }]}>
                    ${item.unit_price.toFixed(2)}
                  </Text>
                  <Text style={[styles.itemValue, { width: 75, textAlign: 'right', fontWeight: '700' }]}>
                    ${item.subtotal.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${sale.total.toFixed(2)}</Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  )
}

// ─── Componentes auxiliares ───────────────────────────────────

function KPICard({ icon, label, value, color, full }: {
  icon: string; label: string; value: string; color: string; full?: boolean
}) {
  return (
    <View style={[styles.kpi, full && styles.kpiFull, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={24} color={color} />
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  )
}

function BarChart({ data }: { data: { date: string; total: number }[] }) {
  const max = Math.max(...data.map(d => d.total), 1)
  return (
    <View style={styles.chart}>
      {data.map(d => (
        <View key={d.date} style={styles.bar}>
          <Text style={styles.barAmount}>${d.total.toFixed(0)}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { height: `${Math.max((d.total / max) * 100, 4)}%` }]} />
          </View>
          <Text style={styles.barLabel}>
            {format(new Date(d.date + 'T12:00:00'), 'dd/MM')}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  title:      { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle:   { fontSize: 13, color: colors.muted, marginTop: 2 },
  filterRow: {
    flexDirection: 'row', padding: 12, gap: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  pill: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1.5, borderColor: colors.border,
  },
  pillActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText:       { fontSize: 13, fontWeight: '600', color: colors.muted },
  pillTextActive: { color: '#fff' },
  kpiRow:  { flexDirection: 'row', gap: 12 },
  kpi: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 16,
    padding: 16, borderLeftWidth: 4, gap: 4,
  },
  kpiFull:    { flex: undefined },
  kpiLabel:   { fontSize: 13, color: colors.muted },
  kpiValue:   { fontSize: 24, fontWeight: '800' },
  card:       { backgroundColor: colors.surface, borderRadius: 16, padding: 18, gap: 4 },
  cardTitle:  { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 6, marginTop: 8 },
  bar:        { flex: 1, alignItems: 'center', height: '100%' },
  barAmount:  { fontSize: 9, color: colors.muted, marginBottom: 2 },
  barTrack: {
    flex: 1, width: '100%',
    backgroundColor: `${colors.primary}20`, borderRadius: 4,
    justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill:    { width: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  barLabel:   { fontSize: 9, color: colors.muted, marginTop: 4 },
  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, borderTopWidth: 1, borderColor: colors.border,
  },
  rank:       { fontSize: 18, fontWeight: '800', color: colors.muted, width: 30 },
  topName:    { fontSize: 14, fontWeight: '600', color: colors.text },
  topQty:     { fontSize: 12, color: colors.muted },
  topRevenue: { fontSize: 15, fontWeight: '700', color: colors.primary },
  // Sales list
  saleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderTopWidth: 1, borderColor: colors.border,
  },
  saleLeft:    { flex: 1 },
  saleTime:    { fontSize: 14, fontWeight: '600', color: colors.text },
  salePayment: { fontSize: 12, color: colors.muted, marginTop: 2 },
  saleRight:   { alignItems: 'flex-end' },
  saleTotal:   { fontSize: 16, fontWeight: '800', color: colors.primary },
  saleItems:   { fontSize: 12, color: colors.muted },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText:  { fontSize: 16, color: colors.muted },
  // Modal
  modalSafe:  { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  ticketHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: colors.surface, borderRadius: 16, padding: 18,
  },
  ticketHeaderLeft: { gap: 4 },
  ticketFolio:  { fontSize: 20, fontWeight: '800', color: colors.text, fontFamily: 'monospace' },
  ticketDate:   { fontSize: 13, color: colors.muted },
  ticketCashier: { fontSize: 13, color: colors.muted },
  paymentBadge: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  paymentBadgeText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  divider: {
    borderStyle: 'dashed', borderWidth: 1,
    borderColor: colors.border, borderRadius: 1,
  },
  itemsSection: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 8 },
  itemsHeader: {
    flexDirection: 'row', paddingBottom: 8,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  itemCol:   { fontSize: 12, fontWeight: '700', color: colors.muted },
  itemRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  itemName:  { fontSize: 14, color: colors.text },
  itemValue: { fontSize: 14, color: colors.text },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 16, padding: 20,
  },
  totalLabel: { fontSize: 18, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 28, fontWeight: '800', color: colors.primary },
})