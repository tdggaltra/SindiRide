import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null

  setAuth: (user: User, token: string, refreshToken: string) => void
  setTokens: (token: string, refreshToken: string) => void
  updateUser: (partial: Partial<User>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,

      setAuth: (user, token, refreshToken) =>
        set({ user, token, refreshToken }),

      setTokens: (token, refreshToken) =>
        set({ token, refreshToken }),

      updateUser: (partial) => {
        const current = get().user
        if (current) set({ user: { ...current, ...partial } })
      },

      logout: () =>
        set({ user: null, token: null, refreshToken: null }),
    }),
    {
      name: 'drivesindicos:auth',
      // Persiste apenas os campos necessários
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    },
  ),
)
