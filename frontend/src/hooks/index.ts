// Export all custom hooks
export { default as useAuth } from './useAuth'
export { default as useConnections } from './useConnections'
export { default as usePolicies } from './usePolicies'
export { 
  default as useApi,
  usePaginatedApi,
  useApiLoading,
  useOptimistic,
  useDebouncedApi
} from './useApi'

// Export React Query hooks
export * from './useQueryConnections'
export * from './useQueryPolicies'
export * from './useQueryAuth'

// Re-export types for convenience  
export type { 
  UseApiReturn, 
  UsePaginatedApiReturn, 
  UseApiOptions, 
  UseApiLoadingReturn 
} from './useApi'