import { useAuth } from '@/contexts/AuthContext'

export type UserRole = 'admin' | 'user' | 'viewer'

export interface RolePermissions {
  canViewUsers: boolean
  canManageUsers: boolean
  canViewSystemHealth: boolean
  canViewAllConnections: boolean
  canManageConnections: boolean
  canViewPolicies: boolean
  canManagePolicies: boolean
  canViewAnalytics: boolean
  canManageSystem: boolean
  canViewLogs: boolean
  canExportData: boolean
}

const rolePermissions: Record<UserRole, RolePermissions> = {
  admin: {
    canViewUsers: true,
    canManageUsers: true,
    canViewSystemHealth: true,
    canViewAllConnections: true,
    canManageConnections: true,
    canViewPolicies: true,
    canManagePolicies: true,
    canViewAnalytics: true,
    canManageSystem: true,
    canViewLogs: true,
    canExportData: true,
  },
  user: {
    canViewUsers: false,
    canManageUsers: false,
    canViewSystemHealth: false,
    canViewAllConnections: false,
    canManageConnections: true,
    canViewPolicies: true,
    canManagePolicies: false,
    canViewAnalytics: false,
    canManageSystem: false,
    canViewLogs: false,
    canExportData: false,
  },
  viewer: {
    canViewUsers: false,
    canManageUsers: false,
    canViewSystemHealth: false,
    canViewAllConnections: false,
    canManageConnections: false,
    canViewPolicies: true,
    canManagePolicies: false,
    canViewAnalytics: false,
    canManageSystem: false,
    canViewLogs: false,
    canExportData: false,
  },
}

export function useRoleAccess() {
  const { user } = useAuth()
  const userRole = (user?.role as UserRole) || 'viewer'
  
  const permissions = rolePermissions[userRole]
  
  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return permissions[permission]
  }
  
  const canAccess = (requiredPermissions: Array<keyof RolePermissions>): boolean => {
    return requiredPermissions.every(permission => permissions[permission])
  }
  
  const isAdmin = userRole === 'admin'
  const isUser = userRole === 'user'
  const isViewer = userRole === 'viewer'
  
  return {
    userRole,
    permissions,
    hasPermission,
    canAccess,
    isAdmin,
    isUser,
    isViewer,
  }
}

// Role-based component wrapper
interface RoleGuardProps {
  children: React.ReactNode
  requiredPermissions?: Array<keyof RolePermissions>
  role?: UserRole | UserRole[]
  fallback?: React.ReactNode
}

export function RoleGuard({ 
  children, 
  requiredPermissions = [], 
  role,
  fallback = null 
}: RoleGuardProps) {
  const { userRole, canAccess } = useRoleAccess()
  
  // Check role-based access
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role]
    if (!allowedRoles.includes(userRole)) {
      return fallback
    }
  }
  
  // Check permission-based access
  if (requiredPermissions.length > 0 && !canAccess(requiredPermissions)) {
    return fallback
  }
  
  return children
}

// Convenience hooks for specific permissions
export function useCanManageUsers() {
  const { hasPermission } = useRoleAccess()
  return hasPermission('canManageUsers')
}

export function useCanViewAnalytics() {
  const { hasPermission } = useRoleAccess()
  return hasPermission('canViewAnalytics')
}

export function useCanManageSystem() {
  const { hasPermission } = useRoleAccess()
  return hasPermission('canManageSystem')
}

export function useCanViewSystemHealth() {
  const { hasPermission } = useRoleAccess()
  return hasPermission('canViewSystemHealth')
}