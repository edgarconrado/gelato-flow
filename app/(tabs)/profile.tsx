// app/(tabs)/profile.tsx — Perfil con foto, info de tienda · Ink & Mint
import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
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
  const [uploading, setUploading] = useState(false)

  const roleInfo = ROLE_LABELS[profile?.role ?? ''] ?? { label: profile?.role ?? '—', icon: '👤' }
  const initials = (profile?.full_name ?? profile?.email ?? 'U')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  // ── Seleccionar y subir foto de perfil ──────────────────────
  const handlePickAvatar = useCallback(async () => {
    // Solicitar permiso a la galería
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.')
      return
    }

    // Abrir selector de imagen
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],        // forzar cuadrado para avatar circular
      quality: 0.7,           // comprimir para reducir tamaño
    })

    if (result.canceled || !result.assets[0]) return

    const asset = result.assets[0]
    setUploading(true)

    try {
      // Leer imagen como ArrayBuffer
      const response = await fetch(asset.uri)
      const arrayBuffer = await response.arrayBuffer()

      // Determinar extensión
      const ext = asset.mimeType === 'image/png' ? 'png' : 'jpg'
      const mimeType = asset.mimeType ?? 'image/jpeg'

      // Path en Storage: avatars/{user_id}/avatar.{ext}
      // La política RLS verifica que la primera carpeta sea el user_id
      const filePath = `${profile!.id}/avatar.${ext}`

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: true,   // sobreescribir si ya existe
        })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Agregar cache-buster para forzar recarga en expo-image
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

      // Actualizar campo avatar_url en profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile!.id)

      if (updateError) throw updateError

      // Refrescar perfil en el contexto global
      await refreshProfile()

      Alert.alert('✓ Foto actualizada')
    } catch (err: any) {
      console.error('[Avatar] Error:', err)
      Alert.alert('Error al subir foto', err?.message ?? 'Intenta de nuevo')
    } finally {
      setUploading(false)
    }
  }, [profile, refreshProfile])

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ])
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Hero header con avatar ─────────────────────────── */}
        <View style={s.hero}>
          <Text style={s.heroTitle}>Perfil</Text>

          {/* Avatar circular + botón cámara */}
          <View style={s.avatarWrap}>
            {uploading ? (
              <View style={[s.avatar, s.avatarLoading]}>
                <ActivityIndicator color={colors.ink} size="large" />
              </View>
            ) : profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={s.avatar}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[s.avatar, s.avatarPlaceholder]}>
                <Text style={s.avatarInitials}>{initials}</Text>
              </View>
            )}

            {/* Botón editar foto */}
            <TouchableOpacity
              style={s.cameraBtn}
              onPress={handlePickAvatar}
              disabled={uploading}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={14} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <Text style={s.heroName}>{profile?.full_name ?? 'Usuario'}</Text>
          <Text style={s.heroEmail}>{profile?.email}</Text>

          <View style={s.roleBadge}>
            <Text style={s.roleIcon}>{roleInfo.icon}</Text>
            <Text style={s.roleLabel}>{roleInfo.label}</Text>
          </View>
        </View>

        {/* ── Información de la tienda ───────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>MI TIENDA</Text>
          <View style={s.card}>
            <View style={s.storeNameRow}>
              <View style={s.storeIconWrap}>
                <Ionicons name="storefront" size={20} color={colors.primary} />
              </View>
              <Text style={s.storeName}>{profile?.store?.name ?? '—'}</Text>
            </View>

            <View style={s.divider} />

            <InfoRow
              icon="location-outline"
              label="Dirección"
              value={profile?.store?.address ?? 'Sin registrar'}
            />
            <InfoRow
              icon="call-outline"
              label="Teléfono"
              value={profile?.store?.phone ?? 'Sin registrar'}
            />
            <InfoRow
              icon="id-card-outline"
              label="Store ID"
              value={profile?.store_id?.slice(0, 8).toUpperCase() ?? '—'}
              mono
            />
          </View>
        </View>

        {/* ── Cuenta ────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>CUENTA</Text>
          <View style={s.card}>
            <InfoRow icon="mail-outline" label="Correo" value={profile?.email ?? '—'} />
            <InfoRow icon="shield-outline" label="Rol" value={`${roleInfo.icon} ${roleInfo.label}`} />
          </View>
        </View>

        {/* ── Cerrar sesión ─────────────────────────────────── */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={17} color={colors.accent} />
          <Text style={s.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Componente de fila de info ───────────────────────────────

function InfoRow({
  icon, label, value, mono,
}: {
  icon: string; label: string; value: string; mono?: boolean
}) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIconWrap}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text
          style={[s.infoValue, mono && s.infoValueMono]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  )
}

// ─── Estilos ─────────────────────────────────────────────────

const AVATAR_SIZE = 88

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Hero
  hero: {
    backgroundColor: colors.ink,
    paddingTop: 20,
    paddingBottom: 36,
    alignItems: 'center',
    gap: 6,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...shadow.header,
  },
  heroTitle: {
    fontSize: 13, fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.08,
    marginBottom: 16,
    alignSelf: 'flex-start',
    paddingLeft: 20,
  },

  // Avatar
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarLoading: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 30, fontWeight: '700', color: colors.ink },

  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: colors.ink,
  },

  heroName: { fontSize: 20, fontWeight: '600', color: '#fff', letterSpacing: -0.3 },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },

  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(62,207,178,0.15)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: radius.pill, marginTop: 6,
  },
  roleIcon: { fontSize: 14 },
  roleLabel: { fontSize: 13, fontWeight: '500', color: colors.primary },

  // Sections
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: colors.inkMuted,
    letterSpacing: 0.07, marginBottom: 10,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.sm,
  },

  // Store name header inside card
  storeNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16,
  },
  storeIconWrap: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  storeName: { fontSize: 17, fontWeight: '600', color: colors.ink, flex: 1 },

  divider: { height: 0.5, backgroundColor: colors.border, marginHorizontal: 16 },

  // Info rows
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: 11, color: colors.inkMuted, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: colors.ink },
  infoValueMono: { fontFamily: 'monospace', fontSize: 13, letterSpacing: 0.05 },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 24,
    padding: 15, borderRadius: radius.lg,
    borderWidth: 1, borderColor: `${colors.accent}35`,
    backgroundColor: `${colors.accent}06`,
  },
  signOutText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
})