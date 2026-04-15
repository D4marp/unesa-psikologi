'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authAPI } from '@/lib/apiClient'

type AuthUser = {
  id: number
  full_name: string
  email: string
  role: 'admin' | 'manager' | 'viewer'
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  refreshUser: () => Promise<void>
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const me = await authAPI.me()
      setUser(me as AuthUser)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password)
    setUser(response.user as AuthUser)
    return response.user as AuthUser
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } finally {
      setUser(null)
    }
  }

  const value = useMemo(() => ({ user, loading, refreshUser, login, logout }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}