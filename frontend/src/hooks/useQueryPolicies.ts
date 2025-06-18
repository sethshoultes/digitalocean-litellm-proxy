import { useQuery, useMutation, useQueryClient } from 'react-query'
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

// Query keys factory
export const policyKeys = {
  all: ['policies'] as const,
  lists: () => [...policyKeys.all, 'list'] as const,
  list: (params: PolicyListParams) => [...policyKeys.lists(), params] as const,
  details: () => [...policyKeys.all, 'detail'] as const,
  detail: (id: string) => [...policyKeys.details(), id] as const,
  assignments: (id: string) => [...policyKeys.all, 'assignments', id] as const,
  userPolicies: (userId: string) => [...policyKeys.all, 'user', userId] as const,
  usage: (id: string) => [...policyKeys.all, 'usage', id] as const,
  templates: () => [...policyKeys.all, 'templates'] as const,
  validation: (policy: CreatePolicyRequest) => [...policyKeys.all, 'validation', policy] as const,
  impact: (id: string) => [...policyKeys.all, 'impact', id] as const,
}

// Policy list query
export const usePoliciesQuery = (params?: PolicyListParams) => {
  return useQuery({
    queryKey: policyKeys.list(params || {}),
    queryFn: () => policiesService.getPolicies(params),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Single policy query
export const usePolicyQuery = (
  id: string, 
  options?: { includeAssignments?: boolean; includeUsage?: boolean }
) => {
  return useQuery({
    queryKey: policyKeys.detail(id),
    queryFn: () => policiesService.getPolicy(id, options),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  })
}

// Policy assignments query
export const usePolicyAssignmentsQuery = (id: string, params?: any) => {
  return useQuery({
    queryKey: policyKeys.assignments(id),
    queryFn: () => policiesService.getPolicyAssignments(id, params),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// User policies query
export const useUserPoliciesQuery = (userId: string, params?: any) => {
  return useQuery({
    queryKey: policyKeys.userPolicies(userId),
    queryFn: () => policiesService.getUserPolicies(userId, params),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Policy usage query
export const usePolicyUsageQuery = (id: string, params?: any) => {
  return useQuery({
    queryKey: policyKeys.usage(id),
    queryFn: () => policiesService.getPolicyUsageStats(id, params),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Policy templates query
export const usePolicyTemplatesQuery = (params?: any) => {
  return useQuery({
    queryKey: policyKeys.templates(),
    queryFn: () => policiesService.getPolicyTemplates(params),
    staleTime: 10 * 60 * 1000, // 10 minutes - templates change infrequently
    cacheTime: 30 * 60 * 1000, // 30 minutes
  })
}

// Policy validation query
export const usePolicyValidationQuery = (policy: CreatePolicyRequest, enabled = false) => {
  return useQuery({
    queryKey: policyKeys.validation(policy),
    queryFn: () => policiesService.validatePolicy(policy),
    enabled,
    staleTime: 0, // Always fresh for validation
    cacheTime: 5 * 60 * 1000,
  })
}

// Policy impact analysis query
export const usePolicyImpactQuery = (id: string, enabled = false) => {
  return useQuery({
    queryKey: policyKeys.impact(id),
    queryFn: () => policiesService.analyzePolicyImpact(id),
    enabled: !!id && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Create policy mutation
export const useCreatePolicyMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ data, options }: { 
      data: CreatePolicyRequest; 
      options?: { validateOnly?: boolean } 
    }) => policiesService.createPolicy(data, options),
    onSuccess: (newPolicy, { options }) => {
      if (!options?.validateOnly) {
        // Invalidate and refetch policies list
        queryClient.invalidateQueries(policyKeys.lists())
        
        // Optimistically add to cache
        queryClient.setQueryData(
          policyKeys.detail(newPolicy.policy_id), 
          newPolicy
        )
        
        // Update policies list cache
        queryClient.setQueriesData<PaginatedResponse<Policy>>(
          policyKeys.lists(),
          (oldData) => {
            if (!oldData) return oldData
            
            return {
              ...oldData,
              items: [newPolicy, ...oldData.items],
              total: oldData.total + 1,
            }
          }
        )
      }
    },
    onError: (error) => {
      console.error('Failed to create policy:', error)
    },
  })
}

// Update policy mutation
export const useUpdatePolicyMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data, options }: { 
      id: string; 
      data: UpdatePolicyRequest; 
      options?: { validateOnly?: boolean }
    }) => policiesService.updatePolicy(id, data, options),
    onMutate: async ({ id, data, options }) => {
      if (options?.validateOnly) return
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries(policyKeys.detail(id))
      
      // Snapshot previous value
      const previousPolicy = queryClient.getQueryData<Policy>(policyKeys.detail(id))
      
      // Optimistically update
      if (previousPolicy) {
        queryClient.setQueryData<Policy>(policyKeys.detail(id), {
          ...previousPolicy,
          ...data,
          updated_at: new Date().toISOString(),
        })
      }
      
      return { previousPolicy }
    },
    onSuccess: (updatedPolicy, { id, options }) => {
      if (!options?.validateOnly) {
        // Update the cache with server response
        queryClient.setQueryData(policyKeys.detail(id), updatedPolicy)
        
        // Invalidate lists to refetch with updated data
        queryClient.invalidateQueries(policyKeys.lists())
        
        // Invalidate assignments if policy was updated
        queryClient.invalidateQueries(policyKeys.assignments(id))
      }
    },
    onError: (error, { id, options }, context) => {
      if (!options?.validateOnly) {
        // Rollback optimistic update
        if (context?.previousPolicy) {
          queryClient.setQueryData(policyKeys.detail(id), context.previousPolicy)
        }
      }
      console.error('Failed to update policy:', error)
    },
    onSettled: (data, error, { id, options }) => {
      if (!options?.validateOnly) {
        // Always refetch after error or success
        queryClient.invalidateQueries(policyKeys.detail(id))
      }
    },
  })
}

// Delete policy mutation
export const useDeletePolicyMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, options }: { 
      id: string; 
      options?: { force?: boolean; transferAssignments?: string }
    }) => policiesService.deletePolicy(id, options),
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(policyKeys.lists())
      
      // Optimistically remove from lists
      queryClient.setQueriesData<PaginatedResponse<Policy>>(
        policyKeys.lists(),
        (oldData) => {
          if (!oldData) return oldData
          
          return {
            ...oldData,
            items: oldData.items.filter(policy => policy.policy_id !== id),
            total: Math.max(0, oldData.total - 1),
          }
        }
      )
      
      // Remove from detail cache
      queryClient.removeQueries(policyKeys.detail(id))
    },
    onSuccess: (data, { id }) => {
      // Invalidate related queries
      queryClient.invalidateQueries(policyKeys.lists())
      queryClient.removeQueries(policyKeys.detail(id))
      queryClient.removeQueries(policyKeys.assignments(id))
      queryClient.removeQueries(policyKeys.usage(id))
      queryClient.removeQueries(policyKeys.impact(id))
    },
    onError: (error, { id }) => {
      // Refetch on error to restore correct state
      queryClient.invalidateQueries(policyKeys.lists())
      console.error('Failed to delete policy:', error)
    },
  })
}

// Bulk delete policies mutation
export const useBulkDeletePoliciesMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (ids: string[]) => policiesService.deletePolicies(ids),
    onMutate: async (ids) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(policyKeys.lists())
      
      // Optimistically remove from lists
      queryClient.setQueriesData<PaginatedResponse<Policy>>(
        policyKeys.lists(),
        (oldData) => {
          if (!oldData) return oldData
          
          return {
            ...oldData,
            items: oldData.items.filter(policy => !ids.includes(policy.policy_id)),
            total: Math.max(0, oldData.total - ids.length),
          }
        }
      )
      
      // Remove from detail caches
      ids.forEach(id => {
        queryClient.removeQueries(policyKeys.detail(id))
      })
    },
    onSuccess: (result, ids) => {
      // Invalidate related queries
      queryClient.invalidateQueries(policyKeys.lists())
      
      // Clean up individual caches for successful deletions
      result.results.forEach((res, index) => {
        if (res.success) {
          const id = ids[index]
          queryClient.removeQueries(policyKeys.detail(id))
          queryClient.removeQueries(policyKeys.assignments(id))
          queryClient.removeQueries(policyKeys.usage(id))
          queryClient.removeQueries(policyKeys.impact(id))
        }
      })
    },
    onError: (error) => {
      // Refetch on error to restore correct state
      queryClient.invalidateQueries(policyKeys.lists())
      console.error('Failed to bulk delete policies:', error)
    },
  })
}

// Toggle policy mutation
export const useTogglePolicyMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      policiesService.togglePolicy(id, isActive),
    onMutate: async ({ id, isActive }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(policyKeys.detail(id))
      
      // Snapshot previous value
      const previousPolicy = queryClient.getQueryData<Policy>(policyKeys.detail(id))
      
      // Optimistically update
      if (previousPolicy) {
        queryClient.setQueryData<Policy>(policyKeys.detail(id), {
          ...previousPolicy,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
      }
      
      return { previousPolicy }
    },
    onSuccess: (updatedPolicy, { id }) => {
      // Update with server response
      queryClient.setQueryData(policyKeys.detail(id), updatedPolicy)
      queryClient.invalidateQueries(policyKeys.lists())
      
      // Invalidate assignments as policy status affects them
      queryClient.invalidateQueries(policyKeys.assignments(id))
    },
    onError: (error, { id }, context) => {
      // Rollback optimistic update
      if (context?.previousPolicy) {
        queryClient.setQueryData(policyKeys.detail(id), context.previousPolicy)
      }
      console.error('Failed to toggle policy:', error)
    },
  })
}

// Duplicate policy mutation
export const useDuplicatePolicyMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) => 
      policiesService.duplicatePolicy(id, newName),
    onSuccess: (newPolicy) => {
      // Add to cache and invalidate lists
      queryClient.setQueryData(
        policyKeys.detail(newPolicy.policy_id), 
        newPolicy
      )
      queryClient.invalidateQueries(policyKeys.lists())
    },
    onError: (error) => {
      console.error('Failed to duplicate policy:', error)
    },
  })
}

// Create policy from template mutation
export const useCreatePolicyFromTemplateMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ templateId, data }: { 
      templateId: string; 
      data: Partial<CreatePolicyRequest> 
    }) => policiesService.createPolicyFromTemplate(templateId, data),
    onSuccess: (newPolicy) => {
      // Add to cache and invalidate lists
      queryClient.setQueryData(
        policyKeys.detail(newPolicy.policy_id), 
        newPolicy
      )
      queryClient.invalidateQueries(policyKeys.lists())
    },
    onError: (error) => {
      console.error('Failed to create policy from template:', error)
    },
  })
}

// Assign policy to user mutation
export const useAssignPolicyToUserMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ policyId, assignment }: { 
      policyId: string; 
      assignment: UserPolicyAssignment 
    }) => policiesService.assignPolicyToUser(policyId, assignment),
    onSuccess: (result, { policyId, assignment }) => {
      // Invalidate assignments and user policies
      queryClient.invalidateQueries(policyKeys.assignments(policyId))
      queryClient.invalidateQueries(policyKeys.userPolicies(assignment.user_id))
      
      // Optionally update assignments cache optimistically
      queryClient.setQueriesData<PaginatedResponse<UserPolicyResponse>>(
        policyKeys.assignments(policyId),
        (oldData) => {
          if (!oldData) return oldData
          
          return {
            ...oldData,
            items: [result, ...oldData.items],
            total: oldData.total + 1,
          }
        }
      )
    },
    onError: (error) => {
      console.error('Failed to assign policy to user:', error)
    },
  })
}

// Assign policy to multiple users mutation
export const useAssignPolicyToUsersMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ policyId, assignments }: { 
      policyId: string; 
      assignments: UserPolicyAssignment[] 
    }) => policiesService.assignPolicyToUsers(policyId, assignments),
    onSuccess: (results, { policyId, assignments }) => {
      // Invalidate assignments for the policy
      queryClient.invalidateQueries(policyKeys.assignments(policyId))
      
      // Invalidate user policies for all affected users
      assignments.forEach(assignment => {
        queryClient.invalidateQueries(policyKeys.userPolicies(assignment.user_id))
      })
    },
    onError: (error) => {
      console.error('Failed to assign policy to users:', error)
    },
  })
}

// Unassign policy from user mutation
export const useUnassignPolicyFromUserMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ policyId, userId }: { policyId: string; userId: string }) => 
      policiesService.unassignPolicyFromUser(policyId, userId),
    onMutate: async ({ policyId, userId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(policyKeys.assignments(policyId))
      
      // Optimistically remove from assignments
      queryClient.setQueriesData<PaginatedResponse<UserPolicyResponse>>(
        policyKeys.assignments(policyId),
        (oldData) => {
          if (!oldData) return oldData
          
          return {
            ...oldData,
            items: oldData.items.filter(assignment => assignment.user_id !== userId),
            total: Math.max(0, oldData.total - 1),
          }
        }
      )
    },
    onSuccess: (data, { policyId, userId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries(policyKeys.assignments(policyId))
      queryClient.invalidateQueries(policyKeys.userPolicies(userId))
    },
    onError: (error, { policyId }) => {
      // Refetch on error to restore correct state
      queryClient.invalidateQueries(policyKeys.assignments(policyId))
      console.error('Failed to unassign policy from user:', error)
    },
  })
}

// Update policy assignment mutation
export const useUpdatePolicyAssignmentMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ policyId, userId, assignment }: { 
      policyId: string; 
      userId: string; 
      assignment: Partial<UserPolicyAssignment> 
    }) => policiesService.updatePolicyAssignment(policyId, userId, assignment),
    onSuccess: (result, { policyId, userId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries(policyKeys.assignments(policyId))
      queryClient.invalidateQueries(policyKeys.userPolicies(userId))
    },
    onError: (error) => {
      console.error('Failed to update policy assignment:', error)
    },
  })
}