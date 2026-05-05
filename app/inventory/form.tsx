// app/inventory/form.tsx — Formulario de producto con foto
import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase, Product } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useCategories } from '../../hooks/useData'
import { notify } from '../../hooks/useNotifications'
import { colors, radius } from '../../constants/theme'

export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditing = !!id
  const router = useRouter()
  const { profile } = useAuth()
  const { categories, loading: loadingCats } = useCategories()

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [minStock, setMinStock] = useState('5')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [localUri, setLocalUri] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEditing)

  useEffect(() => {
    if (!id) return
    supabase.from('products').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        const p = data as Product
        setName(p.name)
        setCategoryId(p.category_id ?? null)
        setPrice(p.price.toString())
        setStock(p.stock.toString())
        setMinStock(((p as any).min_stock ?? 5).toString())
        setImageUrl((p as any).image_url ?? null)
      }
      setFetching(false)
    })
  }, [id])

  useEffect(() => {
    if (!isEditing && categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id)
    }
  }, [categories])

  // ── Seleccionar y subir imagen ─────────────────────────────
  const handlePickImage = async () => {
    try {
      // Import dinámico para evitar crash si el módulo no está disponible
      const ImagePicker = await import('expo-image-picker')

      // Photo Picker en Android 13+ no requiere permiso explícito
      // requestMediaLibraryPermissionsAsync retorna 'granted' automáticamente
      await ImagePicker.requestMediaLibraryPermissionsAsync()

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
      })

      if (result.canceled || !result.assets[0]) return

      const asset = result.assets[0]
      setLocalUri(asset.uri)
      setUploading(true)

      const response = await fetch(asset.uri)
      const arrayBuffer = await response.arrayBuffer()
      const ext = asset.mimeType === 'image/png' ? 'png' : 'jpg'
      const filePath = `${profile!.store_id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, arrayBuffer, {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('products').getPublicUrl(filePath)

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`
      setImageUrl(publicUrl)
      setLocalUri(publicUrl)

    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo subir la imagen.')
      setLocalUri(null)
    } finally {
      setUploading(false)
    }
  }

  // ── Guardar producto ───────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Nombre requerido')
    if (!categoryId) return Alert.alert('Selecciona una categoría')
    const priceNum = parseFloat(price)
    const stockNum = parseInt(stock)
    if (isNaN(priceNum) || priceNum < 0) return Alert.alert('Precio inválido')
    if (isNaN(stockNum) || stockNum < 0) return Alert.alert('Stock inválido')

    setLoading(true)

    const selectedCat = categories.find(c => c.id === categoryId)
    const catName = selectedCat?.name?.toLowerCase() ?? ''
    const typeMap: Record<string, string> = {
      nieve: 'nieve', nieves: 'nieve',
      paleta: 'paleta', paletas: 'paleta',
      malteada: 'malteada', malteadas: 'malteada',
      agua: 'agua', aguas: 'agua',
    }
    const derivedType = Object.keys(typeMap).find(k => catName.includes(k))
      ? typeMap[Object.keys(typeMap).find(k => catName.includes(k))!]
      : 'otro'

    const payload = {
      name: name.trim(),
      category_id: categoryId,
      price: priceNum,
      stock: stockNum,
      store_id: profile!.store_id,
      type: derivedType,
      min_stock: parseInt(minStock) || 5,
      image_url: imageUrl ?? null,
    }

    const { error } = isEditing
      ? await supabase.from('products').update(payload).eq('id', id)
      : await supabase.from('products').insert(payload)

    setLoading(false)

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      notify(
        isEditing ? 'Producto actualizado' : 'Producto creado',
        `"${name.trim()}" se guardó correctamente`,
        'success'
      )
      router.back()
    }
  }

  if (fetching || loadingCats) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    )
  }

  const displayUri = localUri ?? imageUrl

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.toolbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={s.toolbarTitle}>
          {isEditing ? 'Editar producto' : 'Nuevo producto'}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Foto ─────────────────────────────────────────── */}
        <View style={s.imageSection}>
          <TouchableOpacity
            style={s.imageWrap}
            onPress={handlePickImage}
            activeOpacity={0.85}
          >
            {displayUri ? (
              <>
                <Image
                  source={{ uri: displayUri }}
                  style={s.productImage}
                  resizeMode="cover"
                />
                {uploading && (
                  <View style={s.uploadOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
                {!uploading && (
                  <View style={s.editBadge}>
                    <Ionicons name="camera" size={13} color="#fff" />
                  </View>
                )}
                {!uploading && (
                  <TouchableOpacity
                    style={s.removeBtn}
                    onPress={() => { setImageUrl(null); setLocalUri(null) }}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={s.imagePlaceholder}>
                {uploading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={28} color={colors.inkMuted} />
                    <Text style={s.imagePlaceholderText}>Agregar foto</Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
          <Text style={s.imageHint}>Opcional · cuadrada, máx 3MB</Text>
        </View>

        {/* ── Nombre ───────────────────────────────────────── */}
        <Text style={s.label}>Nombre del producto</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Paleta de mango con chile"
          placeholderTextColor={colors.inkMuted}
        />

        {/* ── Categoría ────────────────────────────────────── */}
        <Text style={s.label}>Categoría</Text>
        {categories.length === 0 ? (
          <View style={s.noCatBox}>
            <Text style={s.noCatText}>Crea categorías desde Inventario → 🏷️</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
          >
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[s.catChip, categoryId === cat.id && s.catChipActive]}
                onPress={() => setCategoryId(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
                <Text style={[s.catChipText, categoryId === cat.id && s.catChipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Precio y Stock ───────────────────────────────── */}
        <View style={s.rowInputs}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Precio (MXN)</Text>
            <TextInput
              style={s.input}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.inkMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Stock actual</Text>
            <TextInput
              style={s.input}
              value={stock}
              onChangeText={setStock}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.inkMuted}
            />
          </View>
        </View>

        {/* ── Stock mínimo ─────────────────────────────────── */}
        <View style={s.minStockWrap}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Alerta de stock mínimo</Text>
            <Text style={s.labelHint}>Notificar cuando baje de este número</Text>
          </View>
          <View style={s.minStockCtrl}>
            <TouchableOpacity
              onPress={() => setMinStock(v => String(Math.max(0, parseInt(v || '0') - 1)))}
              style={s.minStockBtn}
            >
              <Ionicons name="remove" size={18} color={colors.inkMid} />
            </TouchableOpacity>
            <Text style={s.minStockVal}>{minStock}</Text>
            <TouchableOpacity
              onPress={() => setMinStock(v => String(parseInt(v || '0') + 1))}
              style={s.minStockBtn}
            >
              <Ionicons name="add" size={18} color={colors.inkMid} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Guardar ──────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.saveBtn, loading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={colors.ink} />
            : <Text style={s.saveBtnText}>
              {isEditing ? 'Guardar cambios' : 'Crear producto'}
            </Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

const IMAGE_SIZE = 120

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.ink,
  },
  toolbarTitle: { fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: -0.3 },
  body: { padding: 24, gap: 4 },

  // Imagen
  imageSection: { alignItems: 'center', marginBottom: 8 },
  imageWrap: {
    width: IMAGE_SIZE, height: IMAGE_SIZE,
    borderRadius: radius.xl, overflow: 'hidden',
    position: 'relative',
  },
  productImage: { width: IMAGE_SIZE, height: IMAGE_SIZE },
  uploadOverlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  imagePlaceholder: {
    width: IMAGE_SIZE, height: IMAGE_SIZE,
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderStyle: 'dashed', borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  imagePlaceholderText: { fontSize: 12, color: colors.inkMuted, fontWeight: '500' },
  removeBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute', bottom: 6, right: 6,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  imageHint: { fontSize: 11, color: colors.inkMuted, marginTop: 8 },

  // Form
  label: { fontSize: 12, fontWeight: '500', color: colors.inkMuted, marginTop: 16, marginBottom: 6 },
  labelHint: { fontSize: 11, color: colors.inkMuted, marginTop: 2 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.ink, backgroundColor: colors.surface,
  },
  rowInputs: { flexDirection: 'row', gap: 12 },

  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  catChipActive: { borderColor: colors.ink, backgroundColor: colors.ink },
  catChipText: { fontSize: 13, fontWeight: '500', color: colors.inkMid },
  catChipTextActive: { color: '#fff' },

  noCatBox: {
    padding: 16, borderRadius: radius.md,
    backgroundColor: `${colors.accent}10`,
    borderWidth: 1, borderColor: `${colors.accent}30`,
  },
  noCatText: { color: colors.accent, fontSize: 13, textAlign: 'center' },

  minStockWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: 14, borderWidth: 1, borderColor: colors.border,
    marginTop: 16, gap: 12,
  },
  minStockCtrl: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  minStockBtn: {
    width: 38, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  minStockVal: {
    width: 36, textAlign: 'center',
    fontSize: 17, fontWeight: '600', color: colors.ink,
  },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 17, alignItems: 'center', marginTop: 28,
    flexDirection: 'row', justifyContent: 'center',
  },
  saveBtnText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
})