import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { PERSIST_CONFIG } from '../config/storage'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'RECEPTION'
  hotelId: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithMagicLink: (token: string) => Promise<void>
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/mobile/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) throw new Error('Login failed')

      const { user, token } = await response.json()
      await AsyncStorage.setItem(PERSIST_CONFIG.tokenKey, token)
      await AsyncStorage.setItem(PERSIST_CONFIG.userKey, JSON.stringify(user))

      set({ user, token, isAuthenticated: true })
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  loginWithMagicLink: async (token: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/mobile/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      if (!response.ok) throw new Error('Magic link validation failed')

      const { user, token: sessionToken } = await response.json()
      await AsyncStorage.setItem(PERSIST_CONFIG.tokenKey, sessionToken)
      await AsyncStorage.setItem(PERSIST_CONFIG.userKey, JSON.stringify(user))

      set({ user, token: sessionToken, isAuthenticated: true })
    } catch (error) {
      console.error('Magic link error:', error)
      throw error
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem(PERSIST_CONFIG.tokenKey)
    await AsyncStorage.removeItem(PERSIST_CONFIG.userKey)
    set({ user: null, token: null, isAuthenticated: false })
  },

  restoreSession: async () => {
    try {
      const token = await AsyncStorage.getItem(PERSIST_CONFIG.tokenKey)
      const userJson = await AsyncStorage.getItem(PERSIST_CONFIG.userKey)

      if (token && userJson) {
        const user = JSON.parse(userJson)
        set({ user, token, isAuthenticated: true })
      }
    } catch (error) {
      console.error('Session restore error:', error)
    } finally {
      set({ isLoading: false })
    }
  }
}))
