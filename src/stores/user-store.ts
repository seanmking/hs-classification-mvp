import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email?: string
  name?: string
  role: 'user' | 'admin' | 'expert'
}

interface UserState {
  user: User | null
  isAuthenticated: boolean
  session: {
    token: string | null
    expiresAt: Date | null
  }
  
  // Actions
  login: (user: User, token: string, expiresAt: Date) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  
  // Computed
  isSessionValid: () => boolean
  canAccessExpertFeatures: () => boolean
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      session: {
        token: null,
        expiresAt: null,
      },
      
      login: (user, token, expiresAt) => {
        set({
          user,
          isAuthenticated: true,
          session: { token, expiresAt },
        })
      },
      
      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          session: { token: null, expiresAt: null },
        })
      },
      
      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }))
      },
      
      isSessionValid: () => {
        const { session } = get()
        if (!session.token || !session.expiresAt) return false
        return new Date() < new Date(session.expiresAt)
      },
      
      canAccessExpertFeatures: () => {
        const { user } = get()
        return user?.role === 'admin' || user?.role === 'expert'
      },
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
)