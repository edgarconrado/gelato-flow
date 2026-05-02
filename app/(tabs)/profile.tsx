// app/(tabs)/profile.tsx — Perfil · versión ligera sin operaciones pesadas en mount
import { useState, useEffect } from 'react'
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { colors, radius, shadow } from '../../constants/theme'

const ROLE_LABELS: Record<string, { label: string; icon: string }> = {
  owner: { label: 'Propietario', icon: '👑' },
  manager: { label: 'Gerente', icon: '🧑‍💼' },
  cashier: { label: 'Cajero', icon: '🧑‍💻' },
}

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth()
  const router = useRouter()

  // Diferir render pesado para evitar ANR en Android
  const [ready, setReady] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null)

  useEffect(() => {
    // Dar tiempo al hilo principal para terminar la transición del tab
    const t = setTimeout(() => setReady(true), 50)
    return () => clearTimeout(t)
  }, [])

  if (!ready || !profile) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const roleInfo = ROLE_LABELS[profile.role] ?? { label: profile.role ?? '—', icon: '👤' }
  const initials = (profile.full_name ?? profile.email ?? 'U')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const avatarUrl = (profile as any).avatar_url as string | null | undefined
  const displayUri = localAvatarUri ?? (avatarUrl && avatarUrl.length > 0 ? avatarUrl : null)

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      })

      if (result.canceled || !result.assets[0]) return

      const asset = result.assets[0]
      setLocalAvatarUri(asset.uri)
      setUploading(true)

      const response = await fetch(asset.uri)
      const arrayBuffer = await response.arrayBuffer()
      const ext = asset.mimeType === 'image/png' ? 'png' : 'jpg'
      const filePath = `${profile.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('avatars').getPublicUrl(filePath)
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

      await supabase.from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      setLocalAvatarUri(publicUrl)
      await refreshProfile()

    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo subir la foto.')
      setLocalAvatarUri(null)
    } finally {
      setUploading(false)
    }
  }

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ])
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────── */}
        <View style={s.hero}>
          <Text style={s.heroLabel}>Perfil</Text>

          <View style={s.avatarWrap}>
            {displayUri ? (
              <Image
                source={{ uri: displayUri }}
                style={s.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarInitials}>{initials}</Text>
              </View>
            )}
            {uploading && (
              <View style={s.avatarOverlay}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            )}
            <TouchableOpacity
              style={s.cameraBtn}
              onPress={handlePickAvatar}
              disabled={uploading}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={14} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <Text style={s.heroName}>{profile.full_name ?? 'Usuario'}</Text>
          <Text style={s.heroEmail}>{profile.email}</Text>

          <View style={s.rolePill}>
            <Text>{roleInfo.icon}</Text>
            <Text style={s.rolePillText}>{roleInfo.label}</Text>
          </View>
        </View>

        {/* ── Tienda ───────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>MI TIENDA</Text>
          <View style={s.card}>
            <View style={s.storeRow}>
              <View style={s.storeIcon}>
                <Ionicons name="storefront" size={18} color={colors.primary} />
              </View>
              <Text style={s.storeName}>{profile.store?.name ?? '—'}</Text>
            </View>
            <Row icon="location-outline" label="Dirección" value={profile.store?.address ?? 'Sin registrar'} />
            <Row icon="call-outline" label="Teléfono" value={profile.store?.phone ?? 'Sin registrar'} />
            <Row icon="id-card-outline" label="ID" value={(profile.store_id ?? '').slice(0, 8).toUpperCase()} mono />
          </View>
        </View>

        {/* ── Cuenta ───────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>CUENTA</Text>
          <View style={s.card}>
            <Row icon="mail-outline" label="Correo" value={profile.email ?? '—'} />
            <Row icon="shield-outline" label="Rol" value={`${roleInfo.icon} ${roleInfo.label}`} />
          </View>
        </View>

        {/* ── Accesos rápidos (solo owner) ─────────────────── */}
        {profile.role === 'owner' && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>ADMINISTRACIÓN</Text>
            <View style={s.card}>
              <MenuRow
                icon="wallet-outline"
                iconColor={colors.accent}
                iconBg={`${colors.accent}18`}
                title="Gastos del negocio"
                sub="Ingredientes, renta, servicios…"
                onPress={() => router.push('/gastos')}
              />
              <MenuRow
                icon="people-outline"
                iconColor={colors.primary}
                iconBg={colors.primaryLight}
                title="Gestionar equipo"
                sub="Invitar cajeros y gerentes"
                onPress={() => router.push('/team')}
                last
              />
            </View>
          </View>
        )}

        {/* ── Cerrar sesión ─────────────────────────────────── */}
        <View style={s.section}>
          <TouchableOpacity
            style={s.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={17} color={colors.accent} />
            <Text style={s.signOutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Componentes internos ─────────────────────────────────────

function Row({ icon, label, value, mono }: {
  icon: string; label: string; value: string; mono?: boolean
}) {
  return (
    <View style={s.row}>
      <View style={s.rowIcon}>
        <Ionicons name={icon as any} size={15} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text
          style={[s.rowValue, mono && { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12 }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  )
}

function MenuRow({ icon, iconColor, iconBg, title, sub, onPress, last }: {
  icon: string; iconColor: string; iconBg: string
  title: string; sub: string; onPress: () => void; last?: boolean
}) {
  return (
    <TouchableOpacity
      style={[s.menuRow, !last && s.menuRowBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[s.menuIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={17} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.menuTitle}>{title}</Text>
        <Text style={s.menuSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={colors.inkMuted} />
    </TouchableOpacity>
  )
}

// ─── Estilos ─────────────────────────────────────────────────

const AV = 84

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: {
    backgroundColor: colors.ink,
    paddingTop: 20, paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    ...shadow.header,
  },
  heroLabel: {
    alignSelf: 'flex-start', paddingLeft: 20,
    fontSize: 12, fontWeight: '600',
    color: 'rgba(255,255,255,0.38)', letterSpacing: 0.08,
    marginBottom: 16,
  },

  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: AV, height: AV, borderRadius: AV / 2 },
  avatarFallback: {
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 28, fontWeight: '700', color: colors.ink },
  avatarOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    borderRadius: AV / 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.ink,
  },

  heroName: { fontSize: 19, fontWeight: '600', color: '#fff', letterSpacing: -0.3 },
  heroEmail: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, marginBottom: 10 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(62,207,178,0.14)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: radius.pill,
  },
  rolePillText: { fontSize: 13, fontWeight: '500', color: colors.primary },

  section: { paddingHorizontal: 20, paddingTop: 16 },
  sectionLabel: {
    fontSize: 10, fontWeight: '600', color: colors.inkMuted,
    letterSpacing: 0.08, marginBottom: 8,
  },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border,
    overflow: 'hidden', ...shadow.sm,
  },

  storeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
  },
  storeIcon: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  storeName: { fontSize: 16, fontWeight: '600', color: colors.ink },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  rowIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontSize: 10, color: colors.inkMuted, marginBottom: 1 },
  rowValue: { fontSize: 13, fontWeight: '500', color: colors.ink },

  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
  },
  menuRowBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.border },
  menuIcon: {
    width: 36, height: 36, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  menuTitle: { fontSize: 14, fontWeight: '500', color: colors.ink },
  menuSub: { fontSize: 11, color: colors.inkMuted, marginTop: 1 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: radius.lg,
    borderWidth: 1, borderColor: `${colors.accent}30`,
    backgroundColor: `${colors.accent}07`,
  },
  signOutText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
})