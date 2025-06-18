import { useState, useCallback, useEffect } from 'react'
import { apiClient } from '@/services/api'
import type { PaginatedResponse } from '@/types'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseApiOptions {
  immediate?: boolean
  showErrorToast?: boolean
  retries?: number
  retryDelay?: number
  timeout?: number
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T>
  reset: () => void
  clearError: () => void
  isLoading: boolean
}

// Generic API hook for any API operation
export const useApi = <T = unknown>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
): UseApiReturn<T> => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })
  
  const updateState = useCallback((updates: Partial<UseApiState<T>>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])
  
  const execute = useCallback(async (...args: any[]): Promise<T> => {
    updateState({ loading: true, error: null })
    
    try {
      const result = await apiFunction(...args)
      updateState({ data: result, loading: false })
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      updateState({ error: errorMessage, loading: false })
      throw error
    }
  }, [apiFunction, updateState])
  
  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])
  
  const clearError = useCallback(() => {
    updateState({ error: null })
  }, [updateState])
  
  return {
    ...state,
    execute,
    reset,
    clearError,
    isLoading: state.loading,
  }
}

// Hook for paginated API calls
interface UsePaginatedApiState<T> {
  items: T[]
  loading: boolean
  error: string | null
  pagination: {
    total: number
    page: number
    size: number
    pages: number
  }
}

interface UsePaginatedApiReturn<T> extends UsePaginatedApiState<T> {
  fetchPage: (page: number) => Promise<void>
  fetchNextPage: () => Promise<void>
  fetchPrevPage: () => Promise<void>
  setPageSize: (size: number) => void
  refresh: () => Promise<void>
  reset: () => void
  clearError: () => void
  hasNextPage: boolean
  hasPrevPage: boolean
  isLoading: boolean
}

export const usePaginatedApi = <T = unknown>(
  apiFunction: (params: any) => Promise<PaginatedResponse<T>>,
  initialParams: any = {},
  options: UseApiOptions = {}
): UsePaginatedApiReturn<T> => {
  const [state, setState] = useState<UsePaginatedApiState<T>>({
    items: [],
    loading: false,
    error: null,
    pagination: {
      total: 0,
      page: 1,
      size: 10,
      pages: 0,
    },
  })
  
  const [params, setParams] = useState(initialParams)
  
  const updateState = useCallback((updates: Partial<UsePaginatedApiState<T>>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])
  
  const fetchData = useCallback(async (fetchParams: any = {}) => {
    updateState({ loading: true, error: null })
    
    try {
      const finalParams = { ...params, ...fetchParams }
      const response = await apiFunction(finalParams)
      
      updateState({
        items: response.items,
        loading: false,
        pagination: {
          total: response.total,
          page: response.page,
          size: response.size,
          pages: response.pages,
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      updateState({ error: errorMessage, loading: false })
    }
  }, [apiFunction, params, updateState])
  
  const fetchPage = useCallback(async (page: number) => {
    const skip = (page - 1) * state.pagination.size
    await fetchData({ skip, limit: state.pagination.size })
  }, [fetchData, state.pagination.size])
  
  const fetchNextPage = useCallback(async () => {
    if (state.pagination.page < state.pagination.pages) {
      await fetchPage(state.pagination.page + 1)
    }
  }, [fetchPage, state.pagination])
  
  const fetchPrevPage = useCallback(async () => {
    if (state.pagination.page > 1) {
      await fetchPage(state.pagination.page - 1)
    }
  }, [fetchPage, state.pagination])
  
  const setPageSize = useCallback((size: number) => {
    setParams(prev => ({ ...prev, limit: size }))
  }, [])
  
  const refresh = useCallback(() => {
    return fetchData()
  }, [fetchData])
  
  const reset = useCallback(() => {
    setState({
      items: [],
      loading: false,
      error: null,
      pagination: {
        total: 0,
        page: 1,
        size: 10,
        pages: 0,
      },
    })
    setParams(initialParams)
  }, [initialParams])
  
  const clearError = useCallback(() => {
    updateState({ error: null })
  }, [updateState])
  
  // Initial load
  useEffect(() => {
    if (options.immediate !== false) {
      fetchData()
    }
  }, [params])
  
  return {
    ...state,
    fetchPage,
    fetchNextPage,
    fetchPrevPage,
    setPageSize,
    refresh,
    reset,
    clearError,
    hasNextPage: state.pagination.page < state.pagination.pages,
    hasPrevPage: state.pagination.page > 1,
    isLoading: state.loading,
  }
}

// Hook for API loading states
interface UseApiLoadingReturn {
  isLoading: (key?: string) => boolean
  loadingStates: Record<string, boolean>
}

export const useApiLoading = (): UseApiLoadingReturn => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  
  useEffect(() => {
    const handleLoadingChange = (event: CustomEvent) => {
      const { key, loading, states } = event.detail
      setLoadingStates(states)
    }
    
    window.addEventListener('api:loading', handleLoadingChange as EventListener)
    
    return () => {
      window.removeEventListener('api:loading', handleLoadingChange as EventListener)
    }
  }, [])
  
  const isLoading = useCallback((key?: string) => {
    if (key) {
      return loadingStates[key] || false
    }
    return Object.values(loadingStates).some(loading => loading)
  }, [loadingStates])
  
  return {
    isLoading,
    loadingStates,
  }
}

// Hook for optimistic updates
interface UseOptimisticOptions<T> {
  rollbackOnError?: boolean
  onSuccess?: (result: T) => void
  onError?: (error: Error) => void
}

export const useOptimistic = <T = unknown>(
  initialData: T[],
  options: UseOptimisticOptions<T> = {}
) => {
  const [data, setData] = useState<T[]>(initialData)
  const [pendingActions, setPendingActions] = useState<Map<string, T>>(new Map())
  
  const addOptimistic = useCallback((id: string, item: T) => {
    setData(prev => [...prev, item])
    setPendingActions(prev => new Map(prev).set(id, item))
  }, [])
  
  const updateOptimistic = useCallback((id: string, item: T, predicate: (item: T) => boolean) => {
    setData(prev => prev.map(existing => predicate(existing) ? item : existing))
    setPendingActions(prev => new Map(prev).set(id, item))
  }, [])
  
  const removeOptimistic = useCallback((id: string, predicate: (item: T) => boolean) => {
    const originalItem = data.find(predicate)
    if (originalItem) {
      setData(prev => prev.filter(item => !predicate(item)))
      setPendingActions(prev => new Map(prev).set(id, originalItem))
    }
  }, [data])
  
  const commitOptimistic = useCallback((id: string, result?: T) => {
    setPendingActions(prev => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })
    
    if (result && options.onSuccess) {
      options.onSuccess(result)
    }
  }, [options])
  
  const rollbackOptimistic = useCallback((id: string, error?: Error) => {
    const pendingItem = pendingActions.get(id)
    if (pendingItem && options.rollbackOnError !== false) {
      // Rollback the optimistic update
      setData(prev => {
        // This is a simplified rollback - in practice, you'd need more sophisticated logic
        return prev.filter(item => item !== pendingItem)
      })
    }
    
    setPendingActions(prev => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })
    
    if (error && options.onError) {
      options.onError(error)
    }
  }, [pendingActions, options])
  
  return {
    data,
    setData,
    addOptimistic,
    updateOptimistic,
    removeOptimistic,
    commitOptimistic,
    rollbackOptimistic,
    hasPendingActions: pendingActions.size > 0,
    pendingCount: pendingActions.size,
  }
}

// Hook for debounced API calls
export const useDebouncedApi = <T = unknown>(
  apiFunction: (...args: any[]) => Promise<T>,
  delay: number = 300,
  options: UseApiOptions = {}
) => {
  const { execute, ...apiState } = useApi(apiFunction, options)
  const [debouncedExecute] = useState(() => {
    let timeoutId: NodeJS.Timeout
    
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      return new Promise<T>((resolve, reject) => {
        timeoutId = setTimeout(() => {
          execute(...args).then(resolve).catch(reject)
        }, delay)
      })
    }
  })
  
  return {
    ...apiState,
    execute: debouncedExecute,
  }
}

export default useApi