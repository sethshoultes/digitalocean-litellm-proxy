// User role enumeration matching backend
export type UserRole = 
  | 'PROXY_ADMIN'
  | 'ORG_ADMIN' 
  | 'INTERNAL_USER'
  | 'CUSTOMER'
  | 'TEAM_ADMIN'

export interface User {
  user_id: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
  first_name?: string
  last_name?: string
  organization_id?: string
  team_id?: string
  last_login?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface RefreshTokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface UpdateUserProfileRequest {
  first_name?: string
  last_name?: string
  email?: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  newPassword: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface TokenInfo {
  token: string
  expiresAt: number
  user: {
    id: string
    email: string
    role: UserRole
  }
}