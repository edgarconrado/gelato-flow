// app/(tabs)/profile.tsx
import {
  View, Text, StyleSheet,
  TouchableOpacity, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../constants/theme'

const ROLE_LABELS: Record<string, string> = {
  owner: '👑 Propietario',
  manager: '🧑‍💼 Gerente',
  cashier: '🧑‍💻 Cajero',
}

export default function ProfileScreen() {
  const { profile, signOut } = useAuth()

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ])
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.full_name ?? profile?.email ?? '?')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.full_name ?? 'Usuario'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{ROLE_LABELS[profile?.role ?? ''] ?? profile?.role}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <InfoRow icon="storefront-outline" label="Tienda" value={profile?.store?.name ?? '—'} />
        <InfoRow icon="location-outline" label="Dirección" value={profile?.store?.address ?? '—'} />
        <InfoRow icon="call-outline" label="Teléfono" value={profile?.store?.phone ?? '—'} />
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={colors.accent} />
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  card: {
    margin: 16, backgroundColor: colors.surface,
    borderRadius: 20, padding: 24, alignItems: 'center', gap: 8,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  email: { fontSize: 14, color: colors.muted },
  roleBadge: {
    backgroundColor: `${colors.primary}20`, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, marginTop: 4,
  },
  roleText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  infoCard: {
    marginHorizontal: 16, backgroundColor: colors.surface,
    borderRadius: 16, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  infoLabel: { fontSize: 12, color: colors.muted },
  infoValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: 20, padding: 16, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.accent,
  },
  signOutText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
})