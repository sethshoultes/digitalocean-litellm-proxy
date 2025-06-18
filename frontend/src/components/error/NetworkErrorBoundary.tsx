import React, { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { NetworkError, ValidationError, AuthenticationError, AuthorizationError, ServerError } from '@/services/api'

interface NetworkErrorBoundaryProps {
  children: ReactNode
  onNetworkError?: (error: NetworkError) => void
  onValidationError?: (error: ValidationError) => void
  onAuthError?: (error: AuthenticationError | AuthorizationError) => void
  onServerError?: (error: ServerError) => void
}

interface NetworkErrorFallbackProps {
  error: Error
  resetError: () => void
}

const NetworkErrorFallback: React.FC<NetworkErrorFallbackProps> = ({ error, resetError }) => {
  const getErrorContent = () => {
    if (error instanceof NetworkError) {
      return {
        title: 'Connection Problem',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        icon: (
          <svg className="h-12 w-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        actions: (
          <div className="space-x-3">
            <button
              onClick={resetError}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Retry Connection
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Refresh Page
            </button>
          </div>
        )
      }
    }
    
    if (error instanceof ValidationError) {
      return {
        title: 'Validation Error',
        message: error.message || 'The data provided is invalid. Please check your input and try again.',
        icon: (
          <svg className="h-12 w-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        actions: (
          <button
            onClick={resetError}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Try Again
          </button>
        )
      }
    }
    
    if (error instanceof AuthenticationError) {
      return {
        title: 'Authentication Required',
        message: 'You need to log in to access this feature.',
        icon: (
          <svg className="h-12 w-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ),
        actions: (
          <div className="space-x-3">
            <button
              onClick={() => window.location.href = '/login'}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Login
            </button>
            <button
              onClick={resetError}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          </div>
        )
      }
    }
    
    if (error instanceof AuthorizationError) {
      return {
        title: 'Access Denied',
        message: 'You do not have permission to access this resource.',
        icon: (
          <svg className="h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
        ),
        actions: (
          <div className="space-x-3">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Go Back
            </button>
            <button
              onClick={resetError}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Try Again
            </button>
          </div>
        )
      }
    }
    
    if (error instanceof ServerError) {
      return {
        title: 'Server Error',
        message: `Server error (${error.statusCode}). Our team has been notified and is working on a fix.`,
        icon: (
          <svg className="h-12 w-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        ),
        actions: (
          <div className="space-x-3">
            <button
              onClick={resetError}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Refresh Page
            </button>
          </div>
        )
      }
    }
    
    // Default error content
    return {
      title: 'Unexpected Error',
      message: error.message || 'An unexpected error occurred. Please try again.',
      icon: (
        <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      actions: (
        <button
          onClick={resetError}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Try Again
        </button>
      )
    }
  }
  
  const { title, message, icon, actions } = getErrorContent()
  
  return (
    <div className="min-h-[400px] flex items-center justify-center bg-gray-50 rounded-lg p-8">
      <div className="text-center max-w-md">
        <div className="mb-4">
          {icon}
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          {message}
        </p>
        
        {import.meta.env.DEV && (
          <details className="text-left mb-4">
            <summary className="cursor-pointer text-sm text-gray-700 hover:text-gray-800">
              Technical Details
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
              {error.stack}
            </pre>
          </details>
        )}
        
        {actions}
      </div>
    </div>
  )
}

export const NetworkErrorBoundary: React.FC<NetworkErrorBoundaryProps> = ({
  children,
  onNetworkError,
  onValidationError,
  onAuthError,
  onServerError,
}) => {
  const handleError = (error: Error) => {
    if (error instanceof NetworkError && onNetworkError) {
      onNetworkError(error)
    } else if (error instanceof ValidationError && onValidationError) {
      onValidationError(error)
    } else if ((error instanceof AuthenticationError || error instanceof AuthorizationError) && onAuthError) {
      onAuthError(error)
    } else if (error instanceof ServerError && onServerError) {
      onServerError(error)
    }
  }

  const renderFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => {
    if (error instanceof NetworkError ||
        error instanceof ValidationError ||
        error instanceof AuthenticationError ||
        error instanceof AuthorizationError ||
        error instanceof ServerError) {
      return <NetworkErrorFallback error={error} resetError={resetError} />
    }
    
    // Return null to use default error boundary fallback
    return null
  }
  
  return (
    <ErrorBoundary
      fallback={renderFallback}
      onError={handleError}
      showToast={false} // We'll handle toasts in the fallback component
    >
      {children}
    </ErrorBoundary>
  )
}

export default NetworkErrorBoundary