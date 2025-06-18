import React, { Component, ErrorInfo, ReactNode } from 'react'
import { toast } from 'react-hot-toast'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showToast?: boolean
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number | boolean | null | undefined>
}

interface ErrorFallbackProps {
  error: Error
  resetError: () => void
  errorInfo?: ErrorInfo
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError, 
  errorInfo 
}) => (
  <div className="min-h-[400px] flex items-center justify-center bg-red-50 rounded-lg p-8">
    <div className="text-center max-w-md">
      <div className="mb-4">
        <svg 
          className="mx-auto h-12 w-12 text-red-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5C3.546 16.333 4.508 18 6.048 18z" 
          />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-red-800 mb-2">
        Something went wrong
      </h3>
      
      <p className="text-sm text-red-600 mb-4">
        {error.message || 'An unexpected error occurred'}
      </p>
      
      {import.meta.env.DEV && errorInfo && (
        <details className="text-left mb-4">
          <summary className="cursor-pointer text-sm text-red-700 hover:text-red-800">
            Technical Details
          </summary>
          <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-32">
            {error.stack}
          </pre>
        </details>
      )}
      
      <button
        onClick={resetError}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        Try Again
      </button>
    </div>
  </div>
)

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    
    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    
    // Show toast notification
    if (this.props.showToast !== false) {
      toast.error(`Application Error: ${error.message}`)
    }
    
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.group('🚨 Error Boundary Caught an Error')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.groupEnd()
    }
    
    // In production, you might want to log to an error reporting service
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { extra: errorInfo })
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props
    const { hasError } = this.state
    
    // Reset error state if resetKeys changed
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys && resetKeys.some((key, idx) => key !== prevProps.resetKeys?.[idx])) {
        this.resetError()
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback } = this.props

    if (hasError && error) {
      // Render custom fallback or default error UI
      if (fallback) {
        return fallback
      }
      
      return (
        <DefaultErrorFallback 
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetError}
        />
      )
    }

    return children
  }
}

// HOC for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for imperative error boundary reset
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)
  
  const resetError = React.useCallback(() => {
    setError(null)
  }, [])
  
  const handleError = React.useCallback((error: Error) => {
    setError(error)
  }, [])
  
  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])
  
  return { handleError, resetError }
}

// Async error boundary for handling async errors
export const AsyncErrorBoundary: React.FC<ErrorBoundaryProps> = (props) => {
  const { handleError } = useErrorHandler()
  
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleError(new Error(event.reason))
    }
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [handleError])
  
  return <ErrorBoundary {...props} />
}

export default ErrorBoundary