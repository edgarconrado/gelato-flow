// app/inventory/form.tsx — Crear / Editar Producto con categorías dinámicas
import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase, Product, Category } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useCategories } from '../../hooks/useData'
import { colors } from '../../constants/theme'

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

  // Cargar producto existente al editar
  useEffect(() => {
    if (!id) return
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
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

  // Seleccionar primera categoría por defecto cuando carguen
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
    const payload = {
      name: name.trim(),
      category_id: categoryId,
      price: priceNum,
      stock: stockNum,
      store_id: profile!.store_id,
    }

    const { error } = isEditing
      ? await supabase.from('products').update(payload).eq('id', id)
      : await supabase.from('products').insert(payload)

    setLoading(false)
    if (error) Alert.alert('Error', error.message)
    else router.back()
  }

  if (fetching || loadingCats) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>
          {isEditing ? 'Editar producto' : 'Nuevo producto'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>

        {/* Nombre */}
        <Text style={styles.label}>Nombre del producto</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej: Paleta de mango con chile"
          placeholderTextColor={colors.muted}
        />

        {/* Categoría dinámica */}
        <Text style={styles.label}>Categoría</Text>
        {categories.length === 0 ? (
          <View style={styles.noCatBox}>
            <Text style={styles.noCatText}>
              No hay categorías. Crea una desde Inventario → Categorías.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
          >
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catBtn, categoryId === cat.id && styles.catBtnActive]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <Text style={[styles.catLabel, categoryId === cat.id && styles.catLabelActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Precio */}
        <Text style={styles.label}>Precio (MXN)</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.muted}
        />

        {/* Stock */}
        <Text style={styles.label}>Stock disponible</Text>
        <TextInput
          style={styles.input}
          value={stock}
          onChangeText={setStock}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.muted}
        />

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>
              {isEditing ? 'Guardar cambios' : 'Crear producto'}
            </Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toolbarTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { padding: 20, gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: colors.text, backgroundColor: colors.surface,
  },
  catBtn: {
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, gap: 4,
  },
  catBtnActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
  catEmoji: { fontSize: 22 },
  catLabel: { fontSize: 12, fontWeight: '600', color: colors.text },
  catLabelActive: { color: colors.primary },
  noCatBox: {
    padding: 16, borderRadius: 12,
    backgroundColor: `${colors.accent}15`, borderWidth: 1, borderColor: colors.accent,
  },
  noCatText: { color: colors.accent, fontSize: 13, textAlign: 'center' },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
})