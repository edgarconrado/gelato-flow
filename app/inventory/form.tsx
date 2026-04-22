// app/inventory/form.tsx — Ink & Mint design
import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase, Product } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useCategories } from '../../hooks/useData'
import { colors, radius, shadow } from '../../constants/theme'

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
      }
      setFetching(false)
    })
  }, [id])

  useEffect(() => {
    if (!isEditing && categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id)
    }
  }, [categories])

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Nombre requerido')
    if (!categoryId) return Alert.alert('Selecciona una categoría')
    const priceNum = parseFloat(price)
    const stockNum = parseInt(stock)
    if (isNaN(priceNum) || priceNum < 0) return Alert.alert('Precio inválido')
    if (isNaN(stockNum) || stockNum < 0) return Alert.alert('Stock inválido')

    setLoading(true)
    const payload = { name: name.trim(), category_id: categoryId, price: priceNum, stock: stockNum, store_id: profile!.store_id }
    const { error } = isEditing
      ? await supabase.from('products').update(payload).eq('id', id)
      : await supabase.from('products').insert(payload)
    setLoading(false)
    if (error) Alert.alert('Error', error.message)
    else router.back()
  }

  if (fetching || loadingCats) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.toolbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={22} color='rgba(255,255,255,0.7)' />
        </TouchableOpacity>
        <Text style={s.toolbarTitle}>{isEditing ? 'Editar producto' : 'Nuevo producto'}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.body}>

        <Text style={s.label}>Nombre</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Paleta de mango con chile"
          placeholderTextColor={colors.inkMuted}
        />

        <Text style={s.label}>Categoría</Text>
        {categories.length === 0 ? (
          <View style={s.noCatBox}>
            <Text style={s.noCatText}>Crea categorías desde Inventario → pricetags</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
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

        <Text style={s.label}>Precio (MXN)</Text>
        <TextInput
          style={s.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.inkMuted}
        />

        <Text style={s.label}>Stock disponible</Text>
        <TextInput
          style={s.input}
          value={stock}
          onChangeText={setStock}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.inkMuted}
        />

        <TouchableOpacity
          style={[s.saveBtn, loading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={colors.ink} />
            : <Text style={s.saveBtnText}>{isEditing ? 'Guardar cambios' : 'Crear producto'}</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.ink,
  },
  toolbarTitle: { fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: -0.3 },
  body: { padding: 24, gap: 6 },
  label: { fontSize: 12, fontWeight: '500', color: colors.inkMuted, marginTop: 16, letterSpacing: 0.04 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.ink, backgroundColor: colors.surface,
  },
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
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 17, alignItems: 'center', marginTop: 28,
  },
  saveBtnText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
})