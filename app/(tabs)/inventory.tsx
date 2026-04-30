// app/(tabs)/inventory.tsx — Ink & Mint design
import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, ActivityIndicator, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { supabase, Product } from '../../lib/supabase'
import { useLowStock } from '../../hooks/useLowStock'
import { useAllProducts, useCategories } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { colors, radius, shadow } from '../../constants/theme'

export default function InventoryScreen() {
  const [search, setSearch] = useState('')
  const [showCatModal, setShowCatModal] = useState(false)
  const { products, loading, refetch } = useAllProducts()
  const { categories, refetch: refetchCats } = useCategories()
  const { profile } = useAuth()
  const router = useRouter()
  const { count: lowStockCount } = useLowStock()
  const canEdit = profile?.role !== 'cashier'

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggleActive = async (product: Product) => {
    const { error } = await supabase.from('products').update({ active: !product.active }).eq('id', product.id)
    if (error) Alert.alert('Error', error.message)
    else refetch()
  }

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Inventario</Text>
        <View style={s.headerBtns}>
          {/* Botón alertas de stock */}
          <TouchableOpacity
            style={[s.alertBtn, lowStockCount > 0 && s.alertBtnActive]}
            onPress={() => router.push('/stock')}
          >
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color={lowStockCount > 0 ? '#fff' : colors.inkMuted}
            />
            {lowStockCount > 0 && (
              <View style={s.alertBadge}>
                <Text style={s.alertBadgeText}>{lowStockCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {canEdit && (
            <TouchableOpacity style={s.catBtn} onPress={() => setShowCatModal(true)}>
              <Ionicons name="pricetags-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity style={s.addBtn} onPress={() => router.push('/inventory/form')}>
              <Ionicons name="add" size={18} color={colors.ink} />
              <Text style={s.addBtnText}>Nuevo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.inkMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar producto…"
          placeholderTextColor={colors.inkMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.inkMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshing={loading}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <View style={[s.card, !item.active && s.cardInactive]}>
            <View style={s.cardEmoji}>
              {(item as any).image_url ? (
                <Image
                  source={{ uri: (item as any).image_url }}
                  style={{ width: 44, height: 44, borderRadius: radius.md }}
                  contentFit="cover"
                />
              ) : (
                <Text style={{ fontSize: 22 }}>{item.category?.emoji ?? '🍽️'}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardName}>{item.name}</Text>
              <View style={s.cardMeta}>
                <View style={s.catPill}>
                  <Text style={s.catPillText}>{item.category?.name ?? item.type}</Text>
                </View>
                <Text style={s.stockText}>
                  {item.stock} en stock
                </Text>
                {!item.active && <Text style={s.inactiveTag}>Inactivo</Text>}
              </View>
            </View>
            <Text style={s.cardPrice}>${item.price.toFixed(2)}</Text>
            {canEdit && (
              <View style={s.cardActions}>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/inventory/form', params: { id: item.id } })}
                  style={s.actionBtn}
                >
                  <Ionicons name="pencil-outline" size={15} color={colors.inkMid} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Alert.alert(
                    item.active ? 'Dar de baja' : 'Reactivar',
                    `¿${item.active ? 'Dar de baja' : 'Reactivar'} "${item.name}"?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Confirmar', onPress: () => toggleActive(item) },
                    ]
                  )}
                  style={s.actionBtn}
                >
                  <Ionicons
                    name={item.active ? 'archive-outline' : 'refresh-outline'}
                    size={15}
                    color={item.active ? colors.accent : colors.primary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>{loading ? 'Cargando…' : 'Sin productos'}</Text>
          </View>
        }
      />

      <CategoryModal
        visible={showCatModal}
        onClose={() => { setShowCatModal(false); refetchCats() }}
        categories={categories}
        storeId={profile?.store_id ?? ''}
      />
    </SafeAreaView>
  )
}

function CategoryModal({ visible, onClose, categories, storeId }: {
  visible: boolean; onClose: () => void; categories: any[]; storeId: string
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🍽️')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const EMOJIS = ['🍨', '🍡', '🥤', '💧', '🍰', '🍫', '🧃', '☕', '🥞', '🍿', '🍽️', '🌮', '🍕', '🧁']

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert('Nombre requerido')
    setSaving(true)
    const { error } = await supabase.from('categories').insert({
      store_id: storeId, name: name.trim(), emoji, sort_order: categories.length + 1,
    })
    setSaving(false)
    if (error) Alert.alert('Error', error.message)
    else setName('')
  }

  const handleDelete = (id: string, catName: string) => {
    Alert.alert('Eliminar', `¿Eliminar "${catName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          setDeleting(id)
          await supabase.from('categories').delete().eq('id', id)
          setDeleting(null)
        }
      },
    ])
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={s.safe}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>Categorías</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.inkMid} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={categories}
          keyExtractor={c => c.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <View style={s.catRow}>
              <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
              <Text style={s.catRowName}>{item.name}</Text>
              {deleting === item.id
                ? <ActivityIndicator size="small" color={colors.accent} />
                : <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                  <Ionicons name="trash-outline" size={17} color={colors.accent} />
                </TouchableOpacity>
              }
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.inkMuted, textAlign: 'center', padding: 20 }}>
              Sin categorías aún
            </Text>
          }
        />

        <View style={s.newCatSection}>
          <Text style={s.newCatTitle}>Nueva categoría</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
            {EMOJIS.map(e => (
              <TouchableOpacity
                key={e}
                style={[s.emojiBtn, emoji === e && s.emojiBtnActive]}
                onPress={() => setEmoji(e)}
              >
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={s.addCatRow}>
            <TextInput
              style={s.catInput}
              placeholder="Nombre…"
              placeholderTextColor={colors.inkMuted}
              value={name}
              onChangeText={setName}
            />
            <TouchableOpacity
              style={[s.addCatBtn, saving && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={colors.ink} />
                : <Ionicons name="add" size={20} color={colors.ink} />
              }
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.ink,
  },
  title: { fontSize: 22, fontWeight: '600', color: '#fff', letterSpacing: -0.5 },
  headerBtns: { flexDirection: 'row', gap: 10 },
  catBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.md,
  },
  addBtnText: { color: colors.ink, fontWeight: '700', fontSize: 13 },

  alertBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  alertBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  alertBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: colors.ink,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: colors.accent,
  },
  alertBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  lowStockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: `${colors.accent}15`,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.pill,
  },
  lowStockBadgeText: { fontSize: 10, color: colors.accent, fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface,
    marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 0.5, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 14, borderWidth: 0.5, borderColor: colors.border,
    ...shadow.sm,
  },
  cardInactive: { opacity: 0.4 },
  cardEmoji: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 14, fontWeight: '500', color: colors.ink, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill,
  },
  catPillText: { fontSize: 11, fontWeight: '500', color: colors.primaryDark },
  stockText: { fontSize: 11, color: colors.inkMuted },
  inactiveTag: { fontSize: 11, color: colors.accent, fontWeight: '500' },
  cardPrice: { fontSize: 16, fontWeight: '600', color: colors.ink, letterSpacing: -0.3 },
  cardActions: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: colors.inkMuted, fontSize: 14 },

  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.ink,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 14,
    borderWidth: 0.5, borderColor: colors.border,
  },
  catRowName: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.ink },
  newCatSection: {
    padding: 20, borderTopWidth: 0.5, borderTopColor: colors.border,
    backgroundColor: colors.surface, gap: 10,
  },
  newCatTitle: { fontSize: 13, fontWeight: '600', color: colors.ink },
  emojiBtn: {
    padding: 8, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'transparent',
    backgroundColor: colors.background,
  },
  emojiBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  addCatRow: { flexDirection: 'row', gap: 10 },
  catInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.ink,
    backgroundColor: colors.background,
  },
  addCatBtn: {
    backgroundColor: colors.primary,
    width: 46, height: 46, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
})