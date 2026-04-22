// app/(tabs)/index.tsx — POS con categorías optimizadas para iPad
import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useCategories, useProducts } from '../../hooks/useData'
import { useCartStore } from '../../store'
import { useAuth } from '../../context/AuthContext'
import { Product, Category } from '../../lib/supabase'
import { colors } from '../../constants/theme'

// Categoría virtual "Todos" para el primer chip
const ALL_CAT = { id: '__all__', name: 'Todos', emoji: '★', sort_order: 0, store_id: '' }

export default function POSScreen() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const { categories, loading: loadingCats } = useCategories()
  const { products, loading: loadingProducts } = useProducts(selectedCategoryId)
  const { items, addItem, total } = useCartStore()
  const { profile } = useAuth()
  const router = useRouter()

  const itemCount = items.reduce((s, i) => s + i.quantity, 0)
  const allCats = [ALL_CAT, ...categories] as (typeof ALL_CAT | Category)[]

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.storeName}>{profile?.store?.name ?? 'Mi Tienda'}</Text>
          <Text style={styles.headerSub}>Punto de Venta</Text>
        </View>
        <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/pos/checkout')}>
          <Ionicons name="cart" size={24} color="#fff" />
          {itemCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{itemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Barra de categorías ─────────────────────────────────── */}
      <View style={styles.categoryWrapper}>
        <FlatList
          horizontal
          data={allCats}
          keyExtractor={c => c.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryBar}
          renderItem={({ item }) => {
            const isAll = item.id === '__all__'
            const isActive = isAll
              ? selectedCategoryId === null
              : selectedCategoryId === item.id

            return (
              <TouchableOpacity
                style={[styles.catChip, isActive && styles.catChipActive]}
                onPress={() => setSelectedCategoryId(isAll ? null : item.id)}
                activeOpacity={0.7}
              >
                {/* Texto del emoji — más grande y sin renderizado de imagen */}
                <Text style={[styles.catEmoji, isActive && styles.catEmojiActive]}>
                  {item.emoji}
                </Text>
                <Text style={[styles.catLabel, isActive && styles.catLabelActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )
          }}
        />
      </View>

      {/* ── Grid de productos ───────────────────────────────────── */}
      {loadingProducts || loadingCats ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => addItem(item)} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Sin productos en esta categoría</Text>
            </View>
          }
        />
      )}

      {/* ── Barra de total ──────────────────────────────────────── */}
      {itemCount > 0 && (
        <TouchableOpacity style={styles.totalBar} onPress={() => router.push('/pos/checkout')}>
          <Text style={styles.totalBarLabel}>
            {itemCount} producto{itemCount !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.totalBarAmount}>Total: ${total().toFixed(2)}</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      )}

    </SafeAreaView>
  )
}

// ─── Tarjeta de producto ──────────────────────────────────────

function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const inCart = useCartStore(s => s.items.find(i => i.product.id === product.id))

  return (
    <TouchableOpacity
      style={[styles.card, !!inCart && styles.cardActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.cardEmoji}>{product.category?.emoji ?? '🍽️'}</Text>
      <Text style={styles.cardName} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.cardPrice}>${product.price.toFixed(2)}</Text>

      {/* Badge de cantidad en carrito */}
      {inCart && (
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyText}>{inCart.quantity}</Text>
        </View>
      )}

      {/* Aviso de stock bajo */}
      {product.stock <= 5 && product.stock > 0 && (
        <Text style={styles.lowStock}>Solo {product.stock} disponibles</Text>
      )}
    </TouchableOpacity>
  )
}

// ─── Estilos ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  cartBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    padding: 10, borderRadius: 14,
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: colors.accent,
    borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Categorías — contenedor con fondo y sombra suave
  categoryWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
  },
  categoryBar: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    // Tamaño mínimo para que sea fácil de tocar en iPad
    minHeight: 40,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  // Emoji como texto grande — evita el renderizado pixelado de iOS
  catEmoji: {
    fontSize: 18,
    lineHeight: 22,
    // En iOS los emojis a veces se recortan si lineHeight < fontSize
  },
  catEmojiActive: {
    // Sin cambio de color — los emojis no cambian con tintColor
  },
  catLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.1,
  },
  catLabelActive: { color: '#fff' },

  // Grid de productos
  grid: { padding: 14, gap: 12 },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    minHeight: 120,
  },
  cardActive: { borderColor: colors.primary },
  cardEmoji: { fontSize: 36, marginBottom: 8 },
  cardName: {
    fontSize: 14, fontWeight: '600',
    color: colors.text, marginBottom: 6,
    lineHeight: 18,
  },
  cardPrice: { fontSize: 20, fontWeight: '800', color: colors.primary },
  qtyBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: colors.primary,
    borderRadius: 13, width: 26, height: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  lowStock: { fontSize: 11, color: colors.accent, marginTop: 4, fontWeight: '600' },

  // Barra total
  totalBar: {
    backgroundColor: colors.primary,
    margin: 14, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  totalBarLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  totalBarAmount: { color: '#fff', fontSize: 18, fontWeight: '800' },

  // Estados vacíos
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { color: colors.muted, fontSize: 15 },
  emptyText: { color: colors.muted, fontSize: 15 },
})