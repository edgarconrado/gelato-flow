// app/team/index.tsx — Gestión de equipo · Ink & Mint
import { useState, useEffect, useCallback } from 'react'
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    Alert, TextInput, ActivityIndicator, Modal, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { supabase, Profile, StoreInvitation } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { colors, radius, shadow } from '../../constants/theme'

const ROLE_INFO = {
    owner: { label: 'Propietario', color: '#F5A623', icon: '👑' },
    manager: { label: 'Gerente', color: colors.primary, icon: '🧑‍💼' },
    cashier: { label: 'Cajero', color: colors.inkMuted, icon: '🧑‍💻' },
}

export default function TeamScreen() {
    const { profile } = useAuth()
    const router = useRouter()
    const isOwner = profile?.role === 'owner'

    const [members, setMembers] = useState<Profile[]>([])
    const [invitations, setInvitations] = useState<StoreInvitation[]>([])
    const [loading, setLoading] = useState(true)
    const [showInvite, setShowInvite] = useState(false)

    const load = useCallback(async () => {
        if (!profile?.store_id) return
        setLoading(true)

        const [membersRes, invitationsRes] = await Promise.all([
            supabase
                .from('profiles')
                .select('*')
                .eq('store_id', profile.store_id)
                .order('role')
                .order('full_name'),
            isOwner
                ? supabase
                    .from('store_invitations')
                    .select('*')
                    .eq('store_id', profile.store_id)
                    .eq('accepted', false)
                    .gt('expires_at', new Date().toISOString())
                    .order('created_at', { ascending: false })
                : Promise.resolve({ data: [], error: null }),
        ])

        setMembers((membersRes.data ?? []) as Profile[])
        setInvitations((invitationsRes.data ?? []) as StoreInvitation[])
        setLoading(false)
    }, [profile?.store_id, isOwner])

    useEffect(() => { load() }, [load])

    const handleChangeRole = (member: Profile) => {
        if (!isOwner || member.id === profile?.id) return

        const options = ['manager', 'cashier'].filter(r => r !== member.role)
        const labels = options.map(r => ROLE_INFO[r as keyof typeof ROLE_INFO].label)

        Alert.alert(
            `Cambiar rol de ${member.full_name ?? member.email}`,
            `Rol actual: ${ROLE_INFO[member.role].label}`,
            [
                ...options.map((role, i) => ({
                    text: `Cambiar a ${labels[i]}`,
                    onPress: async () => {
                        const { error } = await supabase
                            .from('profiles')
                            .update({ role })
                            .eq('id', member.id)
                        if (error) Alert.alert('Error', error.message)
                        else load()
                    },
                })),
                { text: 'Cancelar', style: 'cancel' },
            ]
        )
    }

    const handleRemoveMember = (member: Profile) => {
        if (!isOwner || member.id === profile?.id) return
        Alert.alert(
            'Eliminar del equipo',
            `¿Quieres quitar a ${member.full_name ?? member.email} de tu tienda?\n\nEsto no borra su cuenta, solo pierde acceso.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar', style: 'destructive',
                    onPress: async () => {
                        // Mover el usuario fuera de la tienda (store_id a null no es posible por FK)
                        // La mejor práctica es revocar asignándole un rol inactivo o eliminando el perfil
                        const { error } = await supabase
                            .from('profiles')
                            .delete()
                            .eq('id', member.id)
                            .neq('role', 'owner')  // nunca borrar owners
                        if (error) Alert.alert('Error', error.message)
                        else load()
                    },
                },
            ]
        )
    }

    const handleCancelInvitation = async (inv: StoreInvitation) => {
        const { error } = await supabase
            .from('store_invitations')
            .delete()
            .eq('id', inv.id)
        if (error) Alert.alert('Error', error.message)
        else load()
    }

    return (
        <SafeAreaView style={s.safe}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.title}>Equipo</Text>
                    <Text style={s.subtitle}>{members.length} miembro{members.length !== 1 ? 's' : ''}</Text>
                </View>
                {isOwner && (
                    <TouchableOpacity style={s.inviteBtn} onPress={() => setShowInvite(true)}>
                        <Ionicons name="person-add-outline" size={16} color={colors.ink} />
                        <Text style={s.inviteBtnText}>Invitar</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 90 }}>

                    {/* Miembros activos */}
                    <View>
                        <Text style={s.sectionLabel}>MIEMBROS ACTIVOS</Text>
                        <View style={s.card}>
                            {members.map((member, idx) => (
                                <MemberRow
                                    key={member.id}
                                    member={member}
                                    isSelf={member.id === profile?.id}
                                    isOwner={isOwner}
                                    isLast={idx === members.length - 1}
                                    onChangeRole={() => handleChangeRole(member)}
                                    onRemove={() => handleRemoveMember(member)}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Invitaciones pendientes */}
                    {isOwner && invitations.length > 0 && (
                        <View>
                            <Text style={s.sectionLabel}>INVITACIONES PENDIENTES</Text>
                            <View style={s.card}>
                                {invitations.map((inv, idx) => (
                                    <InvitationRow
                                        key={inv.id}
                                        invitation={inv}
                                        isLast={idx === invitations.length - 1}
                                        onCancel={() => handleCancelInvitation(inv)}
                                    />
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Info de roles */}
                    <View style={s.rolesInfo}>
                        <Text style={s.rolesInfoTitle}>Permisos por rol</Text>
                        <RoleRow icon="👑" role="Propietario" perms="Todo: ventas, inventario, equipo, reportes" />
                        <RoleRow icon="🧑‍💼" role="Gerente" perms="Ventas, inventario y reportes" />
                        <RoleRow icon="🧑‍💻" role="Cajero" perms="Solo ventas y consulta de inventario" />
                    </View>

                </ScrollView>
            )}

            {/* Modal invitar */}
            <InviteModal
                visible={showInvite}
                storeId={profile?.store_id ?? ''}
                onClose={() => setShowInvite(false)}
                onSuccess={() => { setShowInvite(false); load() }}
            />
        </SafeAreaView>
    )
}

// ─── Member row ───────────────────────────────────────────────

function MemberRow({ member, isSelf, isOwner, isLast, onChangeRole, onRemove }: {
    member: Profile
    isSelf: boolean
    isOwner: boolean
    isLast: boolean
    onChangeRole: () => void
    onRemove: () => void
}) {
    const ri = ROLE_INFO[member.role] ?? ROLE_INFO.cashier
    const initials = (member.full_name ?? member.email ?? 'U')
        .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

    return (
        <View style={[s.memberRow, !isLast && s.memberRowBorder]}>
            {/* Avatar */}
            {member.avatar_url ? (
                <Image source={{ uri: member.avatar_url }} style={s.avatar} contentFit="cover" />
            ) : (
                <View style={[s.avatar, s.avatarPlaceholder]}>
                    <Text style={s.avatarText}>{initials}</Text>
                </View>
            )}

            {/* Info */}
            <View style={{ flex: 1 }}>
                <View style={s.memberNameRow}>
                    <Text style={s.memberName} numberOfLines={1}>
                        {member.full_name ?? member.email}
                        {isSelf && <Text style={s.selfTag}> (tú)</Text>}
                    </Text>
                </View>
                <Text style={s.memberEmail} numberOfLines={1}>{member.email}</Text>
                <View style={[s.rolePill, { backgroundColor: `${ri.color}18` }]}>
                    <Text style={s.roleIcon}>{ri.icon}</Text>
                    <Text style={[s.roleLabel, { color: ri.color }]}>{ri.label}</Text>
                </View>
            </View>

            {/* Acciones (solo owner, no en sí mismo, no en otros owners) */}
            {isOwner && !isSelf && member.role !== 'owner' && (
                <View style={s.memberActions}>
                    <TouchableOpacity style={s.actionBtn} onPress={onChangeRole}>
                        <Ionicons name="swap-horizontal-outline" size={16} color={colors.inkMid} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionBtn} onPress={onRemove}>
                        <Ionicons name="person-remove-outline" size={16} color={colors.accent} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    )
}

// ─── Invitation row ───────────────────────────────────────────

function InvitationRow({ invitation, isLast, onCancel }: {
    invitation: StoreInvitation
    isLast: boolean
    onCancel: () => void
}) {
    const ri = ROLE_INFO[invitation.role] ?? ROLE_INFO.cashier
    const expiresIn = Math.ceil(
        (new Date(invitation.expires_at).getTime() - Date.now()) / 86400000
    )

    return (
        <View style={[s.memberRow, !isLast && s.memberRowBorder]}>
            <View style={[s.avatar, { backgroundColor: colors.background }]}>
                <Ionicons name="mail-outline" size={18} color={colors.inkMuted} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={s.memberName}>{invitation.email}</Text>
                <Text style={s.memberEmail}>Expira en {expiresIn} día{expiresIn !== 1 ? 's' : ''}</Text>
                <View style={[s.rolePill, { backgroundColor: `${ri.color}18` }]}>
                    <Text style={s.roleIcon}>{ri.icon}</Text>
                    <Text style={[s.roleLabel, { color: ri.color }]}>{ri.label}</Text>
                </View>
            </View>
            <TouchableOpacity style={s.actionBtn} onPress={onCancel}>
                <Ionicons name="close-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
        </View>
    )
}

// ─── Role info row ────────────────────────────────────────────

function RoleRow({ icon, role, perms }: { icon: string; role: string; perms: string }) {
    return (
        <View style={s.roleInfoRow}>
            <Text style={{ fontSize: 16 }}>{icon}</Text>
            <View style={{ flex: 1 }}>
                <Text style={s.roleInfoName}>{role}</Text>
                <Text style={s.roleInfoPerms}>{perms}</Text>
            </View>
        </View>
    )
}

// ─── Invite modal ─────────────────────────────────────────────

function InviteModal({ visible, storeId, onClose, onSuccess }: {
    visible: boolean
    storeId: string
    onClose: () => void
    onSuccess: () => void
}) {
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<'manager' | 'cashier'>('cashier')
    const [saving, setSaving] = useState(false)

    const handleInvite = async () => {
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Email inválido', 'Ingresa un correo electrónico válido.')
            return
        }

        setSaving(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()

            // DEBUG: mostrar la URL exacta que se va a llamar
            const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/smart-handler`
            console.log('[Invite] URL:', url)
            console.log('[Invite] Token present:', !!session?.access_token)

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                    'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
                },
                body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
            })

            // DEBUG: mostrar status y body completo
            const rawText = await response.text()
            console.log('[Invite] Status:', response.status)
            console.log('[Invite] Body:', rawText)

            let result: any = {}
            try { result = JSON.parse(rawText) } catch { result = { error: rawText } }

            if (!response.ok || result.error) {
                Alert.alert(
                    `Error ${response.status}`,
                    result.error ?? rawText ?? 'Sin respuesta del servidor'
                )
                return
            }

            Alert.alert(
                '✓ Invitación enviada',
                result.message ?? `Correo enviado a ${email}.`,
                [{ text: 'Listo', onPress: onSuccess }]
            )
            setEmail('')
            setRole('cashier')

        } catch (err: any) {
            console.log('[Invite] Catch error:', err)
            Alert.alert('Error de red', `${err?.message ?? 'Sin detalle'}\n\nURL: ${process.env.EXPO_PUBLIC_SUPABASE_URL}`)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={s.safe}>
                <View style={s.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                    <Text style={[s.title, { flex: 1, textAlign: 'center' }]}>Invitar miembro</Text>
                    <View style={{ width: 22 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, gap: 8, paddingBottom: 90 }}>

                    <Text style={s.sectionLabel}>CORREO ELECTRÓNICO</Text>
                    <TextInput
                        style={s.input}
                        placeholder="cajero@gelatoflow.mx"
                        placeholderTextColor={colors.inkMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={email}
                        onChangeText={setEmail}
                    />

                    <Text style={[s.sectionLabel, { marginTop: 20 }]}>ROL</Text>
                    <View style={s.roleSelector}>
                        {(['cashier', 'manager'] as const).map(r => {
                            const ri = ROLE_INFO[r]
                            return (
                                <TouchableOpacity
                                    key={r}
                                    style={[s.roleOption, role === r && s.roleOptionActive]}
                                    onPress={() => setRole(r)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={{ fontSize: 24 }}>{ri.icon}</Text>
                                    <Text style={[s.roleOptionLabel, role === r && s.roleOptionLabelActive]}>
                                        {ri.label}
                                    </Text>
                                    <Text style={s.roleOptionDesc}>
                                        {r === 'cashier' ? 'Solo ventas' : 'Ventas + inventario'}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>

                    <View style={s.inviteNote}>
                        <Ionicons name="information-circle-outline" size={16} color={colors.inkMuted} />
                        <Text style={s.inviteNoteText}>
                            El usuario recibirá un email para registrarse. Al hacerlo, se unirá automáticamente a tu tienda con el rol seleccionado.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[s.inviteSubmitBtn, saving && { opacity: 0.6 }]}
                        onPress={handleInvite}
                        disabled={saving}
                        activeOpacity={0.85}
                    >
                        {saving
                            ? <ActivityIndicator color={colors.ink} />
                            : <>
                                <Ionicons name="paper-plane-outline" size={17} color={colors.ink} />
                                <Text style={s.inviteSubmitText}>Enviar invitación</Text>
                            </>
                        }
                    </TouchableOpacity>

                </ScrollView>
            </SafeAreaView>
        </Modal>
    )
}

// ─── Estilos ─────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    header: {
        backgroundColor: colors.ink,
        paddingHorizontal: 20, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        ...shadow.header,
    },
    backBtn: { padding: 2 },
    title: { fontSize: 18, fontWeight: '600', color: '#fff', letterSpacing: -0.3 },
    subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
    inviteBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.primary,
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.md,
    },
    inviteBtnText: { color: colors.ink, fontWeight: '700', fontSize: 13 },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    sectionLabel: {
        fontSize: 11, fontWeight: '600', color: colors.inkMuted,
        letterSpacing: 0.07, marginBottom: 10,
    },

    card: {
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 0.5, borderColor: colors.border,
        overflow: 'hidden', ...shadow.sm,
    },

    memberRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingVertical: 14,
    },
    memberRowBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.border },

    avatar: {
        width: 44, height: 44, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarPlaceholder: { backgroundColor: colors.primary },
    avatarText: { fontSize: 16, fontWeight: '700', color: colors.ink },

    memberNameRow: { flexDirection: 'row', alignItems: 'center' },
    memberName: { fontSize: 14, fontWeight: '500', color: colors.ink, flex: 1 },
    selfTag: { fontSize: 12, color: colors.inkMuted, fontWeight: '400' },
    memberEmail: { fontSize: 12, color: colors.inkMuted, marginTop: 1, marginBottom: 6 },

    rolePill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: radius.pill,
    },
    roleIcon: { fontSize: 12 },
    roleLabel: { fontSize: 11, fontWeight: '500' },

    memberActions: { flexDirection: 'row', gap: 4 },
    actionBtn: {
        width: 34, height: 34, borderRadius: radius.sm,
        backgroundColor: colors.background,
        alignItems: 'center', justifyContent: 'center',
    },

    rolesInfo: {
        backgroundColor: colors.surface, borderRadius: radius.lg,
        borderWidth: 0.5, borderColor: colors.border,
        padding: 16, gap: 2, ...shadow.sm,
    },
    rolesInfoTitle: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 10 },
    roleInfoRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: colors.border,
    },
    roleInfoName: { fontSize: 13, fontWeight: '500', color: colors.ink, marginBottom: 2 },
    roleInfoPerms: { fontSize: 12, color: colors.inkMuted, lineHeight: 16 },

    // Invite modal
    input: {
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 15, color: colors.ink, backgroundColor: colors.surface,
    },
    roleSelector: { flexDirection: 'row', gap: 12 },
    roleOption: {
        flex: 1, alignItems: 'center', gap: 4,
        paddingVertical: 16,
        borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    roleOptionActive: { borderColor: colors.ink, backgroundColor: colors.ink },
    roleOptionLabel: { fontSize: 14, fontWeight: '500', color: colors.inkMid },
    roleOptionLabelActive: { color: '#fff' },
    roleOptionDesc: { fontSize: 11, color: colors.inkMuted, textAlign: 'center' },

    inviteNote: {
        flexDirection: 'row', gap: 8, alignItems: 'flex-start',
        backgroundColor: colors.background,
        padding: 14, borderRadius: radius.md,
        borderWidth: 0.5, borderColor: colors.border,
        marginTop: 8,
    },
    inviteNoteText: { flex: 1, fontSize: 12, color: colors.inkMuted, lineHeight: 18 },

    inviteSubmitBtn: {
        backgroundColor: colors.primary, borderRadius: radius.md,
        paddingVertical: 16, alignItems: 'center',
        flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16,
    },
    inviteSubmitText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
})