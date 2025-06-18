import { apiClient, AuthenticationError } from './api'
import type { 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenRequest, 
  RefreshTokenResponse, 
  User,
  ChangePasswordRequest,
  UserRole
} from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface TokenInfo {
  token: string
  expiresAt: number
  user: {
    id: string
    email: string
    role: UserRole
  }
}

export class AuthService {
  private readonly TOKEN_KEY = 'access_token'
  private readonly REFRESH_TOKEN_KEY = 'refresh_token'
  private readonly USER_KEY = 'user_info'
  private authStateListeners: Array<(state: AuthState) => void> = []
  private currentAuthState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  }

  constructor() {
    this.initializeAuthState()
    this.setupStorageListener()
  }

  private initializeAuthState(): void {
    try {
      const token = this.getToken()
      const user = this.getStoredUser()
      
      if (token && user && this.isTokenValid(token)) {
        this.updateAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      } else {
        this.clearAuthData()
      }
    } catch (error) {
      console.error('Failed to initialize auth state:', error)
      this.clearAuthData()
    }
  }

  private setupStorageListener(): void {
    // Listen for storage changes (e.g., logout in another tab)
    window.addEventListener('storage', (event) => {
      if (event.key === this.TOKEN_KEY && !event.newValue) {
        this.handleLogout()
      }
    })

    // Listen for auth failure events
    window.addEventListener('auth:failure', () => {
      this.handleAuthFailure()
    })
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    this.updateAuthState({ ...this.currentAuthState, isLoading: true, error: null })

    try {
      // Use raw client for login to avoid auth interceptors
      const response = await apiClient.raw.post<LoginResponse>('/auth/login', credentials)
      const loginData = response.data

      // Store tokens and user info
      this.storeTokens(loginData.access_token, loginData.refresh_token)
      this.storeUser(loginData.user)

      this.updateAuthState({
        user: loginData.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      return loginData
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      this.updateAuthState({
        ...this.currentAuthState,
        isLoading: false,
        error: errorMessage,
      })
      throw error
    }
  }

  async logout(): Promise<void> {
    this.updateAuthState({ ...this.currentAuthState, isLoading: true })

    try {
      // Attempt to notify server of logout
      await apiClient.post('/auth/logout', {}, { showErrorToast: false, timeout: 5000 })
    } catch (error) {
      // Ignore logout errors - we'll clear local data anyway
      console.warn('Logout API call failed:', error)
    } finally {
      this.handleLogout()
    }
  }

  private handleLogout(): void {
    this.clearAuthData()
    this.updateAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  }

  private handleAuthFailure(): void {
    this.clearAuthData()
    this.updateAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: 'Authentication failed. Please log in again.',
    })
  }

  async refreshToken(request?: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const refreshToken = request?.refresh_token || this.getRefreshToken()
    
    if (!refreshToken) {
      throw new AuthenticationError('No refresh token available')
    }

    try {
      // Use raw client for refresh to avoid auth interceptors
      const response = await apiClient.raw.post<RefreshTokenResponse>('/auth/refresh', {
        refresh_token: refreshToken,
      })
      
      const tokenData = response.data
      
      // Update stored tokens
      this.storeTokens(tokenData.access_token, tokenData.refresh_token)
      
      return tokenData
    } catch (error) {
      // Refresh failed - clear auth data
      this.clearAuthData()
      throw new AuthenticationError('Token refresh failed')
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const user = await apiClient.get<User>('/auth/me')
      
      // Update stored user info
      this.storeUser(user)
      this.updateAuthState({ ...this.currentAuthState, user })
      
      return user
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.handleAuthFailure()
      }
      throw error
    }
  }

  async updateUserProfile(updates: Partial<User>): Promise<User> {
    try {
      const updatedUser = await apiClient.patch<User>('/auth/profile', updates)
      
      this.storeUser(updatedUser)
      this.updateAuthState({ ...this.currentAuthState, user: updatedUser })
      
      return updatedUser
    } catch (error) {
      throw error
    }
  }

  async changePassword(request: ChangePasswordRequest): Promise<void> {
    try {
      await apiClient.post('/auth/change-password', {
        current_password: request.currentPassword,
        new_password: request.newPassword,
      })
    } catch (error) {
      throw error
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/password-reset/request', { email }, { showErrorToast: false })
    } catch (error) {
      // Don't expose whether email exists or not
      console.warn('Password reset request failed:', error)
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/auth/password-reset/confirm', {
        token,
        new_password: newPassword,
      })
    } catch (error) {
      throw error
    }
  }

  // Token and user management
  private storeTokens(accessToken: string, refreshToken?: string): void {
    localStorage.setItem(this.TOKEN_KEY, accessToken)
    if (refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken)
    }
  }

  private storeUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user))
  }

  private getStoredUser(): User | null {
    try {
      const userData = localStorage.getItem(this.USER_KEY)
      return userData ? JSON.parse(userData) : null
    } catch {
      return null
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
  }

  private isTokenValid(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp > currentTime
    } catch {
      return false
    }
  }

  private updateAuthState(newState: AuthState): void {
    this.currentAuthState = { ...newState }
    this.authStateListeners.forEach(listener => listener(this.currentAuthState))
  }

  // Public utility methods
  isAuthenticated(): boolean {
    return this.currentAuthState.isAuthenticated
  }

  getCurrentAuthState(): AuthState {
    return { ...this.currentAuthState }
  }

  subscribeToAuthState(listener: (state: AuthState) => void): () => void {
    this.authStateListeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(listener)
      if (index > -1) {
        this.authStateListeners.splice(index, 1)
      }
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY)
  }

  getTokenInfo(): TokenInfo | null {
    const token = this.getToken()
    if (!token) return null

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return {
        token,
        expiresAt: payload.exp * 1000, // Convert to milliseconds
        user: {
          id: payload.sub || payload.user_id,
          email: payload.email,
          role: payload.role,
        },
      }
    } catch {
      return null
    }
  }

  getUser(): User | null {
    return this.currentAuthState.user
  }

  hasRole(role: UserRole): boolean {
    const user = this.getUser()
    return user?.role === role
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const user = this.getUser()
    return user ? roles.includes(user.role) : false
  }

  isAdmin(): boolean {
    return this.hasAnyRole(['PROXY_ADMIN', 'ORG_ADMIN', 'TEAM_ADMIN'] as UserRole[])
  }

  // Token expiry management
  isTokenExpiringSoon(thresholdMinutes = 5): boolean {
    const tokenInfo = this.getTokenInfo()
    if (!tokenInfo) return true

    const thresholdMs = thresholdMinutes * 60 * 1000
    const expiryTime = tokenInfo.expiresAt
    const currentTime = Date.now()

    return (expiryTime - currentTime) < thresholdMs
  }

  async ensureValidToken(): Promise<string> {
    const token = this.getToken()
    
    if (!token) {
      throw new AuthenticationError('No token available')
    }

    if (this.isTokenExpiringSoon()) {
      try {
        await this.refreshToken()
        return this.getToken()!
      } catch (error) {
        throw new AuthenticationError('Failed to refresh token')
      }
    }

    return token
  }

  // Cleanup method
  destroy(): void {
    this.authStateListeners = []
    window.removeEventListener('storage', this.setupStorageListener)
    window.removeEventListener('auth:failure', this.handleAuthFailure)
  }
}

// Create singleton instance
export const authService = new AuthService()

// Export for dependency injection or testing
export default authService