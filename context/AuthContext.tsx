// context/AuthContext.tsx
import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    ReactNode,
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
        // Usamos .limit(1).maybeSingle() en lugar de .single() para evitar el error
        // "Cannot coerce to a single JSON object" que ocurre cuando hay perfiles
        // duplicados (el trigger se ejecutó más de una vez).
        // maybeSingle() devuelve null si no hay resultado, sin lanzar error.
        const { data, error } = await supabase
            .from('profiles')
            .select(`
        id,
        email,
        full_name,
        role,
        store_id,
        store:stores (
          id,
          name,
          address,
          phone
        )
      `)
            .eq('id', userId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

        if (error) {
            console.error('[AuthContext] Error al cargar perfil:', error.message)
            setProfile(null)
        } else if (!data) {
            console.warn('[AuthContext] No se encontró perfil para userId:', userId)
            setProfile(null)
        } else {
            setProfile(data as Profile)
        }
    }, [])

    const refreshProfile = useCallback(async () => {
        if (session?.user?.id) {
            await fetchProfile(session.user.id)
        }
    }, [session, fetchProfile])

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session?.user) {
                fetchProfile(session.user.id).finally(() => setLoading(false))
            } else {
                setLoading(false)
            }
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
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