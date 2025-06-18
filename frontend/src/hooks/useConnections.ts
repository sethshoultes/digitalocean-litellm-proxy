import { useState, useCallback, useEffect } from 'react'
import { connectionsService } from '@/services/connections'
import type {
  Connection,
  ConnectionSummary,
  CreateConnectionRequest,
  UpdateConnectionRequest,
  ConnectionListParams,
  ConnectionTestResult,
  ConnectionHealthStatus,
  ConnectionActivity,
  ConnectionUsageStats,
  ConnectionBulkResult,
  PaginatedResponse,
  ProviderType,
  ConnectionStatus
} from '@/types'

interface UseConnectionsState {
  connections: Connection[]
  loading: boolean
  error: string | null
  pagination: {
    total: number
    page: number
    size: number
    pages: number
  }
}

interface UseConnectionsReturn extends UseConnectionsState {
  // CRUD operations
  createConnection: (data: CreateConnectionRequest, options?: { testConnection?: boolean }) => Promise<Connection>
  updateConnection: (id: string, data: UpdateConnectionRequest, options?: { testConnection?: boolean }) => Promise<Connection>
  deleteConnection: (id: string, options?: { force?: boolean }) => Promise<void>
  deleteConnections: (ids: string[]) => Promise<ConnectionBulkResult>
  
  // Data fetching
  fetchConnections: (params?: ConnectionListParams) => Promise<void>
  fetchConnection: (id: string) => Promise<Connection>
  refreshConnections: () => Promise<void>
  
  // Connection operations
  testConnection: (id: string) => Promise<ConnectionTestResult>
  testConnections: (ids: string[]) => Promise<ConnectionBulkResult>
  toggleConnection: (id: string, isActive: boolean) => Promise<Connection>
  duplicateConnection: (id: string, newName: string) => Promise<Connection>
  
  // Health and monitoring
  getConnectionHealth: (id: string) => Promise<ConnectionHealthStatus>
  refreshConnectionHealth: (id: string) => Promise<ConnectionHealthStatus>
  getConnectionActivity: (id: string, params?: any) => Promise<PaginatedResponse<ConnectionActivity>>
  getConnectionUsage: (id: string, params?: any) => Promise<ConnectionUsageStats>
  
  // Utility methods
  getConnectionsByProvider: (provider: ProviderType) => Connection[]
  getConnectionsByStatus: (status: ConnectionStatus) => Connection[]
  searchConnections: (query: string) => Connection[]
  clearError: () => void
  
  // State management
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setFilters: (filters: Partial<ConnectionListParams>) => void
}

const initialState: UseConnectionsState = {
  connections: [],
  loading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    size: 10,
    pages: 0,
  },
}

export const useConnections = (initialParams?: ConnectionListParams): UseConnectionsReturn => {
  const [state, setState] = useState<UseConnectionsState>(initialState)
  const [params, setParams] = useState<ConnectionListParams>(initialParams || {})
  
  const updateState = useCallback((updates: Partial<UseConnectionsState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])
  
  const handleError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    updateState({ error: errorMessage, loading: false })
  }, [updateState])
  
  const fetchConnections = useCallback(async (fetchParams?: ConnectionListParams) => {
    updateState({ loading: true, error: null })
    
    try {
      const finalParams = { ...params, ...fetchParams }
      const response = await connectionsService.getConnections(finalParams)
      
      updateState({
        connections: response.items,
        loading: false,
        pagination: {
          total: response.total,
          page: response.page,
          size: response.size,
          pages: response.pages,
        },
      })
    } catch (error) {
      handleError(error)
    }
  }, [params, updateState, handleError])
  
  const fetchConnection = useCallback(async (id: string): Promise<Connection> => {
    try {
      return await connectionsService.getConnection(id)
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  const refreshConnections = useCallback(() => {
    return fetchConnections(params)
  }, [fetchConnections, params])
  
  const createConnection = useCallback(async (
    data: CreateConnectionRequest, 
    options?: { testConnection?: boolean }
  ): Promise<Connection> => {
    updateState({ loading: true, error: null })
    
    try {
      const connection = await connectionsService.createConnection(data, options)
      await refreshConnections()
      return connection
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshConnections, handleError, updateState])
  
  const updateConnection = useCallback(async (
    id: string, 
    data: UpdateConnectionRequest,
    options?: { testConnection?: boolean }
  ): Promise<Connection> => {
    updateState({ loading: true, error: null })
    
    try {
      const connection = await connectionsService.updateConnection(id, data, options)
      await refreshConnections()
      return connection
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshConnections, handleError, updateState])
  
  const deleteConnection = useCallback(async (
    id: string, 
    options?: { force?: boolean }
  ): Promise<void> => {
    updateState({ loading: true, error: null })
    
    try {
      await connectionsService.deleteConnection(id, options)
      await refreshConnections()
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshConnections, handleError, updateState])
  
  const deleteConnections = useCallback(async (ids: string[]): Promise<ConnectionBulkResult> => {
    updateState({ loading: true, error: null })
    
    try {
      const result = await connectionsService.deleteConnections(ids)
      await refreshConnections()
      return result
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshConnections, handleError, updateState])
  
  const testConnection = useCallback(async (id: string): Promise<ConnectionTestResult> => {
    try {
      return await connectionsService.testConnection(id)
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  const testConnections = useCallback(async (ids: string[]): Promise<ConnectionBulkResult> => {
    try {
      return await connectionsService.bulkTestConnections(ids)
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  const toggleConnection = useCallback(async (id: string, isActive: boolean): Promise<Connection> => {
    try {
      const connection = await connectionsService.toggleConnection(id, isActive)
      await refreshConnections()
      return connection
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshConnections, handleError])
  
  const duplicateConnection = useCallback(async (id: string, newName: string): Promise<Connection> => {
    updateState({ loading: true, error: null })
    
    try {
      const connection = await connectionsService.duplicateConnection(id, newName)
      await refreshConnections()
      return connection
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshConnections, handleError, updateState])
  
  const getConnectionHealth = useCallback(async (id: string): Promise<ConnectionHealthStatus> => {
    try {
      return await connectionsService.getConnectionHealth(id)
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  const refreshConnectionHealth = useCallback(async (id: string): Promise<ConnectionHealthStatus> => {
    try {
      return await connectionsService.refreshConnectionHealth(id)
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  const getConnectionActivity = useCallback(async (
    id: string, 
    activityParams?: any
  ): Promise<PaginatedResponse<ConnectionActivity>> => {
    try {
      return await connectionsService.getConnectionActivity(id, activityParams)
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  const getConnectionUsage = useCallback(async (
    id: string, 
    usageParams?: any
  ): Promise<ConnectionUsageStats> => {
    try {
      return await connectionsService.getConnectionUsageStats(id, usageParams)
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  // Utility methods
  const getConnectionsByProvider = useCallback((provider: ProviderType): Connection[] => {
    return state.connections.filter(conn => conn.provider === provider)
  }, [state.connections])
  
  const getConnectionsByStatus = useCallback((status: ConnectionStatus): Connection[] => {
    return state.connections.filter(conn => conn.status === status)
  }, [state.connections])
  
  const searchConnections = useCallback((query: string): Connection[] => {
    const lowerQuery = query.toLowerCase()
    return state.connections.filter(conn =>
      conn.connection_name.toLowerCase().includes(lowerQuery) ||
      conn.provider.toLowerCase().includes(lowerQuery)
    )
  }, [state.connections])
  
  const clearError = useCallback(() => {
    updateState({ error: null })
  }, [updateState])
  
  const setPage = useCallback((page: number) => {
    setParams(prev => ({ ...prev, skip: (page - 1) * (prev.limit || 10) }))
  }, [])
  
  const setPageSize = useCallback((size: number) => {
    setParams(prev => ({ ...prev, limit: size, skip: 0 }))
  }, [])
  
  const setFilters = useCallback((filters: Partial<ConnectionListParams>) => {
    setParams(prev => ({ ...prev, ...filters, skip: 0 }))
  }, [])
  
  // Initial load
  useEffect(() => {
    fetchConnections()
  }, [params])
  
  // Auto-refresh on params change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchConnections()
    }, 100) // Debounce
    
    return () => clearTimeout(timeoutId)
  }, [params])
  
  return {
    ...state,
    
    // CRUD operations
    createConnection,
    updateConnection,
    deleteConnection,
    deleteConnections,
    
    // Data fetching
    fetchConnections,
    fetchConnection,
    refreshConnections,
    
    // Connection operations
    testConnection,
    testConnections,
    toggleConnection,
    duplicateConnection,
    
    // Health and monitoring
    getConnectionHealth,
    refreshConnectionHealth,
    getConnectionActivity,
    getConnectionUsage,
    
    // Utility methods
    getConnectionsByProvider,
    getConnectionsByStatus,
    searchConnections,
    clearError,
    
    // State management
    setPage,
    setPageSize,
    setFilters,
  }
}

export default useConnections