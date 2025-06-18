import { createContext, useContext, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'

import { authService } from '@/services/auth'
import type { User, LoginRequest } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  })

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('access_token')
      const refreshToken = localStorage.getItem('refresh_token')

      if (token) {
        try {
          // Check if token is expired
          const decoded = jwtDecode(token)
          const currentTime = Date.now() / 1000

          if (decoded.exp && decoded.exp > currentTime) {
            // Token is still valid
            const user = await authService.getCurrentUser()
            setState({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            })
          } else if (refreshToken) {
            // Token expired, try to refresh
            try {
              await refreshTokenHandler()
            } catch (error) {
              // Refresh failed, clear auth
              clearAuth()
            }
          } else {
            // No refresh token, clear auth
            clearAuth()
          }
        } catch (error) {
          // Invalid token, clear auth
          clearAuth()
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initializeAuth()
  }, [])

  const clearAuth = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials)
      
      // Store tokens
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      
      setState({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      clearAuth()
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      // Even if logout API fails, clear local state
      console.error('Logout error:', error)
    } finally {
      clearAuth()
    }
  }

  const refreshTokenHandler = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await authService.refreshToken({ refresh_token: refreshToken })
      
      localStorage.setItem('access_token', response.access_token)
      
      // Get updated user info
      const user = await authService.getCurrentUser()
      
      setState(prev => ({
        ...prev,
        user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
      }))
    } catch (error) {
      clearAuth()
      throw error
    }
  }

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshToken: refreshTokenHandler,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}