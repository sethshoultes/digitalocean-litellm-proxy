import { apiClient } from './api'
import type { 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenRequest, 
  RefreshTokenResponse, 
  User 
} from '@/types'

export class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Use raw client for login to avoid auth interceptors
    const response = await apiClient.raw.post<LoginResponse>('/auth/login', credentials)
    return response.data
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      // Always clear local storage, even if API call fails
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  }

  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    // Use raw client for refresh to avoid auth interceptors
    const response = await apiClient.raw.post<RefreshTokenResponse>('/auth/refresh', request)
    return response.data
  }

  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>('/auth/me')
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  }

  // Utility methods
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token')
    if (!token) return false

    try {
      // Basic token validation - you might want to decode and check expiry
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp > currentTime
    } catch {
      return false
    }
  }

  getToken(): string | null {
    return localStorage.getItem('access_token')
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token')
  }

  clearTokens(): void {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }
}

export const authService = new AuthService()