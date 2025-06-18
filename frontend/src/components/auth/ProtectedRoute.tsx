import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ExclamationTriangleIcon, ShieldExclamationIcon, ClockIcon } from '@heroicons/react/24/outline'

import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'user'
  fallbackPath?: string
  showExpiredWarning?: boolean
}

export function ProtectedRoute({ 
  children, 
  requiredRole = 'user',
  fallbackPath = '/dashboard',
  showExpiredWarning = true 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasRole, isTokenExpiring, refreshToken } = useAuth()
  const location = useLocation()
  const [showExpirationWarning, setShowExpirationWarning] = useState(false)

  // Check for token expiration and show warning
  useEffect(() => {
    if (isAuthenticated && showExpiredWarning && isTokenExpiring()) {
      setShowExpirationWarning(true)
      
      // Auto-dismiss warning after 10 seconds
      const timer = setTimeout(() => {
        setShowExpirationWarning(false)
      }, 10000)
      
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, showExpiredWarning, isTokenExpiring])

  // Handle token refresh
  const handleRefreshToken = async () => {
    try {
      await refreshToken()
      setShowExpirationWarning(false)
    } catch (error) {
      console.error('Failed to refresh token:', error)
    }
  }

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based access
  if (!hasRole(requiredRole)) {
    const isAdminRequired = requiredRole === 'admin'
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white shadow-xl rounded-xl p-8 text-center border border-gray-100">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <ShieldExclamationIcon className="h-8 w-8 text-red-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Access Restricted
          </h3>
          
          <p className="text-sm text-gray-600 mb-6">
            {isAdminRequired 
              ? 'This page requires administrator privileges. Please contact your system administrator if you need access.'
              : 'You don\'t have permission to access this resource.'
            }
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 mr-2" />
              <div className="text-left">
                <p className="text-sm font-medium text-amber-800">
                  Current Role: <span className="capitalize">{user?.role}</span>
                </p>
                <p className="text-sm text-amber-700">
                  Required Role: <span className="capitalize">{requiredRole}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Go Back
            </button>
            
            <Navigate to={fallbackPath} replace />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {children}
      
      {/* Token Expiration Warning */}
      {showExpirationWarning && (
        <div className="fixed top-4 right-4 max-w-sm bg-amber-50 border border-amber-200 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-start">
            <ClockIcon className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">
                Session Expiring Soon
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Your session will expire in less than 5 minutes.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleRefreshToken}
                  className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded-md font-medium transition-colors"
                >
                  Extend Session
                </button>
                <button
                  onClick={() => setShowExpirationWarning(false)}
                  className="text-xs text-amber-600 hover:text-amber-800 px-2 py-1 font-medium transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}