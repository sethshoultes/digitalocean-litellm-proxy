import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { jwtDecode } from 'jwt-decode'
import { toast } from 'react-hot-toast'

import { authService } from '@/services/auth'
import type { User, LoginRequest } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  clearError: () => void
  hasRole: (role: 'admin' | 'user') => boolean
  isTokenExpiring: () => boolean
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
    error: null,
  })

  // Refs for managing timers and preventing duplicate refresh calls
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)
  const mountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  // Utility function to safely update state only if component is mounted
  const safeSetState = useCallback((updater: (prev: AuthState) => AuthState) => {
    if (mountedRef.current) {
      setState(updater)
    }
  }, [])

  // Clear authentication state
  const clearAuth = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
    
    safeSetState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  }, [safeSetState])

  // Schedule token refresh before expiration
  const scheduleRefresh = useCallback((token: string) => {
    try {
      const decoded = jwtDecode(token)
      if (!decoded.exp) return

      const currentTime = Date.now() / 1000
      const expirationTime = decoded.exp
      const timeUntilExpiry = expirationTime - currentTime
      
      // Refresh token 5 minutes before expiration, but not less than 30 seconds
      const refreshTime = Math.max(timeUntilExpiry - 300, 30)
      
      if (refreshTime > 0) {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current)
        }
        
        refreshTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current && !isRefreshingRef.current) {
            refreshTokenHandler()
          }
        }, refreshTime * 1000)
      }
    } catch (error) {
      console.error('Error scheduling token refresh:', error)
    }
  }, [])

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
            // Token is still valid, get user info
            try {
              const user = await authService.getCurrentUser()
              safeSetState(prev => ({
                ...prev,
                user,
                token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              }))
              
              // Schedule refresh for this token
              scheduleRefresh(token)
            } catch (error) {
              console.error('Failed to get user info:', error)
              // Token might be invalid, try to refresh
              if (refreshToken) {
                try {
                  await refreshTokenHandler()
                } catch (refreshError) {
                  clearAuth()
                }
              } else {
                clearAuth()
              }
            }
          } else if (refreshToken) {
            // Token expired, try to refresh
            try {
              await refreshTokenHandler()
            } catch (error) {
              console.error('Token refresh failed during initialization:', error)
              clearAuth()
            }
          } else {
            // No refresh token, clear auth
            clearAuth()
          }
        } catch (error) {
          console.error('Invalid token during initialization:', error)
          clearAuth()
        }
      } else {
        safeSetState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initializeAuth()
  }, [clearAuth, safeSetState, scheduleRefresh])

  // Login function
  const login = useCallback(async (credentials: LoginRequest) => {
    safeSetState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await authService.login(credentials)
      
      // Store tokens
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      
      safeSetState({
        user: response.user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
      
      // Schedule automatic refresh
      scheduleRefresh(response.access_token)
      
    } catch (error) {
      console.error('Login failed:', error)
      clearAuth()
      safeSetState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      }))
      throw error
    }
  }, [clearAuth, safeSetState, scheduleRefresh])

  // Logout function
  const logout = useCallback(async () => {
    safeSetState(prev => ({ ...prev, isLoading: true }))
    
    try {
      // Call logout API to invalidate tokens on server
      await authService.logout()
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout API error:', error)
      // Continue with local cleanup even if API fails
    } finally {
      clearAuth()
    }
  }, [clearAuth, safeSetState])

  // Token refresh handler
  const refreshTokenHandler = useCallback(async () => {
    if (isRefreshingRef.current) {
      // Already refreshing, wait for it to complete
      return
    }
    
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    isRefreshingRef.current = true

    try {
      const response = await authService.refreshToken({ refresh_token: refreshToken })
      
      // Update stored token
      localStorage.setItem('access_token', response.access_token)
      
      // Get updated user info
      const user = await authService.getCurrentUser()
      
      safeSetState(prev => ({
        ...prev,
        user,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }))
      
      // Schedule next refresh
      scheduleRefresh(response.access_token)
      
    } catch (error) {
      console.error('Token refresh failed:', error)
      clearAuth()
      toast.error('Session expired. Please log in again.')
      throw error
    } finally {
      isRefreshingRef.current = false
    }
  }, [clearAuth, safeSetState, scheduleRefresh])

  // Additional utility functions
  const clearError = useCallback(() => {
    safeSetState(prev => ({ ...prev, error: null }))
  }, [safeSetState])

  const hasRole = useCallback((role: 'admin' | 'user') => {
    if (!state.user) return false
    if (role === 'user') return true // Users can access user-level content
    return state.user.role === 'admin' // Only admins can access admin content
  }, [state.user])

  const isTokenExpiring = useCallback(() => {
    if (!state.token) return false
    
    try {
      const decoded = jwtDecode(state.token)
      if (!decoded.exp) return false
      
      const currentTime = Date.now() / 1000
      const expirationTime = decoded.exp
      const timeUntilExpiry = expirationTime - currentTime
      
      // Consider token as expiring if less than 5 minutes left
      return timeUntilExpiry < 300
    } catch {
      return true
    }
  }, [state.token])

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshToken: refreshTokenHandler,
    clearError,
    hasRole,
    isTokenExpiring,
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