import { useQuery, useMutation, useQueryClient } from 'react-query'
import { authService } from '@/services/auth'
import type { 
  User, 
  LoginRequest, 
  ChangePasswordRequest,
  UserRole
} from '@/types'

// Query keys factory
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
}

// Current user query
export const useUserQuery = () => {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () => authService.getCurrentUser(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false
      }
      return failureCount < 2
    },
  })
}

// Login mutation
export const useLoginMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (loginResponse) => {
      // Set user data in cache
      queryClient.setQueryData(authKeys.user(), loginResponse.user)
      
      // Invalidate and refetch all queries to get fresh data with new auth
      queryClient.invalidateQueries()
    },
    onError: (error) => {
      // Clear any cached user data on login failure
      queryClient.removeQueries(authKeys.user())
      console.error('Login failed:', error)
    },
  })
}

// Logout mutation
export const useLogoutMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      // Clear all cached data on logout
      queryClient.clear()
    },
    onError: (error) => {
      // Even if logout fails on server, clear local data
      queryClient.clear()
      console.error('Logout failed:', error)
    },
    onSettled: () => {
      // Always clear cache, regardless of success/failure
      queryClient.clear()
    },
  })
}

// Change password mutation
export const useChangePasswordMutation = () => {
  return useMutation({
    mutationFn: (request: ChangePasswordRequest) => authService.changePassword(request),
    onError: (error) => {
      console.error('Change password failed:', error)
    },
  })
}

// Update user profile mutation
export const useUpdateUserProfileMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (updates: Partial<User>) => authService.updateUserProfile(updates),
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(authKeys.user())
      
      // Snapshot previous value
      const previousUser = queryClient.getQueryData<User>(authKeys.user())
      
      // Optimistically update
      if (previousUser) {
        queryClient.setQueryData<User>(authKeys.user(), {
          ...previousUser,
          ...updates,
          updated_at: new Date().toISOString(),
        })
      }
      
      return { previousUser }
    },
    onSuccess: (updatedUser) => {
      // Update cache with server response
      queryClient.setQueryData(authKeys.user(), updatedUser)
    },
    onError: (error, updates, context) => {
      // Rollback optimistic update
      if (context?.previousUser) {
        queryClient.setQueryData(authKeys.user(), context.previousUser)
      }
      console.error('Update profile failed:', error)
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries(authKeys.user())
    },
  })
}

// Refresh user data mutation
export const useRefreshUserMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => authService.getCurrentUser(),
    onSuccess: (user) => {
      // Update cache with fresh user data
      queryClient.setQueryData(authKeys.user(), user)
    },
    onError: (error) => {
      console.error('Refresh user failed:', error)
    },
  })
}

// Token refresh - this should be handled automatically by the auth service
// but we can provide a manual trigger if needed
export const useRefreshTokenMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => authService.refreshToken(),
    onSuccess: () => {
      // Invalidate user query to refetch with new token
      queryClient.invalidateQueries(authKeys.user())
    },
    onError: (error) => {
      // Clear user data on token refresh failure
      queryClient.removeQueries(authKeys.user())
      console.error('Token refresh failed:', error)
    },
  })
}

// Request password reset mutation
export const useRequestPasswordResetMutation = () => {
  return useMutation({
    mutationFn: (email: string) => authService.requestPasswordReset(email),
    onError: (error) => {
      console.error('Password reset request failed:', error)
    },
  })
}

// Reset password mutation
export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) => 
      authService.resetPassword(token, newPassword),
    onError: (error) => {
      console.error('Password reset failed:', error)
    },
  })
}

// Custom hooks for auth state management with React Query integration
export const useAuthState = () => {
  const { data: user, isLoading, error } = useUserQuery()
  const isAuthenticated = authService.isAuthenticated()
  
  return {
    user: user || null,
    isAuthenticated,
    isLoading: isAuthenticated && isLoading, // Only show loading if we expect to be authenticated
    error: error ? (error as Error).message : null,
  }
}

// Role-based access control hooks
export const useHasRole = (role: UserRole) => {
  const { user } = useAuthState()
  return user?.role === role
}

export const useHasAnyRole = (roles: UserRole[]) => {
  const { user } = useAuthState()
  return user ? roles.includes(user.role) : false
}

export const useIsAdmin = () => {
  const { user } = useAuthState()
  const adminRoles: UserRole[] = ['PROXY_ADMIN', 'ORG_ADMIN', 'TEAM_ADMIN']
  return user ? adminRoles.includes(user.role) : false
}

// Token expiry management
export const useTokenExpiry = (thresholdMinutes = 5) => {
  const isExpiringSoon = authService.isTokenExpiringSoon(thresholdMinutes)
  const refreshTokenMutation = useRefreshTokenMutation()
  
  const refreshIfNeeded = () => {
    if (isExpiringSoon && !refreshTokenMutation.isLoading) {
      refreshTokenMutation.mutate()
    }
  }
  
  return {
    isExpiringSoon,
    refreshIfNeeded,
    isRefreshing: refreshTokenMutation.isLoading,
  }
}