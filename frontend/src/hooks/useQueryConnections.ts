import { useQuery, useMutation, useQueryClient } from 'react-query'
import { connectionsService } from '@/services/connections'
import type {
  Connection,
  CreateConnectionRequest,
  UpdateConnectionRequest,
  ConnectionListParams,
  ConnectionTestResult,
  ConnectionHealthStatus,
  ConnectionBulkResult,
  PaginatedResponse
} from '@/types'

// Query keys factory
export const connectionKeys = {
  all: ['connections'] as const,
  lists: () => [...connectionKeys.all, 'list'] as const,
  list: (params: ConnectionListParams) => [...connectionKeys.lists(), params] as const,
  details: () => [...connectionKeys.all, 'detail'] as const,
  detail: (id: string) => [...connectionKeys.details(), id] as const,
  health: (id: string) => [...connectionKeys.all, 'health', id] as const,
  activity: (id: string) => [...connectionKeys.all, 'activity', id] as const,
  usage: (id: string) => [...connectionKeys.all, 'usage', id] as const,
}

// Connection list query
export const useConnectionsQuery = (params?: ConnectionListParams) => {
  return useQuery({
    queryKey: connectionKeys.list(params || {}),
    queryFn: () => connectionsService.getConnections(params),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Single connection query
export const useConnectionQuery = (id: string, options?: { includeCredentials?: boolean }) => {
  return useQuery({
    queryKey: connectionKeys.detail(id),
    queryFn: () => connectionsService.getConnection(id, options),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  })
}

// Connection health query
export const useConnectionHealthQuery = (id: string) => {
  return useQuery({
    queryKey: connectionKeys.health(id),
    queryFn: () => connectionsService.getConnectionHealth(id),
    enabled: !!id,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    staleTime: 15 * 1000, // Consider stale after 15 seconds
  })
}

// Connection activity query
export const useConnectionActivityQuery = (id: string, params?: any) => {
  return useQuery({
    queryKey: connectionKeys.activity(id),
    queryFn: () => connectionsService.getConnectionActivity(id, params),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// Connection usage query
export const useConnectionUsageQuery = (id: string, params?: any) => {
  return useQuery({
    queryKey: connectionKeys.usage(id),
    queryFn: () => connectionsService.getConnectionUsageStats(id, params),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create connection mutation
export const useCreateConnectionMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ data, options }: { 
      data: CreateConnectionRequest; 
      options?: { testConnection?: boolean } 
    }) => connectionsService.createConnection(data, options),
    onSuccess: (newConnection) => {
      // Invalidate and refetch connections list
      queryClient.invalidateQueries(connectionKeys.lists())
      
      // Optimistically add to cache
      queryClient.setQueryData(
        connectionKeys.detail(newConnection.connection_id), 
        newConnection
      )
      
      // Update connections list cache
      queryClient.setQueriesData<PaginatedResponse<Connection>>(
        connectionKeys.lists(),
        (oldData) => {
          if (!oldData) return oldData
          
          return {
            ...oldData,
            items: [newConnection, ...oldData.items],
            total: oldData.total + 1,
          }
        }
      )
    },
    onError: (error) => {
      console.error('Failed to create connection:', error)
    },
  })
}

// Update connection mutation
export const useUpdateConnectionMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data, options }: { 
      id: string; 
      data: UpdateConnectionRequest; 
      options?: { testConnection?: boolean }
    }) => connectionsService.updateConnection(id, data, options),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(connectionKeys.detail(id))
      
      // Snapshot previous value
      const previousConnection = queryClient.getQueryData<Connection>(connectionKeys.detail(id))
      
      // Optimistically update
      if (previousConnection) {
        queryClient.setQueryData<Connection>(connectionKeys.detail(id), {
          ...previousConnection,
          ...data,
          updated_at: new Date().toISOString(),
        })
      }
      
      return { previousConnection }
    },
    onSuccess: (updatedConnection, { id }) => {
      // Update the cache with server response
      queryClient.setQueryData(connectionKeys.detail(id), updatedConnection)
      
      // Invalidate lists to refetch with updated data
      queryClient.invalidateQueries(connectionKeys.lists())
    },
    onError: (error, { id }, context) => {
      // Rollback optimistic update
      if (context?.previousConnection) {
        queryClient.setQueryData(connectionKeys.detail(id), context.previousConnection)
      }
      console.error('Failed to update connection:', error)
    },
    onSettled: (data, error, { id }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries(connectionKeys.detail(id))
    },
  })
}

// Delete connection mutation
export const useDeleteConnectionMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, options }: { 
      id: string; 
      options?: { force?: boolean } 
    }) => connectionsService.deleteConnection(id, options),
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(connectionKeys.lists())
      
      // Optimistically remove from lists
      queryClient.setQueriesData<PaginatedResponse<Connection>>(
        connectionKeys.lists(),
        (oldData) => {
          if (!oldData) return oldData
          
          return {
            ...oldData,
            items: oldData.items.filter(conn => conn.connection_id !== id),
            total: Math.max(0, oldData.total - 1),
          }
        }
      )
      
      // Remove from detail cache
      queryClient.removeQueries(connectionKeys.detail(id))
    },
    onSuccess: (data, { id }) => {
      // Invalidate related queries
      queryClient.invalidateQueries(connectionKeys.lists())
      queryClient.removeQueries(connectionKeys.detail(id))
      queryClient.removeQueries(connectionKeys.health(id))
      queryClient.removeQueries(connectionKeys.activity(id))
      queryClient.removeQueries(connectionKeys.usage(id))
    },
    onError: (error, { id }) => {
      // Refetch on error to restore correct state
      queryClient.invalidateQueries(connectionKeys.lists())
      console.error('Failed to delete connection:', error)
    },
  })
}

// Bulk delete connections mutation
export const useBulkDeleteConnectionsMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (ids: string[]) => connectionsService.deleteConnections(ids),
    onMutate: async (ids) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(connectionKeys.lists())
      
      // Optimistically remove from lists
      queryClient.setQueriesData<PaginatedResponse<Connection>>(
        connectionKeys.lists(),
        (oldData) => {
          if (!oldData) return oldData
          
          return {
            ...oldData,
            items: oldData.items.filter(conn => !ids.includes(conn.connection_id)),
            total: Math.max(0, oldData.total - ids.length),
          }
        }
      )
      
      // Remove from detail caches
      ids.forEach(id => {
        queryClient.removeQueries(connectionKeys.detail(id))
      })
    },
    onSuccess: (result, ids) => {
      // Invalidate related queries
      queryClient.invalidateQueries(connectionKeys.lists())
      
      // Clean up individual caches for successful deletions
      result.results.forEach((res, index) => {
        if (res.success) {
          const id = ids[index]
          queryClient.removeQueries(connectionKeys.detail(id))
          queryClient.removeQueries(connectionKeys.health(id))
          queryClient.removeQueries(connectionKeys.activity(id))
          queryClient.removeQueries(connectionKeys.usage(id))
        }
      })
    },
    onError: (error) => {
      // Refetch on error to restore correct state
      queryClient.invalidateQueries(connectionKeys.lists())
      console.error('Failed to bulk delete connections:', error)
    },
  })
}

// Test connection mutation
export const useTestConnectionMutation = () => {
  return useMutation({
    mutationFn: ({ id, options }: { 
      id: string; 
      options?: { testType?: 'basic' | 'full' | 'custom'; customTest?: Record<string, unknown> }
    }) => connectionsService.testConnection(id, options),
    onError: (error) => {
      console.error('Failed to test connection:', error)
    },
  })
}

// Bulk test connections mutation
export const useBulkTestConnectionsMutation = () => {
  return useMutation({
    mutationFn: (ids: string[]) => connectionsService.bulkTestConnections(ids),
    onError: (error) => {
      console.error('Failed to bulk test connections:', error)
    },
  })
}

// Toggle connection mutation
export const useToggleConnectionMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      connectionsService.toggleConnection(id, isActive),
    onMutate: async ({ id, isActive }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(connectionKeys.detail(id))
      
      // Snapshot previous value
      const previousConnection = queryClient.getQueryData<Connection>(connectionKeys.detail(id))
      
      // Optimistically update
      if (previousConnection) {
        queryClient.setQueryData<Connection>(connectionKeys.detail(id), {
          ...previousConnection,
          status: isActive ? 'active' : 'inactive',
          updated_at: new Date().toISOString(),
        })
      }
      
      return { previousConnection }
    },
    onSuccess: (updatedConnection, { id }) => {
      // Update with server response
      queryClient.setQueryData(connectionKeys.detail(id), updatedConnection)
      queryClient.invalidateQueries(connectionKeys.lists())
    },
    onError: (error, { id }, context) => {
      // Rollback optimistic update
      if (context?.previousConnection) {
        queryClient.setQueryData(connectionKeys.detail(id), context.previousConnection)
      }
      console.error('Failed to toggle connection:', error)
    },
  })
}

// Duplicate connection mutation
export const useDuplicateConnectionMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) => 
      connectionsService.duplicateConnection(id, newName),
    onSuccess: (newConnection) => {
      // Add to cache and invalidate lists
      queryClient.setQueryData(
        connectionKeys.detail(newConnection.connection_id), 
        newConnection
      )
      queryClient.invalidateQueries(connectionKeys.lists())
    },
    onError: (error) => {
      console.error('Failed to duplicate connection:', error)
    },
  })
}

// Refresh connection health mutation
export const useRefreshConnectionHealthMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => connectionsService.refreshConnectionHealth(id),
    onSuccess: (healthStatus, id) => {
      // Update health cache
      queryClient.setQueryData(connectionKeys.health(id), healthStatus)
    },
    onError: (error) => {
      console.error('Failed to refresh connection health:', error)
    },
  })
}