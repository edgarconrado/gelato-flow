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
  const [uploading, setUploading] = useState(false)

  // Estado local para la URI del avatar.
  // Se inicializa con el valor de la BD y se actualiza
  // inmediatamente con la imagen local al seleccionarla,
  // sin esperar al round-trip de Supabase.
  // Usamos null para "no override" (mostrar lo que viene del perfil).
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null)

  // La URI a mostrar: primero el override local, luego el de la BD
  const displayUri = localAvatarUri ?? profile?.avatar_url ?? null

  const roleInfo = ROLE_LABELS[profile?.role ?? ''] ?? { label: profile?.role ?? '—', icon: '👤' }
  const initials = (profile?.full_name ?? profile?.email ?? 'U')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const handlePickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    })

    if (result.canceled || !result.assets[0]) return

    const asset = result.assets[0]

    // ✅ Mostrar la imagen local INMEDIATAMENTE — sin esperar a Supabase
    setLocalAvatarUri(asset.uri)
    setUploading(true)

    try {
      const response = await fetch(asset.uri)
      const arrayBuffer = await response.arrayBuffer()
      const ext = asset.mimeType === 'image/png' ? 'png' : 'jpg'
      const mimeType = asset.mimeType ?? 'image/jpeg'
      const filePath = `${profile!.id}/avatar.${ext}`

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, { contentType: mimeType, upsert: true })

      if (uploadError) throw uploadError

      // Obtener URL pública con cache-buster
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

      // Actualizar profiles en la BD
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile!.id)

      if (updateError) throw updateError

      // Actualizar el estado local con la URL pública definitiva
      // (para que al volver a entrar tenga la URL correcta)
      setLocalAvatarUri(publicUrl)

      // Refrescar contexto global silenciosamente
      await refreshProfile()

    } catch (err: any) {
      console.error('[Avatar] Error:', err)
      // Revertir preview local si falló el upload
      setLocalAvatarUri(profile?.avatar_url ?? null)
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

        {/* ── Hero con avatar ──────────────────────────────────── */}
        <View style={s.hero}>
          <Text style={s.heroTitle}>Perfil</Text>

          <View style={s.avatarWrap}>
            {displayUri ? (
              <Image
                // La key fuerza que expo-image destruya y recree el componente
                // cuando cambia la URI, ignorando cualquier cache interno
                key={displayUri}
                source={{ uri: displayUri }}
                style={s.avatar}
                contentFit="cover"
                cachePolicy="none"
              />
            ) : (
              <View style={[s.avatar, s.avatarPlaceholder]}>
                <Text style={s.avatarInitials}>{initials}</Text>
              </View>
            )}

            {/* Overlay de carga encima de la imagen */}
            {uploading && (
              <View style={s.uploadingOverlay}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            )}

            <TouchableOpacity
              style={[s.cameraBtn, uploading && { opacity: 0.5 }]}
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

        {/* ── Info de la tienda ────────────────────────────────── */}
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
            <InfoRow icon="location-outline" label="Dirección" value={profile?.store?.address ?? 'Sin registrar'} />
            <InfoRow icon="call-outline" label="Teléfono" value={profile?.store?.phone ?? 'Sin registrar'} />
            <InfoRow icon="id-card-outline" label="Store ID" value={profile?.store_id?.slice(0, 8).toUpperCase() ?? '—'} mono />
          </View>
        </View>

        {/* ── Cuenta ──────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>CUENTA</Text>
          <View style={s.card}>
            <InfoRow icon="mail-outline" label="Correo" value={profile?.email ?? '—'} />
            <InfoRow icon="shield-outline" label="Rol" value={`${roleInfo.icon} ${roleInfo.label}`} />
          </View>
        </View>

        {/* ── Gastos (solo owner) ─────────────────────────────── */}
        {profile?.role === 'owner' && (
          <View style={s.section}>
            <TouchableOpacity
              style={s.teamBtn}
              onPress={() => router.push('/gastos')}
              activeOpacity={0.8}
            >
              <View style={s.teamBtnLeft}>
                <View style={[s.teamIconWrap, { backgroundColor: `${colors.accent}18` }]}>
                  <Ionicons name="wallet-outline" size={18} color={colors.accent} />
                </View>
                <View>
                  <Text style={s.teamBtnTitle}>Gastos del negocio</Text>
                  <Text style={s.teamBtnSub}>Ingredientes, renta, servicios…</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Equipo (solo owner) ─────────────────────────────── */}
        {profile?.role === 'owner' && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>EQUIPO</Text>
            <TouchableOpacity
              style={s.teamBtn}
              onPress={() => router.push('/team')}
              activeOpacity={0.8}
            >
              <View style={s.teamBtnLeft}>
                <View style={s.teamIconWrap}>
                  <Ionicons name="people-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={s.teamBtnTitle}>Gestionar equipo</Text>
                  <Text style={s.teamBtnSub}>Invitar cajeros y gerentes</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Cerrar sesión ────────────────────────────────────── */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={17} color={colors.accent} />
          <Text style={s.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

function InfoRow({ icon, label, value, mono }: {
  icon: string; label: string; value: string; mono?: boolean
}) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIconWrap}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={[s.infoValue, mono && s.infoValueMono]} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  )
}

const AVATAR_SIZE = 88

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  hero: {
    backgroundColor: colors.ink,
    paddingTop: 20, paddingBottom: 36,
    alignItems: 'center', gap: 6,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    ...shadow.header,
  },
  heroTitle: {
    fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.08, marginBottom: 16,
    alignSelf: 'flex-start', paddingLeft: 20,
  },

  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 30, fontWeight: '700', color: colors.ink },

  // Overlay semitransparente mientras sube la imagen
  uploadingOverlay: {
    position: 'absolute', inset: 0,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },

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

  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: colors.inkMuted, letterSpacing: 0.07, marginBottom: 10 },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border,
    overflow: 'hidden', ...shadow.sm,
  },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  storeIconWrap: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  storeName: { fontSize: 17, fontWeight: '600', color: colors.ink, flex: 1 },
  divider: { height: 0.5, backgroundColor: colors.border, marginHorizontal: 16 },

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

  teamBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: 14,
    borderWidth: 0.5, borderColor: colors.border,
  },
  teamBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teamIconWrap: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  teamBtnTitle: { fontSize: 14, fontWeight: '500', color: colors.ink },
  teamBtnSub: { fontSize: 12, color: colors.inkMuted, marginTop: 1 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 24,
    padding: 15, borderRadius: radius.lg,
    borderWidth: 1, borderColor: `${colors.accent}35`,
    backgroundColor: `${colors.accent}06`,
  },
  signOutText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
})