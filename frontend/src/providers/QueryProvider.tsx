import React, { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import { toast } from 'react-hot-toast'

// Global error handler for React Query
const handleQueryError = (error: unknown) => {
  console.error('Query error:', error)
  
  // Don't show toast for auth errors - these are handled by the auth context
  if (error instanceof Error) {
    const message = error.message
    if (message.includes('authentication') || message.includes('unauthorized')) {
      return
    }
  }
  
  // Show generic error toast for other errors
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
  toast.error(errorMessage)
}

// Create a stable query client instance
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Global query defaults
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            return false
          }
          
          // Retry up to 2 times for other errors
          return failureCount < 2
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        staleTime: 1 * 60 * 1000, // 1 minute default stale time
        cacheTime: 5 * 60 * 1000, // 5 minutes default cache time
        refetchOnWindowFocus: false, // Disable refetch on window focus by default
        refetchOnReconnect: true, // Refetch when reconnecting to internet
        refetchOnMount: true, // Refetch when component mounts
        
        // Global error handler
        onError: handleQueryError,
      },
      mutations: {
        // Global mutation defaults
        retry: (failureCount, error: any) => {
          // Don't retry mutations on 4xx errors
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            return false
          }
          
          // Only retry once for mutations
          return failureCount < 1
        },
        retryDelay: 1000, // 1 second delay for mutation retries
        
        // Global error handler for mutations
        onError: handleQueryError,
      },
    },
  })
}

interface QueryProviderProps {
  children: ReactNode
  client?: QueryClient
}

let queryClientInstance: QueryClient | null = null

export const QueryProvider: React.FC<QueryProviderProps> = ({ 
  children, 
  client 
}) => {
  // Create a stable client instance
  if (!queryClientInstance) {
    queryClientInstance = client || createQueryClient()
  }
  
  return (
    <QueryClientProvider client={queryClientInstance}>
      {children}
      {/* Show React Query devtools in development */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
        />
      )}
    </QueryClientProvider>
  )
}

// Hook to get the query client instance
export const useQueryClient = () => {
  const client = queryClientInstance
  if (!client) {
    throw new Error('useQueryClient must be used within a QueryProvider')
  }
  return client
}

// Helper to create a fresh query client (useful for testing)
export const createFreshQueryClient = () => createQueryClient()

// Helper to reset the global query client (useful for logout)
export const resetQueryClient = () => {
  if (queryClientInstance) {
    queryClientInstance.clear()
    queryClientInstance.invalidateQueries()
  }
}

export default QueryProvider