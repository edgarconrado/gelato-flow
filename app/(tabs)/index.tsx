// app/(tabs)/index.tsx — POS · Ink & Mint redesign v2
import { useState, useEffect, useRef } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
  withTiming, Easing,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
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

  const { categories, loading: loadingCats } = useCategories()
  const { products, loading: loadingProducts } = useProducts(selectedCategoryId)
  const { products: allProducts } = useAllProducts()
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

  // Barra de búsqueda animada
  const searchBarHeight = useSharedValue(0)
  const searchBarStyle = useAnimatedStyle(() => ({
    height: searchBarHeight.value,
    opacity: withTiming(searchBarHeight.value > 0 ? 1 : 0, { duration: 150 }),
    overflow: 'hidden',
  }))

  useEffect(() => {
    if (itemCount > prevCount.current) {
      cartScale.value = withSequence(
        withSpring(1.28, { damping: 4, stiffness: 300 }),
        withSpring(1, { damping: 6, stiffness: 200 })
      )
      totalScale.value = withSequence(
        withTiming(1.06, { duration: 100, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 8, stiffness: 180 })
      )
    }
    prevCount.current = itemCount
  }, [itemCount])

  const handleSearchToggle = () => {
    if (searchActive) {
      setSearch('')
      searchBarHeight.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) })
      setSearchActive(false)
    } else {
      setSearchActive(true)
      searchBarHeight.value = withSpring(72, { damping: 14, stiffness: 180 })
      setTimeout(() => searchRef.current?.focus(), 250)
    }
  }

  const allCats = [ALL_CAT, ...categories] as (typeof ALL_CAT | Category)[]

  const filteredProducts = search.trim()
    ? allProducts.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase().trim()) && p.active !== false
    )
    : products

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.storeName}>{profile?.store?.name ?? 'Gelato Flow'}</Text>
          <Text style={s.storeSub}>Punto de venta</Text>
        </View>
        <View style={s.headerRight}>
          {/* Botón búsqueda */}
          <TouchableOpacity
            style={[s.headerBtn, searchActive && s.headerBtnActive]}
            onPress={handleSearchToggle}
            activeOpacity={0.75}
          >
            <Ionicons
              name={searchActive ? 'close' : 'search-outline'}
              size={18}
              color={searchActive ? colors.accent : 'rgba(255,255,255,0.8)'}
            />
          </TouchableOpacity>

          {/* Botón carrito */}
          <Animated.View style={cartBounce}>
            <TouchableOpacity
              style={s.cartBtn}
              onPress={() => router.push('/pos/checkout')}
              activeOpacity={0.8}
            >
              <Ionicons name="bag-outline" size={18} color={colors.ink} />
              {itemCount > 0 && (
                <View style={s.cartBadge}>
                  <Text style={s.cartBadgeText}>{itemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* ── Barra de búsqueda animada ───────────────────────── */}
      <Animated.View style={[s.searchBarWrap, searchBarStyle]}>
        <Ionicons name="search-outline" size={17} color={colors.primary} />
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
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={18} color={colors.inkMuted} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* ── Categorías ──────────────────────────────────────── */}
      {!loadingCats && !searchActive && (
        <View style={s.catWrap}>
          <FlatList
            horizontal
            data={allCats}
            keyExtractor={c => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.catList}
            renderItem={({ item }) => {
              const isAll = item.id === '__all__'
              const isActive = isAll ? selectedCategoryId === null : selectedCategoryId === item.id
              return (
                <TouchableOpacity
                  style={[s.catChip, isActive && s.catChipActive]}
                  onPress={() => setSelectedCategoryId(isAll ? null : item.id)}
                  activeOpacity={0.75}
                >
                  {!isAll && <Text style={s.catEmoji}>{item.emoji}</Text>}
                  <Text style={[s.catLabel, isActive && s.catLabelActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )
            }}
          />
        </View>
      )}

      {/* ── Grid de productos ───────────────────────────────── */}
      {loadingProducts && !loadingCats ? (
        <View style={s.center}>
          <Text style={s.emptyText}>Cargando…</Text>
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
              <Text style={{ fontSize: 40, marginBottom: 10 }}>
                {search ? '🔍' : '📦'}
              </Text>
              <Text style={s.emptyText}>
                {search ? `Sin resultados para "${search}"` : 'Sin productos aquí'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Barra de total ──────────────────────────────────── */}
      {itemCount > 0 && (
        <TouchableOpacity
          style={s.totalBar}
          onPress={() => router.push('/pos/checkout')}
          activeOpacity={0.9}
        >
          <View>
            <Text style={s.totalBarSub}>{itemCount} producto{itemCount !== 1 ? 's' : ''}</Text>
            <Animated.Text style={[s.totalBarAmount, totalBounce]}>
              ${total().toFixed(2)}
            </Animated.Text>
          </View>
          <View style={s.payBtn}>
            <Text style={s.payBtnText}>Cobrar</Text>
            <Ionicons name="arrow-forward" size={15} color={colors.ink} />
          </View>
        </TouchableOpacity>
      )}

    </SafeAreaView>
  )
}

// ─── ProductCard ──────────────────────────────────────────────

function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const inCart = useCartStore(st => st.items.find(i => i.product.id === product.id))
  const emoji = product.category?.emoji ?? '🍽️'
  const imgUrl = (product as any).image_url ?? null
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
      <TouchableOpacity style={{ flex: 1 }} onPress={handlePress} activeOpacity={1}>

        {/* Badge cantidad */}
        {inCart && (
          <View style={s.qtyBadge}>
            <Text style={s.qtyText}>{inCart.quantity}</Text>
          </View>
        )}

        {/* Imagen o emoji */}
        {imgUrl ? (
          <Image
            source={{ uri: imgUrl }}
            style={s.cardImage}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={s.emojiWrap}>
            <Text style={s.cardEmoji}>{emoji}</Text>
          </View>
        )}

        <Text style={s.cardName} numberOfLines={2}>{product.name}</Text>
        <Text style={s.cardPrice}>${product.price.toFixed(2)}</Text>

        {product.stock <= 5 && product.stock > 0 && (
          <View style={s.lowStockBadge}>
            <Text style={s.lowStockText}>Últimas {product.stock}</Text>
          </View>
        )}

      </TouchableOpacity>
    </Animated.View>
  )
}

// ─── Estilos ─────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadow.header,
  },
  headerLeft: {},
  storeName: { fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: -0.3 },
  storeSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  headerBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerBtnActive: { backgroundColor: 'rgba(245,107,92,0.15)' },

  cartBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: radius.pill,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    position: 'relative',
  },
  cartBadge: {
    backgroundColor: colors.ink,
    borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '700' },

  // Búsqueda
  searchBarWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: 16, gap: 10,
  },
  searchInput: {
    flex: 1, fontSize: 16, color: colors.ink,
    paddingVertical: 0, includeFontPadding: false,
    height: 72,
  },

  // Categorías
  catWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  catList: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  catEmoji: { fontSize: 14 },
  catLabel: { fontSize: 13, fontWeight: '500', color: colors.inkMid },
  catLabelActive: { color: '#fff' },

  // Grid
  grid: { padding: 14, gap: 12, paddingBottom: 160 },

  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1, borderColor: colors.border,
    position: 'relative',
    minHeight: 140,
    ...shadow.sm,
  },
  cardActive: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: `${colors.primaryLight}`,
  },

  // Badge cantidad
  qtyBadge: {
    position: 'absolute', top: -6, right: -6, zIndex: 2,
    backgroundColor: colors.primary,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.surface,
  },
  qtyText: { color: colors.ink, fontWeight: '800', fontSize: 11 },

  // Imagen / emoji
  cardImage: {
    width: '100%', height: 80,
    borderRadius: radius.sm, marginBottom: 8,
    backgroundColor: colors.background,
  },
  emojiWrap: {
    width: '100%', height: 64,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm, marginBottom: 8,
  },
  cardEmoji: { fontSize: 36 },

  cardName: {
    fontSize: 12, fontWeight: '500',
    color: colors.inkMid, marginBottom: 4, lineHeight: 16,
  },
  cardPrice: {
    fontSize: 17, fontWeight: '700',
    color: colors.ink, letterSpacing: -0.3,
  },

  lowStockBadge: {
    backgroundColor: `${colors.accent}15`,
    borderRadius: radius.pill, alignSelf: 'flex-start',
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 4,
  },
  lowStockText: { fontSize: 10, color: colors.accent, fontWeight: '600' },

  // Total bar
  totalBar: {
    backgroundColor: colors.ink,
    marginHorizontal: 14, marginBottom: 76,
    borderRadius: radius.xl,
    paddingVertical: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...shadow.header,
  },
  totalBarSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 2 },
  totalBarAmount: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  payBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: radius.lg,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  payBtnText: { color: colors.ink, fontSize: 14, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: colors.inkMuted, fontSize: 14 },
})