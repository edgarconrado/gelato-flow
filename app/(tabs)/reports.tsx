// app/(tabs)/reports.tsx — Ink & Mint design
import { useState } from 'react'
import {
  View, Text, StyleSheet, SafeAreaView as RNSafeArea,
  ScrollView, TouchableOpacity, ActivityIndicator, Modal, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSalesReport, useSaleDetail } from '../../hooks/useData'
import { Sale, DateFilter, PaymentMethod } from '../../lib/supabase'
import { colors, radius, shadow } from '../../constants/theme'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'day', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
]

const PM_LABELS: Record<PaymentMethod, string> = {
  cash: '💵 Efectivo', card: '💳 Tarjeta', transfer: '📲 Transferencia',
}

export default function ReportsScreen() {
  const router = useRouter()
  const [filter, setFilter] = useState<DateFilter>('day')
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const { data, loading } = useSalesReport(filter)

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Reportes</Text>
          <Text style={s.subtitle}>{format(new Date(), "dd 'de' MMMM", { locale: es })}</Text>
        </View>
        <TouchableOpacity
          style={s.cierrBtn}
          onPress={() => router.push('/caja')}
          activeOpacity={0.85}
        >
          <Ionicons name="calculator-outline" size={15} color={colors.ink} />
          <Text style={s.cierrBtnText}>Cierre</Text>
        </TouchableOpacity>
      </View>

      {/* Filter pills */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[s.pill, filter === f.value && s.pillActive]}
            onPress={() => setFilter(f.value)}
            activeOpacity={0.8}
          >
            <Text style={[s.pillText, filter === f.value && s.pillTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>

          {/* KPIs */}
          <View style={s.kpiRow}>
            <View style={s.kpi}>
              <Text style={s.kpiLabel}>INGRESOS</Text>
              <Text style={s.kpiValue}>${(data?.total ?? 0).toFixed(2)}</Text>
              <Text style={s.kpiSub}>{data?.count ?? 0} ventas</Text>
            </View>
            <View style={s.kpi}>
              <Text style={s.kpiLabel}>TICKET PROM.</Text>
              <Text style={s.kpiValue}>
                ${((data?.total ?? 0) / Math.max(data?.count ?? 1, 1)).toFixed(2)}
              </Text>
              <Text style={s.kpiSub}>por venta</Text>
            </View>
          </View>

          {/* Bar chart */}
          {(data?.byDay?.length ?? 0) > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Ventas por día</Text>
              <BarChart data={data!.byDay} />
            </View>
          )}

          {/* Top products */}
          {(data?.topProducts?.length ?? 0) > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Más vendidos</Text>
              {data!.topProducts.map((p, i) => (
                <View key={p.name} style={s.topRow}>
                  <View style={[s.rankBadge, i === 0 && s.rankBadgeGold]}>
                    <Text style={s.rankText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.topName}>{p.name}</Text>
                    <Text style={s.topQty}>{p.quantity} unidades</Text>
                  </View>
                  <Text style={s.topRevenue}>${p.revenue.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Recent sales */}
          {(data?.recentSales?.length ?? 0) > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Ventas recientes</Text>
              {data!.recentSales.map(sale => (
                <TouchableOpacity
                  key={sale.id}
                  style={s.saleRow}
                  onPress={() => setSelectedSaleId(sale.id)}
                  activeOpacity={0.7}
                >
                  <View style={s.saleLeft}>
                    <Text style={s.saleTime}>
                      {format(new Date(sale.created_at), 'dd/MM · HH:mm')}
                    </Text>
                    <Text style={s.saleMethod}>{PM_LABELS[sale.payment_method]}</Text>
                  </View>
                  <Text style={s.saleTotal}>${sale.total.toFixed(2)}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.inkMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {(!data || data.count === 0) && (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>📊</Text>
              <Text style={s.emptyText}>Sin ventas en este periodo</Text>
            </View>
          )}

        </ScrollView>
      )}

      {/* Ticket modal */}
      <TicketModal saleId={selectedSaleId} onClose={() => setSelectedSaleId(null)} />

    </SafeAreaView>
  )
}

function BarChart({ data }: { data: { date: string; total: number }[] }) {
  const max = Math.max(...data.map(d => d.total), 1)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6, marginTop: 12 }}>
      {data.map(d => {
        const pct = Math.max((d.total / max) * 100, 4)
        const isToday = d.date === format(new Date(), 'yyyy-MM-dd')
        return (
          <View key={d.date} style={{ flex: 1, alignItems: 'center', height: '100%' }}>
            <Text style={{ fontSize: 9, color: colors.inkMuted, marginBottom: 3 }}>
              ${d.total >= 1000 ? `${(d.total / 1000).toFixed(1)}k` : d.total.toFixed(0)}
            </Text>
            <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end' }}>
              <View style={{
                width: '100%', borderRadius: 4,
                height: `${pct}%`,
                backgroundColor: isToday ? colors.primary : colors.primaryLight,
              }} />
            </View>
            <Text style={{ fontSize: 9, color: isToday ? colors.ink : colors.inkMuted, marginTop: 4, fontWeight: isToday ? '600' : '400' }}>
              {format(new Date(d.date + 'T12:00:00'), 'dd/MM')}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function TicketModal({ saleId, onClose }: { saleId: string | null; onClose: () => void }) {
  const { sale, loading } = useSaleDetail(saleId)

  return (
    <Modal visible={!!saleId} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.modalSafe}>

        {/* Ticket header */}
        <View style={s.ticketTop}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={colors.inkMid} />
          </TouchableOpacity>
          <Text style={s.ticketBrand}>GELATO FLOW</Text>
          {sale && (
            <Text style={s.ticketFolio}>#{sale.id.slice(0, 8).toUpperCase()}</Text>
          )}
          <Text style={s.ticketClose} onPress={onClose}>Cerrar</Text>
        </View>

        {loading ? (
          <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
        ) : !sale ? null : (
          <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>

            {/* Meta */}
            <View style={s.ticketMeta}>
              <Text style={s.ticketDate}>
                {format(new Date(sale.created_at), "dd 'de' MMMM, HH:mm 'hrs'", { locale: es })}
              </Text>
              <View style={s.pmBadge}>
                <Text style={s.pmBadgeText}>{PM_LABELS[sale.payment_method]}</Text>
              </View>
            </View>

            {/* Line items */}
            <View style={s.ticketItems}>
              <View style={s.ticketItemHeader}>
                <Text style={[s.ticketCol, { flex: 3 }]}>Producto</Text>
                <Text style={[s.ticketCol, { width: 30, textAlign: 'center' }]}>Cant</Text>
                <Text style={[s.ticketCol, { width: 60, textAlign: 'right' }]}>Precio</Text>
                <Text style={[s.ticketCol, { width: 68, textAlign: 'right' }]}>Total</Text>
              </View>
              {(sale.sale_items ?? []).map(item => (
                <View key={item.id} style={s.ticketItemRow}>
                  <Text style={[s.ticketItemName, { flex: 3 }]} numberOfLines={2}>
                    {item.product?.name ?? 'Producto'}
                  </Text>
                  <Text style={[s.ticketItemVal, { width: 30, textAlign: 'center' }]}>
                    {item.quantity}
                  </Text>
                  <Text style={[s.ticketItemVal, { width: 60, textAlign: 'right' }]}>
                    ${item.unit_price.toFixed(2)}
                  </Text>
                  <Text style={[s.ticketItemVal, { width: 68, textAlign: 'right', fontWeight: '600' }]}>
                    ${item.subtotal.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Total */}
            <View style={s.ticketTotalRow}>
              <Text style={s.ticketTotalLabel}>Total</Text>
              <Text style={s.ticketTotalAmount}>${sale.total.toFixed(2)}</Text>
            </View>

          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.ink,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  title: { fontSize: 22, fontWeight: '600', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  cierrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.md,
  },
  cierrBtnText: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  filterRow: {
    flexDirection: 'row', padding: 16, gap: 8,
    backgroundColor: colors.ink,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    ...shadow.header,
  },
  pill: {
    flex: 1, paddingVertical: 9, borderRadius: radius.pill,
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pillActive: { backgroundColor: colors.primary },
  pillText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.55)' },
  pillTextActive: { color: colors.ink, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  kpiRow: { flexDirection: 'row', gap: 12 },
  kpi: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: 16,
    borderWidth: 0.5, borderColor: colors.border,
    ...shadow.sm,
  },
  kpiLabel: { fontSize: 10, fontWeight: '600', color: colors.inkMuted, letterSpacing: 0.06, marginBottom: 6 },
  kpiValue: { fontSize: 22, fontWeight: '600', color: colors.ink, letterSpacing: -0.4 },
  kpiSub: { fontSize: 11, color: colors.primary, marginTop: 4 },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 18, borderWidth: 0.5, borderColor: colors.border,
    ...shadow.sm,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 4 },

  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  rankBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  rankBadgeGold: { backgroundColor: colors.primary },
  rankText: { fontSize: 12, fontWeight: '700', color: colors.inkMid },
  topName: { fontSize: 13, fontWeight: '500', color: colors.ink },
  topQty: { fontSize: 11, color: colors.inkMuted, marginTop: 1 },
  topRevenue: { fontSize: 14, fontWeight: '600', color: colors.ink },

  saleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  saleLeft: { flex: 1 },
  saleTime: { fontSize: 13, fontWeight: '500', color: colors.ink },
  saleMethod: { fontSize: 11, color: colors.inkMuted, marginTop: 1 },
  saleTotal: { fontSize: 15, fontWeight: '600', color: colors.ink },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 15, color: colors.inkMuted },

  // Modal / Ticket
  modalSafe: { flex: 1, backgroundColor: colors.background },
  ticketTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.ink,
  },
  closeBtn: { padding: 4 },
  ticketBrand: { fontSize: 12, fontWeight: '700', color: colors.primary, letterSpacing: 0.1 },
  ticketFolio: { fontSize: 14, fontWeight: '600', color: '#fff', fontVariant: ['tabular-nums'] },
  ticketClose: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },

  ticketMeta: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16,
    borderWidth: 0.5, borderColor: colors.border,
  },
  ticketDate: { fontSize: 13, color: colors.inkMid },
  pmBadge: {
    backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: radius.pill,
  },
  pmBadgeText: { fontSize: 12, fontWeight: '500', color: colors.primaryDark },

  ticketItems: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 16, borderWidth: 0.5, borderColor: colors.border, gap: 4,
  },
  ticketItemHeader: {
    flexDirection: 'row', paddingBottom: 10,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  ticketCol: { fontSize: 11, fontWeight: '600', color: colors.inkMuted, letterSpacing: 0.04 },
  ticketItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  ticketItemName: { fontSize: 13, color: colors.inkMid },
  ticketItemVal: { fontSize: 13, color: colors.ink },

  ticketTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20,
    borderWidth: 0.5, borderColor: colors.border,
  },
  ticketTotalLabel: { fontSize: 16, fontWeight: '500', color: colors.inkMid },
  ticketTotalAmount: { fontSize: 32, fontWeight: '600', color: colors.primary, letterSpacing: -0.5 },
})