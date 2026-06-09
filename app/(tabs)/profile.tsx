// app/(tabs)/profile.tsx — Perfil · versión ligera sin operaciones pesadas en mount
import { useState, useEffect } from 'react'
import {
  View, Text, Image, TextInput, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { colors, radius, shadow } from '../../constants/theme'
import { usePro } from '../../context/SubscriptionContext'
import Constants from 'expo-constants'

const ROLE_LABELS: Record<string, { label: string; icon: string }> = {
  owner: { label: 'Propietario', icon: '👑' },
  manager: { label: 'Gerente', icon: '🧑‍💼' },
  cashier: { label: 'Cajero', icon: '🧑‍💻' },
}

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth()
  const { isPro, status, trialDaysLeft, refresh: refreshSub } = usePro()
  const router = useRouter()

  // Diferir render pesado para evitar ANR en Android
  const [ready, setReady] = useState(false)
  const [editingStore, setEditingStore] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [storeAddress, setStoreAddress] = useState('')
  const [storePhone, setStorePhone] = useState('')
  const [savingStore, setSavingStore] = useState(false)

  useEffect(() => {
    // Dar tiempo al hilo principal para terminar la transición del tab
    const t = setTimeout(() => {
      setReady(true)
      setStoreName(profile?.store?.name ?? '')
      setStoreAddress(profile?.store?.address ?? '')
      setStorePhone(profile?.store?.phone ?? '')
    }, 50)
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
  const displayUri = profile.avatar_url && profile.avatar_url.length > 0 ? profile.avatar_url : null

  const handlePickAvatar = async () => {
    Alert.alert('Próximamente', 'La función de foto de perfil estará disponible en la siguiente actualización.')
  }

  const handleSaveStore = async () => {
    if (!storeName.trim()) { Alert.alert('El nombre es requerido'); return }
    setSavingStore(true)
    const { error } = await supabase
      .from('stores')
      .update({
        name: storeName.trim(),
        address: storeAddress.trim() || null,
        phone: storePhone.trim() || null,
      })
      .eq('id', profile!.store_id)
    setSavingStore(false)
    if (error) { Alert.alert('Error', error.message); return }
    await refreshProfile()
    setEditingStore(false)
    Alert.alert('✓ Tienda actualizada')
  }

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ])
  }

  const handleDeleteAccount = () => {
    // Si es Pro, advertir primero sobre la suscripción
    if (isPro && (status === 'pro')) {
      Alert.alert(
        '⚠️ Tienes una suscripción activa',
        `Antes de eliminar tu cuenta, cancela tu suscripción en ${Platform.OS === 'ios' ? 'App Store → Tu cuenta → Suscripciones' : 'Google Play → Suscripciones'} → GelatoFlow.\n\n¿Ya cancelaste tu suscripción?`,
        [
          { text: 'Aún no, ir a cancelar', style: 'cancel' },
          {
            text: 'Sí, ya cancelé',
            onPress: () => confirmarEliminacion(),
          }
        ]
      )
      return
    }
    confirmarEliminacion()
  }

  const confirmarEliminacion = () => {
    const esOwner = profile?.role === 'owner'
    Alert.alert(
      '⚠️ Eliminar cuenta',
      esOwner
        ? 'Esta acción eliminará permanentemente tu cuenta y todos los datos de tu negocio. No se puede deshacer.'
        : 'Esta acción eliminará permanentemente tu cuenta. Perderás acceso al negocio.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar cuenta',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '¿Estás seguro?',
              esOwner
                ? 'Se eliminarán todas tus ventas, productos, gastos y equipo.'
                : 'Se eliminará tu acceso al negocio.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Sí, eliminar todo',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session) throw new Error('No hay sesión activa')

                      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
                        ?? (Constants.expoConfig?.extra as any)?.supabaseUrl ?? ''

                      const response = await fetch(
                        `${supabaseUrl}/functions/v1/delete-account`,
                        {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                          },
                        }
                      )

                      const result = await response.json()
                      if (!response.ok || result.error) throw new Error(result.error)

                      await signOut()
                    } catch (err: any) {
                      Alert.alert('Error', err.message ?? 'No se pudo eliminar la cuenta. Contacta a soporte en soporte@jacaranda-lab.com')
                    }
                  }
                }
              ]
            )
          }
        }
      ]
    )
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
            <TouchableOpacity
              style={s.cameraBtn}
              onPress={handlePickAvatar}
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
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>MI TIENDA</Text>
            {profile.role === 'owner' && (
              <TouchableOpacity onPress={() => setEditingStore(!editingStore)}>
                <Text style={s.editLink}>{editingStore ? 'Cancelar' : 'Editar'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {editingStore ? (
            <View style={s.card}>
              <View style={s.editField}>
                <Text style={s.editLabel}>Nombre de la tienda *</Text>
                <TextInput
                  style={s.editInput}
                  value={storeName}
                  onChangeText={setStoreName}
                  placeholder="Ej: Paletería La Güera"
                  placeholderTextColor={colors.inkMuted}
                />
              </View>
              <View style={[s.editField, { borderTopWidth: 0.5, borderTopColor: colors.border }]}>
                <Text style={s.editLabel}>Dirección</Text>
                <TextInput
                  style={s.editInput}
                  value={storeAddress}
                  onChangeText={setStoreAddress}
                  placeholder="Calle, Colonia, Ciudad"
                  placeholderTextColor={colors.inkMuted}
                />
              </View>
              <View style={[s.editField, { borderTopWidth: 0.5, borderTopColor: colors.border }]}>
                <Text style={s.editLabel}>Teléfono</Text>
                <TextInput
                  style={s.editInput}
                  value={storePhone}
                  onChangeText={setStorePhone}
                  placeholder="33 1234 5678"
                  placeholderTextColor={colors.inkMuted}
                  keyboardType="phone-pad"
                />
              </View>
              <TouchableOpacity
                style={[s.saveStoreBtn, savingStore && { opacity: 0.6 }]}
                onPress={handleSaveStore}
                disabled={savingStore}
                activeOpacity={0.85}
              >
                {savingStore
                  ? <ActivityIndicator color={colors.ink} size="small" />
                  : <Text style={s.saveStoreBtnText}>Guardar cambios</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.card}>
              <View style={s.storeRow}>
                <View style={s.storeIcon}>
                  <Ionicons name="storefront" size={18} color={colors.primary} />
                </View>
                <Text style={s.storeName}>
                  {profile.store?.name?.trim() || 'Sin nombre — toca Editar'}
                </Text>
              </View>
              <Row icon="location-outline" label="Dirección" value={profile.store?.address ?? 'No registrada'} />
              <Row icon="call-outline" label="Teléfono" value={profile.store?.phone ?? 'No registrado'} />
              <Row icon="id-card-outline" label="ID" value={(profile.store_id ?? '').slice(0, 8).toUpperCase()} mono />
            </View>
          )}
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

        {/* ── Suscripción (solo owner) ──────────────────────── */}
        {profile.role === 'owner' && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>PLAN</Text>
            <View style={s.card}>
              {/* Badge de estado */}
              <View style={s.subHeader}>
                <View style={[s.subBadge, {
                  backgroundColor:
                    status === 'pro' || status === 'gifted' ? `${colors.primary}20` :
                      status === 'trial' ? `${colors.amber}20` :
                        `${colors.accent}15`
                }]}>
                  <Text style={[s.subBadgeText, {
                    color:
                      status === 'pro' || status === 'gifted' ? colors.primary :
                        status === 'trial' ? colors.amber :
                          colors.accent
                  }]}>
                    {status === 'pro' ? '⭐ Pro' :
                      status === 'gifted' ? '🎁 Pro (Regalo)' :
                        status === 'trial' ? '🕐 Prueba gratuita' :
                          '🔒 Plan gratuito'}
                  </Text>
                </View>
                {status === 'trial' && trialDaysLeft !== null && (
                  <Text style={s.subDays}>
                    {trialDaysLeft === 1 ? 'Último día' : `${trialDaysLeft} días restantes`}
                  </Text>
                )}
              </View>

              <Text style={s.subDesc}>
                {status === 'pro' || status === 'gifted'
                  ? `Tienes acceso completo. Puedes cancelar cuando quieras desde ${Platform.OS === 'ios' ? 'App Store' : 'Google Play'}.`
                  : status === 'trial'
                    ? 'Disfruta todas las funciones Pro durante tu período de prueba.'
                    : 'Actualiza para desbloquear Gastos, Equipo y Reportes anuales.'}
              </Text>

              {/* Botón upgrade o cancelar */}
              {!isPro ? (
                <TouchableOpacity
                  style={s.subBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push('/paywall')}
                >
                  <Ionicons name="star" size={15} color={colors.ink} style={{ marginRight: 6 }} />
                  <Text style={s.subBtnText}>Suscribirse a Pro</Text>
                </TouchableOpacity>
              ) : (
                <View>
                  {/* Info de cancelación */}
                  <View style={s.cancelInfo}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.inkMuted} />
                    <Text style={s.cancelInfoText}>
                      Para cancelar tu suscripción ve a{' '}
                      {Platform.OS === 'ios' ? (
                        <Text style={{ fontWeight: '700' }}>App Store → Tu cuenta → Suscripciones → GelatoFlow</Text>
                      ) : (
                        <Text style={{ fontWeight: '700' }}>Google Play → Suscripciones → GelatoFlow</Text>
                      )}
                      {' '}y selecciona "Cancelar suscripción".
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={s.subBtnOutline}
                    activeOpacity={0.85}
                    onPress={async () => {
                      try {
                        const Purchases = (await import('react-native-purchases')).default
                        await Purchases.restorePurchases()
                        await refreshSub()
                        Alert.alert('✓ Compras restauradas')
                      } catch {
                        Alert.alert('Error', 'No se pudieron restaurar las compras.')
                      }
                    }}
                  >
                    <Text style={s.subBtnOutlineText}>Restaurar compras</Text>
                  </TouchableOpacity>
                </View>
              )}
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

        {/* ── Zona de peligro ───────────────────────────────── */}
        <View style={[s.section, { marginTop: 8, marginBottom: 32 }]}>
          <Text style={s.dangerLabel}>⚠️ ZONA DE PELIGRO</Text>
          <View style={s.dangerCard}>
            <View style={s.dangerInfo}>
              <Ionicons name="warning-outline" size={20} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={s.dangerTitle}>Eliminar cuenta</Text>
                <Text style={s.dangerDesc}>
                  {profile.role === 'owner'
                    ? 'Esto borrará permanentemente tu cuenta, tu negocio y todos los datos asociados (ventas, productos, equipo, gastos). Esta acción no se puede deshacer.'
                    : 'Esto eliminará tu cuenta de GelatoFlow. Perderás acceso al negocio y no podrás recuperar tu cuenta. Esta acción no se puede deshacer.'
                  }
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.deleteBtn}
              onPress={handleDeleteAccount}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={s.deleteBtnText}>Eliminar mi cuenta permanentemente</Text>
            </TouchableOpacity>
          </View>
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

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  editLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  editField: { paddingHorizontal: 14, paddingVertical: 10 },
  editLabel: { fontSize: 10, color: colors.inkMuted, marginBottom: 4, fontWeight: '500' },
  editInput: {
    fontSize: 14, color: colors.ink,
    paddingVertical: 8, paddingHorizontal: 0,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  saveStoreBtn: {
    margin: 14, backgroundColor: colors.primary,
    borderRadius: radius.md, paddingVertical: 13,
    alignItems: 'center',
  },
  saveStoreBtnText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: radius.lg,
    borderWidth: 1, borderColor: `${colors.accent}30`,
    backgroundColor: `${colors.accent}07`,
  },
  signOutText: { color: colors.accent, fontSize: 15, fontWeight: '600' },

  // ── Suscripción ──────────────────────────────────────────────
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 8 },
  subBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  subBadgeText: { fontSize: 13, fontWeight: '700' },
  subDays: { fontSize: 12, color: colors.amber, fontWeight: '600' },
  subDesc: { fontSize: 13, color: colors.inkMuted, lineHeight: 18, paddingHorizontal: 14, paddingBottom: 14 },
  subBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, marginHorizontal: 14, marginBottom: 14,
    paddingVertical: 13, borderRadius: radius.md,
  },
  subBtnText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  subBtnOutline: {
    alignItems: 'center', marginHorizontal: 14, marginBottom: 14,
    paddingVertical: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  subBtnOutlineText: { color: colors.inkMuted, fontWeight: '500', fontSize: 13 },
  cancelInfo: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    marginHorizontal: 14, marginBottom: 12,
    padding: 12, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5, borderColor: colors.border,
  },
  cancelInfoText: { fontSize: 12, color: colors.inkMuted, lineHeight: 17, flex: 1 },

  // ── Zona de peligro ──────────────────────────────────────────
  dangerLabel: {
    fontSize: 10, fontWeight: '700',
    color: colors.accent, letterSpacing: 0.1,
    marginBottom: 8,
  },
  dangerCard: {
    borderWidth: 1, borderColor: `${colors.accent}40`,
    borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: `${colors.accent}08`,
  },
  dangerInfo: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1, borderBottomColor: `${colors.accent}25`,
  },
  dangerTitle: { fontSize: 14, fontWeight: '600', color: colors.accent, marginBottom: 4 },
  dangerDesc: { fontSize: 12, color: colors.inkMuted, lineHeight: 17 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, backgroundColor: colors.accent,
  },
  deleteBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})