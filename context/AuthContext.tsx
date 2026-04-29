// context/AuthContext.tsx
import {
    createContext, useContext, useEffect,
    useState, useCallback, ReactNode,
} from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'

interface AuthContextType {
    session: Session | null
    profile: Profile | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<string | null>
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select(`
        id, email, full_name, role, store_id,
        store:stores (id, name, address, phone)
      `)
            .eq('id', userId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

        if (error) {
            console.error('[AuthContext] Error al cargar perfil:', error.message)
            setProfile(null)
        } else if (!data) {
            console.warn('[AuthContext] Sin perfil para userId:', userId)
            setProfile(null)
        } else {
            setProfile(data as Profile)
        }
    }, [])

    const refreshProfile = useCallback(async () => {
        if (session?.user?.id) await fetchProfile(session.user.id)
    }, [session, fetchProfile])

    useEffect(() => {
        // Recuperar sesión guardada en AsyncStorage.
        // Siempre limpiar cualquier sesión de invitación pendiente al arrancar.
        // Usuarios normales tienen sesión persistida — la recuperamos.
        // Usuarios invitados (invited=true) son redirigidos al login para
        // que usen el flujo "Tengo un código de invitación".
        supabase.auth.getSession().then(async ({ data: { session }, error }) => {
            if (error) {
                console.warn('[AuthContext] Token invalido:', error.message)
                await supabase.auth.signOut()
                setSession(null)
                setProfile(null)
                setLoading(false)
                return
            }

            // Solo limpiar si es una sesión de invitación con email sin confirmar
            // (el usuario nunca completó el flujo de bienvenida).
            // NO limpiar si email_confirmed_at existe — ya completó el proceso.
            const isIncompleteInvite =
                session?.user?.user_metadata?.invited === true &&
                !session?.user?.email_confirmed_at

            if (session && isIncompleteInvite) {
                console.log('[AuthContext] Sesion de invitacion incompleta, limpiando...')
                await supabase.auth.signOut()
                setSession(null)
                setProfile(null)
                setLoading(false)
                return
            }

            setSession(session)
            if (session?.user) {
                fetchProfile(session.user.id).finally(() => setLoading(false))
            } else {
                setLoading(false)
            }
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('[AuthContext] onAuthStateChange event:', event)

                if (event === 'SIGNED_OUT' || (!session && event === 'TOKEN_REFRESHED')) {
                    setSession(null)
                    setProfile(null)
                    return
                }

                // USER_UPDATED: la contraseña fue actualizada exitosamente.
                // NO interferir — welcome.tsx maneja su propio signOut después.
                if (event === 'USER_UPDATED') {
                    console.log('[AuthContext] USER_UPDATED — no interferir')
                    return
                }

                // SIGNED_IN con invited=true: viene de verifyOtp en welcome.tsx.
                // No establecer sesión normal — welcome.tsx la maneja directamente.
                if (event === 'SIGNED_IN' && session?.user?.user_metadata?.invited === true) {
                    console.log('[AuthContext] SIGNED_IN con invited=true — no interferir')
                    return
                }

                setSession(session)
                if (session?.user) {
                    await fetchProfile(session.user.id)
                } else {
                    setProfile(null)
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [fetchProfile])

    const signIn = async (email: string, password: string): Promise<string | null> => {
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
        })
        return error ? error.message : null
    }

    const signOut = async () => {
        await supabase.auth.signOut()
    }

    return (
        <AuthContext.Provider value={{ session, profile, loading, signIn, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('[useAuth] Debe usarse dentro de <AuthProvider>')
    return ctx
}

export function useStoreId(): string | null {
    const { profile } = useAuth()
    return profile?.store_id ?? null
}