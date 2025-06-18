import { useEffect, useState, useCallback } from 'react'
import { authService } from '@/services/auth'
import type { 
  User, 
  LoginRequest, 
  ChangePasswordRequest, 
  UserRole,
  AuthState 
} from '@/types'

interface UseAuthReturn {
  // State
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  changePassword: (request: ChangePasswordRequest) => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
  
  // Utilities
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
  isAdmin: () => boolean
  isTokenExpiringSoon: (thresholdMinutes?: number) => boolean
}

export const useAuth = (): UseAuthReturn => {
  const [authState, setAuthState] = useState<AuthState>(() => 
    authService.getCurrentAuthState()
  )
  
  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribeToAuthState(setAuthState)
    
    return unsubscribe
  }, [])
  
  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      await authService.login(credentials)
    } catch (error) {
      // Error is already handled by the auth service and reflected in state
      console.error('Login failed:', error)
    }
  }, [])
  
  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }, [])
  
  const changePassword = useCallback(async (request: ChangePasswordRequest) => {
    try {
      await authService.changePassword(request)
    } catch (error) {
      console.error('Change password failed:', error)
      throw error
    }
  }, [])
  
  const refreshUser = useCallback(async () => {
    try {
      await authService.getCurrentUser()
    } catch (error) {
      console.error('Refresh user failed:', error)
      throw error
    }
  }, [])
  
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }))
  }, [])
  
  const hasRole = useCallback((role: UserRole) => {
    return authService.hasRole(role)
  }, [authState.user])
  
  const hasAnyRole = useCallback((roles: UserRole[]) => {
    return authService.hasAnyRole(roles)
  }, [authState.user])
  
  const isAdmin = useCallback(() => {
    return authService.isAdmin()
  }, [authState.user])
  
  const isTokenExpiringSoon = useCallback((thresholdMinutes = 5) => {
    return authService.isTokenExpiringSoon(thresholdMinutes)
  }, [])
  
  return {
    // State
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    
    // Actions
    login,
    logout,
    changePassword,
    refreshUser,
    clearError,
    
    // Utilities
    hasRole,
    hasAnyRole,
    isAdmin,
    isTokenExpiringSoon,
  }
}

export default useAuth