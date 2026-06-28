import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  session: unknown | null
  loading: boolean
  setUser: (user: User | null) => void
  setSession: (session: unknown | null) => void
  setLoading: (loading: boolean) => void
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      loading: true,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),

      signIn: async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) return { error: error.message }

          if (data.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single()

            if (profile) {
              set({ user: profile, session: data.session })
            } else {
              // Profile missing — create it now
              const { data: newProfile } = await supabase
                .from('profiles')
                .upsert({
                  id: data.user.id,
                  email: data.user.email!,
                  full_name: data.user.user_metadata?.full_name || '',
                  role: 'admin',
                }, { onConflict: 'id' })
                .select()
                .single()

              set({
                user: newProfile || {
                  id: data.user.id,
                  email: data.user.email!,
                  full_name: data.user.user_metadata?.full_name || '',
                  role: 'admin',
                  created_at: data.user.created_at,
                },
                session: data.session,
              })
            }
          }
          return { error: null }
        } catch (err) {
          return { error: (err as Error).message || 'An unexpected error occurred' }
        }
      },

      signUp: async (email, password, fullName) => {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          })

          if (error) return { error: error.message }
          if (!data.user) return { error: 'Signup failed — no user returned' }

          // Upsert profile manually (alongside the DB trigger)
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email,
            full_name: fullName,
            role: 'admin',
          }, { onConflict: 'id' })

          // Auto-login if email confirmation is disabled
          if (data.session) {
            set({
              user: {
                id: data.user.id,
                email,
                full_name: fullName,
                role: 'admin',
                created_at: data.user.created_at,
              },
              session: data.session,
            })
          }

          return { error: null }
        } catch (err) {
          return { error: (err as Error).message || 'An unexpected error occurred' }
        }
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, session: null })
      },

      initialize: async () => {
        try {
          set({ loading: true })
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            set({
              user: profile || {
                id: session.user.id,
                email: session.user.email!,
                full_name: session.user.user_metadata?.full_name || '',
                role: 'admin',
                created_at: session.user.created_at,
              },
              session,
            })
          }

          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()

              set({
                user: profile || {
                  id: session.user.id,
                  email: session.user.email!,
                  full_name: session.user.user_metadata?.full_name || '',
                  role: 'admin',
                  created_at: session.user.created_at,
                },
                session,
              })
            } else if (event === 'SIGNED_OUT') {
              set({ user: null, session: null })
            }
          })
        } finally {
          set({ loading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
