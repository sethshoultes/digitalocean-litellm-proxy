import React, { ReactNode } from 'react'
import { QueryErrorResetBoundary } from 'react-query'
import { ErrorBoundary } from './ErrorBoundary'

interface QueryErrorBoundaryProps {
  children: ReactNode
  fallback?: (props: { error: Error; resetError: () => void }) => ReactNode
  onError?: (error: Error) => void
}

const DefaultQueryErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => (
  <div className="min-h-[200px] flex items-center justify-center bg-yellow-50 border border-yellow-200 rounded-lg p-6">
    <div className="text-center max-w-sm">
      <div className="mb-4">
        <svg 
          className="mx-auto h-10 w-10 text-yellow-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </div>
      
      <h3 className="text-base font-medium text-yellow-800 mb-2">
        Failed to Load Data
      </h3>
      
      <p className="text-sm text-yellow-700 mb-4">
        {error.message || 'Unable to fetch the requested data. Please try again.'}
      </p>
      
      <button
        onClick={resetError}
        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Retry
      </button>
    </div>
  </div>
)

/**
 * QueryErrorBoundary combines React Query's error reset functionality
 * with React's error boundary to handle both query errors and component errors
 */
export const QueryErrorBoundary: React.FC<QueryErrorBoundaryProps> = ({
  children,
  fallback,
  onError,
}) => {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onError={onError}
          showToast={false} // Prevent duplicate error toasts
          fallback={
            fallback ? (
              ({ error, resetError }) => fallback({ error, resetError: () => { reset(); resetError(); } })
            ) : (
              ({ error, resetError }) => (
                <DefaultQueryErrorFallback 
                  error={error} 
                  resetError={() => { reset(); resetError(); }} 
                />
              )
            )
          }
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

export default QueryErrorBoundary