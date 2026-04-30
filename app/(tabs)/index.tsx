// app/(tabs)/index.tsx — POS · Ink & Mint design
import { useState, useEffect, useRef } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
  withTiming, Easing,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useCategories, useProducts, useAllProducts } from '../../hooks/useData'
import { useCartStore } from '../../store'
import { useAuth } from '../../context/AuthContext'
import { Product, Category } from '../../lib/supabase'
import { colors, radius, shadow } from '../../constants/theme'

const ALL_CAT = { id: '__all__', name: 'Todos', emoji: '✦', sort_order: 0, store_id: '' }

export default function POSScreen() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchActive, setSearchActive] = useState(false)
  const searchRef = useRef<any>(null)
  const searchBarHeight = useSharedValue(0)
  const searchBarStyle = useAnimatedStyle(() => ({
    height: searchBarHeight.value,
    overflow: 'hidden',
    opacity: withTiming(searchBarHeight.value > 0 ? 1 : 0, { duration: 150 }),
  }))
  const { categories, loading: loadingCats } = useCategories()
  const { products, loading: loadingProducts } = useProducts(selectedCategoryId)
  const { products: allProducts, loading: loadingAll } = useAllProducts()
  const { items, addItem, total } = useCartStore()
  const { profile } = useAuth()
  const router = useRouter()

  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  // ── Animaciones ──────────────────────────────────────────────
  const cartScale = useSharedValue(1)
  const cartBounce = useAnimatedStyle(() => ({ transform: [{ scale: cartScale.value }] }))

  const totalScale = useSharedValue(1)
  const totalBounce = useAnimatedStyle(() => ({ transform: [{ scale: totalScale.value }] }))

  const prevCount = useRef(0)

  useEffect(() => {
    if (itemCount > prevCount.current) {
      // Rebote del botón del carrito al agregar
      cartScale.value = withSequence(
        withSpring(1.25, { damping: 4, stiffness: 300 }),
        withSpring(1, { damping: 6, stiffness: 200 })
      )
      // Rebote del total
      totalScale.value = withSequence(
        withTiming(1.06, { duration: 100, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 8, stiffness: 180 })
      )
    }
    prevCount.current = itemCount
  }, [itemCount])

  const handleSearchToggle = () => {
    if (searchActive) {
      // Cerrar búsqueda
      setSearch('')
      searchBarHeight.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) })
      setSearchActive(false)
    } else {
      // Abrir búsqueda
      setSearchActive(true)
      searchBarHeight.value = withSpring(72, { damping: 14, stiffness: 180 })
      setTimeout(() => searchRef.current?.focus(), 250)
    }
  }
  const allCats = [ALL_CAT, ...categories] as (typeof ALL_CAT | Category)[]

  // Al buscar, filtra sobre TODOS los productos (ignora categoría seleccionada)
  const filteredProducts = search.trim()
    ? allProducts.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase().trim()) && p.active !== false
    )
    : products


  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.storeName}>{profile?.store?.name ?? 'Gelato Flow'}</Text>
          <Text style={s.storeSub}>Punto de venta</Text>
        </View>
        <Animated.View style={cartBounce}>
          <TouchableOpacity
            style={s.searchIconBtn}
            onPress={handleSearchToggle}
            activeOpacity={0.75}
          >
            <Ionicons
              name={searchActive ? 'close' : 'search'}
              size={17}
              color={searchActive ? colors.accent : colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity style={s.cartBtn} onPress={() => router.push('/pos/checkout')} activeOpacity={0.8}>
            <Ionicons name="bag-outline" size={18} color={colors.primary} />
            {itemCount > 0 && (
              <>
                <Text style={s.cartCount}>{itemCount}</Text>
                <View style={s.cartDot} />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Barra de búsqueda animada */}
      <Animated.View style={[s.searchBarWrap, searchBarStyle]}>
        <Ionicons name="search-outline" size={18} color={colors.primary} style={s.searchIcon} />
        <TextInput
          ref={searchRef}
          style={s.searchInput}
          placeholder="Buscar producto…"
          placeholderTextColor={colors.inkMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={s.searchClear}
          >
            <Ionicons name="close-circle" size={20} color={colors.inkMuted} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Category pills */}
      {!loadingCats && (
        <View style={s.pillWrapper}>
          <FlatList
            horizontal
            data={allCats}
            keyExtractor={c => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.pillBar}
            renderItem={({ item }) => {
              const isAll = item.id === '__all__'
              const isActive = isAll ? selectedCategoryId === null : selectedCategoryId === item.id
              return (
                <TouchableOpacity
                  style={[s.pill, isActive && s.pillActive]}
                  onPress={() => setSelectedCategoryId(isAll ? null : item.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.pillText, isActive && s.pillTextActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )
            }}
          />
        </View>
      )}

      {/* Product grid */}
      {loadingProducts || loadingCats ? (
        <View style={s.center}>
          <Text style={s.loadingText}>Cargando productos…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          numColumns={2}
          keyExtractor={p => p.id}
          contentContainerStyle={s.grid}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => addItem(item)} />
          )}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>
                {search ? '🔍' : '📦'}
              </Text>
              <Text style={s.loadingText}>
                {search
                  ? `Sin resultados para "${search}"`
                  : 'Sin productos en esta categoría'}
              </Text>
            </View>
          }
        />
      )}

      {/* Total bar */}
      {itemCount > 0 && (
        <TouchableOpacity style={s.totalBar} onPress={() => router.push('/pos/checkout')} activeOpacity={0.9}>
          <View>
            <Text style={s.totalBarSub}>{itemCount} producto{itemCount !== 1 ? 's' : ''}</Text>
            <Animated.Text style={[s.totalBarAmount, totalBounce]}>
              ${total().toFixed(2)}
            </Animated.Text>
          </View>
          <View style={s.payBtn}>
            <Text style={s.payBtnText}>Cobrar</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.ink} />
          </View>
        </TouchableOpacity>
      )}

    </SafeAreaView>
  )
}

function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const inCart = useCartStore(st => st.items.find(i => i.product.id === product.id))
  const emoji = product.category?.emoji ?? '🍽️'
  const pressScale = useSharedValue(1)
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value }] }))

  const handlePress = () => {
    pressScale.value = withSequence(
      withTiming(0.93, { duration: 80, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 5, stiffness: 300 })
    )
    onPress()
  }

  return (
    <Animated.View style={[s.card, !!inCart && s.cardActive, pressStyle]}>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={handlePress}
        activeOpacity={1}
      >
        {inCart && (
          <View style={s.qtyBadge}>
            <Text style={s.qtyText}>{inCart.quantity}</Text>
          </View>
        )}
        <Text style={s.cardEmoji}>{emoji}</Text>
        <Text style={s.cardName} numberOfLines={2}>{product.name}</Text>
        <Text style={s.cardPrice}>${product.price.toFixed(2)}</Text>
        {product.stock <= 5 && product.stock > 0 && (
          <Text style={s.lowStock}>Solo {product.stock}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadow.header,
  },
  storeName: { fontSize: 18, fontWeight: '600', color: '#fff', letterSpacing: -0.3 },
  storeSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  cartBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: radius.pill,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  cartCount: { fontSize: 13, fontWeight: '600', color: colors.primary },
  cartDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.primary,
  },

  searchIconBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 4,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    gap: 10,
  },
  searchIcon: {
    marginVertical: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 16,
    includeFontPadding: false,
  },
  searchClear: {
    padding: 4,
  },
  pillWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  pillBar: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, alignItems: 'center' },
  pill: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontSize: 13, fontWeight: '500', color: colors.inkMid },
  pillTextActive: { color: '#fff' },

  grid: { padding: 16, gap: 12 },
  card: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    position: 'relative', minHeight: 120,
    ...shadow.sm,
  },
  cardActive: { borderColor: colors.primary, borderWidth: 1.5 },
  cardEmoji: { fontSize: 32, marginBottom: 10 },
  cardName: {
    fontSize: 13, fontWeight: '500',
    color: colors.inkMid, marginBottom: 6, lineHeight: 18,
  },
  cardPrice: { fontSize: 18, fontWeight: '600', color: colors.ink, letterSpacing: -0.3 },
  qtyBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.pill, minWidth: 22, height: 22,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  qtyText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  lowStock: { fontSize: 10, color: colors.accent, marginTop: 4, fontWeight: '500' },

  totalBar: {
    backgroundColor: colors.ink,
    margin: 16, borderRadius: radius.xl,
    paddingVertical: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...shadow.header,
  },
  totalBarSub: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 2 },
  totalBarAmount: { color: '#fff', fontSize: 22, fontWeight: '600', letterSpacing: -0.5 },
  payBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: radius.lg,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  payBtnText: { color: colors.ink, fontSize: 14, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { color: colors.inkMuted, fontSize: 14 },
})