import { useState, useCallback, useEffect } from 'react'
import { policiesService } from '@/services/policies'
import type {
  Policy,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  PolicyListParams,
  UserPolicyAssignment,
  UserPolicyResponse,
  PolicyBulkResult,
  PolicyUsageStats,
  PolicyValidationResult,
  PolicyImpactAnalysis,
  PolicyTemplate,
  PaginatedResponse
} from '@/types'

interface UsePoliciesState {
  policies: Policy[]
  loading: boolean
  error: string | null
  pagination: {
    total: number
    page: number
    size: number
    pages: number
  }
}

interface UsePoliciesReturn extends UsePoliciesState {
  // CRUD operations
  createPolicy: (data: CreatePolicyRequest, options?: { validateOnly?: boolean }) => Promise<Policy>
  updatePolicy: (id: string, data: UpdatePolicyRequest, options?: { validateOnly?: boolean }) => Promise<Policy>
  deletePolicy: (id: string, options?: { force?: boolean; transferAssignments?: string }) => Promise<void>
  deletePolicies: (ids: string[]) => Promise<PolicyBulkResult>
  
  // Data fetching
  fetchPolicies: (params?: PolicyListParams) => Promise<void>
  fetchPolicy: (id: string, options?: { includeAssignments?: boolean; includeUsage?: boolean }) => Promise<Policy>
  refreshPolicies: () => Promise<void>
  
  // Policy operations
  togglePolicy: (id: string, isActive: boolean) => Promise<Policy>
  duplicatePolicy: (id: string, newName: string) => Promise<Policy>
  validatePolicy: (policy: CreatePolicyRequest) => Promise<PolicyValidationResult>
  analyzePolicyImpact: (id: string) => Promise<PolicyImpactAnalysis>
  
  // Assignment operations
  assignPolicyToUser: (policyId: string, assignment: UserPolicyAssignment) => Promise<UserPolicyResponse>
  assignPolicyToUsers: (policyId: string, assignments: UserPolicyAssignment[]) => Promise<UserPolicyResponse[]>
  unassignPolicyFromUser: (policyId: string, userId: string) => Promise<void>
  updatePolicyAssignment: (policyId: string, userId: string, assignment: Partial<UserPolicyAssignment>) => Promise<UserPolicyResponse>
  getPolicyAssignments: (policyId: string, params?: any) => Promise<PaginatedResponse<UserPolicyResponse>>
  getUserPolicies: (userId: string, params?: any) => Promise<PaginatedResponse<UserPolicyResponse>>
  
  // Templates
  getPolicyTemplates: (params?: any) => Promise<PaginatedResponse<PolicyTemplate>>
  createPolicyFromTemplate: (templateId: string, data: Partial<CreatePolicyRequest>) => Promise<Policy>
  
  // Usage and statistics
  getPolicyUsageStats: (id: string, params?: any) => Promise<PolicyUsageStats>
  getPoliciesOverview: () => Promise<any>
  
  // Utility methods
  getActivePolicies: () => Policy[]
  getPoliciesByResourceType: (resourceType: string) => Policy[]
  searchPolicies: (query: string) => Policy[]
  clearError: () => void
  
  // State management
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setFilters: (filters: Partial<PolicyListParams>) => void
}

const initialState: UsePoliciesState = {
  policies: [],
  loading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    size: 10,
    pages: 0,
  },
}

export const usePolicies = (initialParams?: PolicyListParams): UsePoliciesReturn => {
  const [state, setState] = useState<UsePoliciesState>(initialState)
  const [params, setParams] = useState<PolicyListParams>(initialParams || {})
  
  const updateState = useCallback((updates: Partial<UsePoliciesState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])
  
  const handleError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    updateState({ error: errorMessage, loading: false })
  }, [updateState])
  
  const fetchPolicies = useCallback(async (fetchParams?: PolicyListParams) => {
    updateState({ loading: true, error: null })
    
    try {
      const finalParams = { ...params, ...fetchParams }
      const response = await policiesService.getPolicies(finalParams)
      
      updateState({
        policies: response.items,
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
  
  const fetchPolicy = useCallback(async (
    id: string,
    options?: { includeAssignments?: boolean; includeUsage?: boolean }
  ): Promise<Policy> => {
    try {
      return await policiesService.getPolicy(id, options)
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  const refreshPolicies = useCallback(() => {
    return fetchPolicies(params)
  }, [fetchPolicies, params])
  
  const createPolicy = useCallback(async (
    data: CreatePolicyRequest,
    options?: { validateOnly?: boolean }
  ): Promise<Policy> => {
    updateState({ loading: true, error: null })
    
    try {
      const policy = await policiesService.createPolicy(data, options)
      if (!options?.validateOnly) {
        await refreshPolicies()
      }
      return policy
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshPolicies, handleError, updateState])
  
  const updatePolicy = useCallback(async (
    id: string,
    data: UpdatePolicyRequest,
    options?: { validateOnly?: boolean }
  ): Promise<Policy> => {
    updateState({ loading: true, error: null })
    
    try {
      const policy = await policiesService.updatePolicy(id, data, options)
      if (!options?.validateOnly) {
        await refreshPolicies()
      }
      return policy
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshPolicies, handleError, updateState])
  
  const deletePolicy = useCallback(async (
    id: string,
    options?: { force?: boolean; transferAssignments?: string }
  ): Promise<void> => {
    updateState({ loading: true, error: null })
    
    try {
      await policiesService.deletePolicy(id, options)
      await refreshPolicies()
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshPolicies, handleError, updateState])
  
  const deletePolicies = useCallback(async (ids: string[]): Promise<PolicyBulkResult> => {
    updateState({ loading: true, error: null })
    
    try {
      const result = await policiesService.deletePolicies(ids)
      await refreshPolicies()
      return result
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshPolicies, handleError, updateState])
  
  const togglePolicy = useCallback(async (id: string, isActive: boolean): Promise<Policy> => {
    try {
      const policy = await policiesService.togglePolicy(id, isActive)
      await refreshPolicies()
      return policy
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshPolicies, handleError])
  
  const duplicatePolicy = useCallback(async (id: string, newName: string): Promise<Policy> => {
    updateState({ loading: true, error: null })
    
    try {
      const policy = await policiesService.duplicatePolicy(id, newName)
      await refreshPolicies()
      return policy
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshPolicies, handleError, updateState])
  
  const validatePolicy = useCallback(async (policy: CreatePolicyRequest): Promise<PolicyValidationResult> => {
    try {
      return await policiesService.validatePolicy(policy)
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  const analyzePolicyImpact = useCallback(async (id: string): Promise<PolicyImpactAnalysis> => {
    try {
      return await policiesService.analyzePolicyImpact(id)
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  const assignPolicyToUser = useCallback(async (
    policyId: string,
    assignment: UserPolicyAssignment
  ): Promise<UserPolicyResponse> => {
    try {
      const result = await policiesService.assignPolicyToUser(policyId, assignment)
      await refreshPolicies()
      return result
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshPolicies, handleError])
  
  const assignPolicyToUsers = useCallback(async (
    policyId: string,
    assignments: UserPolicyAssignment[]
  ): Promise<UserPolicyResponse[]> => {
    try {
      const result = await policiesService.assignPolicyToUsers(policyId, assignments)
      await refreshPolicies()
      return result
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshPolicies, handleError])
  
  const unassignPolicyFromUser = useCallback(async (policyId: string, userId: string): Promise<void> => {
    try {
      await policiesService.unassignPolicyFromUser(policyId, userId)
      await refreshPolicies()
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshPolicies, handleError])
  
  const updatePolicyAssignment = useCallback(async (
    policyId: string,
    userId: string,
    assignment: Partial<UserPolicyAssignment>
  ): Promise<UserPolicyResponse> => {
    try {
      const result = await policiesService.updatePolicyAssignment(policyId, userId, assignment)
      await refreshPolicies()
      return result
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshPolicies, handleError])
  
  const getPolicyAssignments = useCallback(async (
    policyId: string,
    assignmentParams?: any
  ): Promise<PaginatedResponse<UserPolicyResponse>> => {
    try {
      return await policiesService.getPolicyAssignments(policyId, assignmentParams)
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  const getUserPolicies = useCallback(async (
    userId: string,
    userParams?: any
  ): Promise<PaginatedResponse<UserPolicyResponse>> => {
    try {
      return await policiesService.getUserPolicies(userId, userParams)
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  const getPolicyTemplates = useCallback(async (templateParams?: any): Promise<PaginatedResponse<PolicyTemplate>> => {
    try {
      return await policiesService.getPolicyTemplates(templateParams)
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  const createPolicyFromTemplate = useCallback(async (
    templateId: string,
    data: Partial<CreatePolicyRequest>
  ): Promise<Policy> => {
    updateState({ loading: true, error: null })
    
    try {
      const policy = await policiesService.createPolicyFromTemplate(templateId, data)
      await refreshPolicies()
      return policy
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [refreshPolicies, handleError, updateState])
  
  const getPolicyUsageStats = useCallback(async (
    id: string,
    usageParams?: any
  ): Promise<PolicyUsageStats> => {
    try {
      return await policiesService.getPolicyUsageStats(id, usageParams)
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  const getPoliciesOverview = useCallback(async () => {
    try {
      return await policiesService.getPoliciesOverview()
    } catch (error) {
      handleError(error)
      throw error
    }
  }, [handleError])
  
  // Utility methods
  const getActivePolicies = useCallback((): Policy[] => {
    return state.policies.filter(policy => policy.is_active)
  }, [state.policies])
  
  const getPoliciesByResourceType = useCallback((resourceType: string): Policy[] => {
    return state.policies.filter(policy => policy.resource_type === resourceType)
  }, [state.policies])
  
  const searchPolicies = useCallback((query: string): Policy[] => {
    const lowerQuery = query.toLowerCase()
    return state.policies.filter(policy =>
      policy.policy_name.toLowerCase().includes(lowerQuery) ||
      (policy.description && policy.description.toLowerCase().includes(lowerQuery)) ||
      policy.resource_type.toLowerCase().includes(lowerQuery)
    )
  }, [state.policies])
  
  const clearError = useCallback(() => {
    updateState({ error: null })
  }, [updateState])
  
  const setPage = useCallback((page: number) => {
    setParams(prev => ({ ...prev, skip: (page - 1) * (prev.limit || 10) }))
  }, [])
  
  const setPageSize = useCallback((size: number) => {
    setParams(prev => ({ ...prev, limit: size, skip: 0 }))
  }, [])
  
  const setFilters = useCallback((filters: Partial<PolicyListParams>) => {
    setParams(prev => ({ ...prev, ...filters, skip: 0 }))
  }, [])
  
  // Initial load
  useEffect(() => {
    fetchPolicies()
  }, [params])
  
  // Auto-refresh on params change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPolicies()
    }, 100) // Debounce
    
    return () => clearTimeout(timeoutId)
  }, [params])
  
  return {
    ...state,
    
    // CRUD operations
    createPolicy,
    updatePolicy,
    deletePolicy,
    deletePolicies,
    
    // Data fetching
    fetchPolicies,
    fetchPolicy,
    refreshPolicies,
    
    // Policy operations
    togglePolicy,
    duplicatePolicy,
    validatePolicy,
    analyzePolicyImpact,
    
    // Assignment operations
    assignPolicyToUser,
    assignPolicyToUsers,
    unassignPolicyFromUser,
    updatePolicyAssignment,
    getPolicyAssignments,
    getUserPolicies,
    
    // Templates
    getPolicyTemplates,
    createPolicyFromTemplate,
    
    // Usage and statistics
    getPolicyUsageStats,
    getPoliciesOverview,
    
    // Utility methods
    getActivePolicies,
    getPoliciesByResourceType,
    searchPolicies,
    clearError,
    
    // State management
    setPage,
    setPageSize,
    setFilters,
  }
}

export default usePolicies