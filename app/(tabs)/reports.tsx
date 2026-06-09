// app/(tabs)/reports.tsx — con comparativa y gráfica tendencia · Ink & Mint
import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Modal, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSalesReport, useSaleDetail } from '../../hooks/useData'
import { useExpenses } from '../../hooks/useExpenses'
import { Sale, DateFilter, PaymentMethod } from '../../lib/supabase'
import { colors, radius, shadow } from '../../constants/theme'
import { TrialBanner } from '../../components/ProGate'
import { usePro } from '../../context/SubscriptionContext'

const { width: SCREEN_W } = Dimensions.get('window')
const CHART_W = SCREEN_W - 64  // padding de la card

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
  const [filter, setFilter] = useState<DateFilter>('week')
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const { data, loading } = useSalesReport(filter)
  const { total: totalGastos } = useExpenses(filter)
  const router = useRouter()
  const { isPro } = usePro() // ← NUEVO

  const comp = data?.comparison

  // Filtros disponibles según plan
  const availableFilters = FILTERS.filter(f => isPro || f.value !== 'year')

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Reportes</Text>
          <Text style={s.subtitle}>{format(new Date(), "dd 'de' MMMM", { locale: es })}</Text>
        </View>
        <TouchableOpacity style={s.cierrBtn} onPress={() => router.push('/caja')} activeOpacity={0.85}>
          <Ionicons name="calculator-outline" size={15} color={colors.ink} />
          <Text style={s.cierrBtnText}>Cierre</Text>
        </TouchableOpacity>
      </View>

      <TrialBanner />

      {/* Filtros */}
      <View style={s.filterRow}>
        {availableFilters.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[s.pill, filter === f.value && s.pillActive]}
            onPress={() => setFilter(f.value)}
            activeOpacity={0.8}
          >
            <Text style={[s.pillText, filter === f.value && s.pillTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 90 }}>

          {/* ── KPIs con comparativa ───────────────────────── */}
          <View style={s.kpiRow}>
            <KPICard
              label="INGRESOS"
              value={`$${(data?.total ?? 0).toFixed(2)}`}
              pct={comp?.pctChangeTotal}
              subLabel={comp ? `vs ${comp.previousLabel}` : undefined}
              highlight
            />
            <View style={{ flex: 1, gap: 10 }}>
              <KPICard
                label="VENTAS"
                value={`${data?.count ?? 0}`}
                pct={comp?.pctChangeCount}
                small
              />
              <KPICard
                label="TICKET PROM."
                value={`$${(data?.ticketPromedio ?? 0).toFixed(2)}`}
                small
              />
            </View>
          </View>

          {/* ── Utilidad neta ─────────────────────────────── */}
          <View style={s.utilidadCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.utilidadLabel}>INGRESOS</Text>
              <Text style={s.utilidadIngresos}>${(data?.total ?? 0).toFixed(2)}</Text>
            </View>
            <Ionicons name="remove" size={20} color="rgba(255,255,255,0.3)" />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={s.utilidadLabel}>GASTOS</Text>
              <Text style={s.utilidadGastos}>−${totalGastos.toFixed(2)}</Text>
            </View>
            <Ionicons name="remove" size={20} color="rgba(255,255,255,0.3)" style={{ transform: [{ rotate: '90deg' }] }} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={s.utilidadLabel}>UTILIDAD</Text>
              <Text style={[s.utilidadNeta, { color: ((data?.total ?? 0) - totalGastos) >= 0 ? colors.primary : colors.accent }]}>
                ${((data?.total ?? 0) - totalGastos).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Botón ver gastos */}
          <TouchableOpacity
            style={s.gastosBtn}
            onPress={() => router.push('/gastos')}
            activeOpacity={0.85}
          >
            <Ionicons name="wallet-outline" size={16} color={colors.inkMid} />
            <Text style={s.gastosBtnText}>Ver y registrar gastos</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.inkMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          {/* ── Gráfica de tendencia comparativa ──────────── */}
          {(data?.trendData?.length ?? 0) > 0 && filter !== 'day' && (
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <Text style={s.cardTitle}>Tendencia</Text>
                <View style={s.legendRow}>
                  <View key="curr" style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: colors.primary }]} />
                    <Text style={s.legendLabel}>Este período</Text>
                  </View>
                  <View key="prev" style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: 'rgba(152,152,176,0.4)' }]} />
                    <Text style={s.legendLabel}>{comp?.previousLabel ?? 'Anterior'}</Text>
                  </View>
                </View>
              </View>
              <TrendChart data={data.trendData} />
            </View>
          )}

          {/* ── Comparativa detallada ─────────────────────── */}
          {comp && (
            <View style={s.card}>
              <Text style={s.cardTitle}>vs {comp.previousLabel}</Text>
              <View style={s.compRow}>
                <CompItem
                  key="ingresos"
                  label="Ingresos"
                  current={`$${comp.currentTotal.toFixed(2)}`}
                  previous={`$${comp.previousTotal.toFixed(2)}`}
                  pct={comp.pctChangeTotal}
                />
                <View style={s.compDivider} />
                <CompItem
                  key="ventas"
                  label="Ventas"
                  current={`${comp.currentCount}`}
                  previous={`${comp.previousCount}`}
                  pct={comp.pctChangeCount}
                />
              </View>
            </View>
          )}

          {/* ── Top productos ─────────────────────────────── */}
          {(data?.topProducts?.length ?? 0) > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Más vendidos</Text>
              {data.topProducts.map((p: any, i: number) => (
                <View key={`top-${i}`} style={s.topRow}>
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

          {/* ── Ventas recientes ──────────────────────────── */}
          {(data?.recentSales?.length ?? 0) > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Ventas recientes</Text>
              {data.recentSales.map((sale: any, sIdx: number) => (
                <TouchableOpacity
                  key={sale.id ?? sIdx}
                  style={s.saleRow}
                  onPress={() => setSelectedSaleId(sale.id)}
                  activeOpacity={0.7}
                >
                  <View style={s.saleLeft}>
                    <Text style={s.saleTime}>{format(new Date(sale.created_at), 'dd/MM · HH:mm')}</Text>
                    <Text style={s.saleMethod}>{PM_LABELS[sale.payment_method as PaymentMethod]}</Text>
                  </View>
                  <Text style={s.saleTotal}>${sale.total.toFixed(2)}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.inkMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {(!data || data.count === 0) && (
            <View style={s.empty}>
              <Text style={{ fontSize: 40 }}>📊</Text>
              <Text style={s.emptyText}>Sin ventas en este período</Text>
            </View>
          )}

        </ScrollView>
      )}

      <TicketModal saleId={selectedSaleId} onClose={() => setSelectedSaleId(null)} />
    </SafeAreaView>
  )
}

// ─── KPI Card con indicador de cambio ────────────────────────

function KPICard({ label, value, pct, subLabel, highlight, small }: {
  label: string; value: string; pct?: number
  subLabel?: string; highlight?: boolean; small?: boolean
}) {
  const up = (pct ?? 0) >= 0
  const hasData = pct !== undefined && pct !== null

  return (
    <View style={[s.kpi, highlight && s.kpiHighlight, small && s.kpiSmall]}>
      <Text style={[s.kpiLabel, highlight && s.kpiLabelH]}>{label}</Text>
      <Text style={[s.kpiValue, highlight && s.kpiValueH, small && s.kpiValueS]}>
        {value}
      </Text>
      {hasData && (
        <View style={s.kpiPct}>
          <Ionicons
            name={up ? 'trending-up' : 'trending-down'}
            size={12}
            color={up ? colors.primary : colors.accent}
          />
          <Text style={[s.kpiPctText, { color: up ? colors.primary : colors.accent }]}>
            {up ? '+' : ''}{pct!.toFixed(1)}%
          </Text>
          {subLabel && <Text style={s.kpiSub}>{subLabel}</Text>}
        </View>
      )}
    </View>
  )
}

// ─── Gráfica de tendencia comparativa ────────────────────────

function TrendChart({ data }: {
  data: { label: string; currentVal: number; previousVal: number }[]
}) {
  const maxVal = Math.max(...data.map(d => Math.max(d.currentVal, d.previousVal)), 1)
  // Mostrar máximo 14 puntos para legibilidad
  const visible = data.length > 14 ? data.filter((_, i) => i % Math.ceil(data.length / 14) === 0) : data

  return (
    <View style={{ marginTop: 16 }}>
      {/* Líneas de referencia */}
      <View style={s.chartArea}>
        {[0.75, 0.5, 0.25].map((pct) => (
          <View key={`grid-${pct}`} style={[s.gridLine, { bottom: `${pct * 100}%` }]}>
            <Text style={s.gridLabel}>${((maxVal * pct) / 1000).toFixed(maxVal > 1000 ? 1 : 0)}{maxVal > 1000 ? 'k' : ''}</Text>
          </View>
        ))}

        {/* Barras */}
        <View style={s.barsRow}>
          {visible.map((d: any, i: number) => {
            const curH = maxVal > 0 ? (d.currentVal / maxVal) * 100 : 0
            const prevH = maxVal > 0 ? (d.previousVal / maxVal) * 100 : 0
            const showLabel = visible.length <= 7 || i % Math.ceil(visible.length / 7) === 0

            return (
              <View key={`bar-${i}`} style={s.barGroup}>
                <View style={s.barPair}>
                  {/* Barra período anterior */}
                  <View style={[s.barPrev, { height: `${Math.max(prevH, 2)}%` }]} />
                  {/* Barra período actual */}
                  <View style={[s.barCurr, { height: `${Math.max(curH, 2)}%` }]} />
                </View>
                {showLabel && (
                  <Text style={s.barLabel} numberOfLines={1}>{d.label}</Text>
                )}
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

// ─── Comparativa item ─────────────────────────────────────────

function CompItem({ label, current, previous, pct }: {
  label: string; current: string; previous: string; pct: number
}) {
  const up = pct >= 0
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Text style={s.compLabel}>{label}</Text>
      <Text style={s.compCurrent}>{current}</Text>
      <Text style={s.compPrevious}>{previous} ant.</Text>
      <View style={[s.compBadge, { backgroundColor: up ? `${colors.primary}18` : `${colors.accent}18` }]}>
        <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={10} color={up ? colors.primary : colors.accent} />
        <Text style={[s.compBadgeText, { color: up ? colors.primary : colors.accent }]}>
          {up ? '+' : ''}{pct.toFixed(1)}%
        </Text>
      </View>
    </View>
  )
}

// ─── Ticket modal ─────────────────────────────────────────────

function TicketModal({ saleId, onClose }: { saleId: string | null; onClose: () => void }) {
  const { sale, loading } = useSaleDetail(saleId)
  return (
    <Modal visible={!!saleId} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={[s.header, { paddingVertical: 12 }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <Text style={[s.title, { flex: 1, textAlign: 'center', fontSize: 16 }]}>
            {sale ? `#${sale.id.slice(0, 8).toUpperCase()}` : 'Ticket'}
          </Text>
          <View style={{ width: 22 }} />
        </View>
        {loading ? (
          <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
        ) : !sale ? null : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 90 }}>
            <View style={[s.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <Text style={s.saleTime}>{format(new Date(sale.created_at), "dd/MM/yyyy · HH:mm 'hrs'")}</Text>
              <Text style={[s.kpiLabel, { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }]}>
                {PM_LABELS[sale.payment_method as PaymentMethod]}
              </Text>
            </View>
            <View style={s.card}>
              <View style={[s.topRow, { paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border }]}>
                <Text style={[s.kpiLabel, { flex: 3 }]}>PRODUCTO</Text>
                <Text style={[s.kpiLabel, { width: 30, textAlign: 'center' }]}>CANT</Text>
                <Text style={[s.kpiLabel, { width: 70, textAlign: 'right' }]}>TOTAL</Text>
              </View>
              {(sale.sale_items ?? []).map((item: any, idx: number) => (
                <View key={item.id ?? idx} style={[s.topRow, { paddingVertical: 10 }]}>
                  <Text style={[s.topName, { flex: 3 }]} numberOfLines={2}>{item.product?.name}</Text>
                  <Text style={[s.topQty, { width: 30, textAlign: 'center', color: colors.ink }]}>{item.quantity}</Text>
                  <Text style={[s.topRevenue, { width: 70, textAlign: 'right' }]}>${(item.subtotal ?? item.unit_price * item.quantity).toFixed(2)}</Text>
                </View>
              ))}
            </View>
            <View style={[s.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <Text style={s.cardTitle}>Total</Text>
              <Text style={[s.kpiValue, { color: colors.primary, fontSize: 26 }]}>${sale.total.toFixed(2)}</Text>
            </View>
          </ScrollView>
        )}
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
  title: { fontSize: 22, fontWeight: '600', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  cierrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.md,
  },
  cierrBtnText: { color: colors.ink, fontWeight: '700', fontSize: 13 },

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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // KPIs
  kpiRow: { flexDirection: 'row', gap: 12, height: 130 },
  kpi: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 14, borderWidth: 0.5, borderColor: colors.border,
    justifyContent: 'space-between', ...shadow.sm,
  },
  kpiHighlight: { backgroundColor: colors.ink, borderColor: colors.ink },
  kpiSmall: { padding: 10 },
  kpiLabel: { fontSize: 10, fontWeight: '600', color: colors.inkMuted, letterSpacing: 0.06 },
  kpiLabelH: { color: 'rgba(255,255,255,0.45)' },
  kpiValue: { fontSize: 20, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  kpiValueH: { color: colors.primary, fontSize: 22 },
  kpiValueS: { fontSize: 16 },
  kpiPct: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  kpiPctText: { fontSize: 11, fontWeight: '600' },
  kpiSub: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginLeft: 2 },

  // Card
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 16, borderWidth: 0.5, borderColor: colors.border, ...shadow.sm,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },

  // Legend
  legendRow: { flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: colors.inkMuted },

  // Trend chart
  chartArea: {
    height: 130, position: 'relative',
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
    marginTop: 8,
  },
  gridLine: {
    position: 'absolute', left: 0, right: 0,
    borderTopWidth: 0.5, borderTopColor: `${colors.border}`,
    flexDirection: 'row',
  },
  gridLabel: { fontSize: 9, color: colors.inkMuted, marginLeft: 2, marginTop: -10 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', height: '100%', gap: 2, paddingTop: 8 },
  barGroup: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, width: '100%', height: '85%' },
  barPrev: {
    flex: 1, borderRadius: 2,
    backgroundColor: 'rgba(152,152,176,0.3)',
    minHeight: 2,
  },
  barCurr: {
    flex: 1, borderRadius: 2,
    backgroundColor: colors.primary,
    minHeight: 2,
  },
  barLabel: { fontSize: 8, color: colors.inkMuted, marginTop: 4, textAlign: 'center' },

  // Comparativa
  compRow: { flexDirection: 'row', marginTop: 12 },
  compDivider: { width: 0.5, backgroundColor: colors.border, marginVertical: 4 },
  compLabel: { fontSize: 11, color: colors.inkMuted, fontWeight: '500' },
  compCurrent: { fontSize: 20, fontWeight: '700', color: colors.ink, letterSpacing: -0.3 },
  compPrevious: { fontSize: 12, color: colors.inkMuted },
  compBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  compBadgeText: { fontSize: 11, fontWeight: '600' },

  // Top
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: colors.border },
  rankBadge: { width: 26, height: 26, borderRadius: 7, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  rankBadgeGold: { backgroundColor: colors.primary },
  rankText: { fontSize: 11, fontWeight: '700', color: colors.inkMid },
  topName: { fontSize: 13, fontWeight: '500', color: colors.ink },
  topQty: { fontSize: 11, color: colors.inkMuted, marginTop: 1 },
  topRevenue: { fontSize: 14, fontWeight: '600', color: colors.ink },

  // Sales
  saleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: 0.5, borderTopColor: colors.border },
  saleLeft: { flex: 1 },
  saleTime: { fontSize: 13, fontWeight: '500', color: colors.ink },
  saleMethod: { fontSize: 11, color: colors.inkMuted, marginTop: 1 },
  saleTotal: { fontSize: 15, fontWeight: '600', color: colors.ink },

  utilidadCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
    ...shadow.header,
  },
  utilidadLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.06, marginBottom: 4 },
  utilidadIngresos: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  utilidadGastos: { fontSize: 15, fontWeight: '700', color: colors.accent, letterSpacing: -0.3 },
  utilidadNeta: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  gastosBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 0.5, borderColor: colors.border, ...shadow.sm,
  },
  gastosBtnText: { fontSize: 14, fontWeight: '500', color: colors.inkMid },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15, color: colors.inkMuted },
})