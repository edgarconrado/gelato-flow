// app/(tabs)/inventory.tsx — Inventario con gestión de categorías
import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase, Product } from '../../lib/supabase'
import { useAllProducts, useCategories } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../constants/theme'

export default function InventoryScreen() {
  const [search, setSearch] = useState('')
  const [showCatModal, setShowCatModal] = useState(false)
  const { products, loading, refetch } = useAllProducts()
  const { categories, refetch: refetchCats } = useCategories()
  const { profile } = useAuth()
  const router = useRouter()
  const canEdit = profile?.role !== 'cashier'

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggleActive = async (product: Product) => {
    const { error } = await supabase
      .from('products')
      .update({ active: !product.active })
      .eq('id', product.id)
    if (error) Alert.alert('Error', error.message)
    else refetch()
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventario</Text>
        <View style={styles.headerBtns}>
          {canEdit && (
            <TouchableOpacity
              style={styles.catBtn}
              onPress={() => setShowCatModal(true)}
            >
              <Ionicons name="pricetags-outline" size={18} color={colors.primary} />
              <Text style={styles.catBtnText}>Categorías</Text>
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/inventory/form')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>Agregar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar producto..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Lista */}
      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshing={loading}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.active && styles.cardInactive]}>
            <Text style={styles.cardEmoji}>{item.category?.emoji ?? '🍽️'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.name}</Text>
              <View style={styles.row}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {item.category?.name ?? item.type}
                  </Text>
                </View>
                <Text style={styles.stock}>
                  <Ionicons name="cube-outline" size={12} color={colors.muted} /> {item.stock}
                </Text>
                {!item.active && (
                  <Text style={styles.inactiveLabel}>Inactivo</Text>
                )}
              </View>
            </View>
            <Text style={styles.price}>${item.price.toFixed(2)}</Text>
            {canEdit && (
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/inventory/form', params: { id: item.id } })}
                  style={styles.iconBtn}
                >
                  <Ionicons name="pencil" size={18} color={colors.primary} />
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
                  style={styles.iconBtn}
                >
                  <Ionicons
                    name={item.active ? 'archive-outline' : 'refresh-outline'}
                    size={18}
                    color={item.active ? colors.accent : colors.success}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {loading ? 'Cargando...' : 'Sin productos. ¡Agrega el primero!'}
            </Text>
          </View>
        }
      />

      {/* Modal de categorías */}
      <CategoryModal
        visible={showCatModal}
        onClose={() => { setShowCatModal(false); refetchCats() }}
        categories={categories}
        storeId={profile?.store_id ?? ''}
      />
    </SafeAreaView>
  )
}

// ─── Modal de gestión de categorías ──────────────────────────

function CategoryModal({
  visible, onClose, categories, storeId,
}: {
  visible: boolean
  onClose: () => void
  categories: any[]
  storeId: string
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🍽️')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const EMOJI_OPTIONS = ['🍨', '🍡', '🥤', '💧', '🍰', '🍫', '🧃', '☕', '🥞', '🍿', '🍽️']

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert('Nombre requerido')
    setSaving(true)
    const { error } = await supabase.from('categories').insert({
      store_id: storeId,
      name: name.trim(),
      emoji,
      sort_order: categories.length + 1,
    })
    setSaving(false)
    if (error) Alert.alert('Error', error.message)
    else { setName(''); setEmoji('🍽️') }
  }

  const handleDelete = async (id: string, catName: string) => {
    Alert.alert(
      'Eliminar categoría',
      `¿Eliminar "${catName}"? Los productos quedarán sin categoría.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            setDeleting(id)
            await supabase.from('categories').delete().eq('id', id)
            setDeleting(null)
          },
        },
      ]
    )
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Categorías</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Lista de categorías existentes */}
        <FlatList
          data={categories}
          keyExtractor={c => c.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <View style={styles.catRow}>
              <Text style={styles.catRowEmoji}>{item.emoji}</Text>
              <Text style={styles.catRowName}>{item.name}</Text>
              {deleting === item.id
                ? <ActivityIndicator size="small" color={colors.accent} />
                : (
                  <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                    <Ionicons name="trash-outline" size={20} color={colors.accent} />
                  </TouchableOpacity>
                )
              }
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.muted, textAlign: 'center', padding: 20 }}>
              Sin categorías aún
            </Text>
          }
        />

        {/* Formulario nueva categoría */}
        <View style={styles.newCatForm}>
          <Text style={styles.newCatTitle}>Nueva categoría</Text>

          {/* Selector de emoji */}
          <ScrollViewRow>
            {EMOJI_OPTIONS.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                onPress={() => setEmoji(e)}
              >
                <Text style={styles.emojiOption}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollViewRow>

          <View style={styles.addCatRow}>
            <TextInput
              style={styles.catInput}
              placeholder="Nombre de categoría..."
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />
            <TouchableOpacity
              style={[styles.addCatBtn, saving && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="add" size={22} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

function ScrollViewRow({ children }: { children: React.ReactNode }) {
  const { ScrollView } = require('react-native')
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  headerBtns: { flexDirection: 'row', gap: 8 },
  catBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: colors.primary,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  catBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, margin: 16, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
  },
  cardInactive: { opacity: 0.45 },
  cardEmoji: { fontSize: 28 },
  cardName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: {
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  stock: { fontSize: 13, color: colors.muted },
  inactiveLabel: { fontSize: 11, color: colors.accent, fontWeight: '600' },
  price: { fontSize: 16, fontWeight: '800', color: colors.primary },
  actions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8, borderRadius: 8, backgroundColor: colors.background },
  center: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: colors.muted, fontSize: 15 },
  success: { color: colors.success },
  // Modal
  modalSafe: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 12, padding: 14,
  },
  catRowEmoji: { fontSize: 24 },
  catRowName: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  newCatForm: {
    padding: 20, borderTopWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, gap: 10,
  },
  newCatTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  emojiBtn: {
    padding: 8, borderRadius: 10,
    borderWidth: 2, borderColor: 'transparent',
    backgroundColor: colors.background,
  },
  emojiBtnActive: { borderColor: colors.primary },
  emojiOption: { fontSize: 22 },
  addCatRow: { flexDirection: 'row', gap: 10 },
  catInput: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
    backgroundColor: colors.background,
  },
  addCatBtn: {
    backgroundColor: colors.primary,
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
})