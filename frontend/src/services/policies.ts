import { apiClient } from './api'
import type { 
  Policy,
  PolicyResponse,
  CreatePolicyRequest, 
  UpdatePolicyRequest, 
  PolicyListParams,
  UserPolicyAssignment,
  UserPolicyResponse,
  PolicyBulkOperation,
  PolicyBulkResult,
  PolicyUsageStats,
  PolicyTemplate,
  PolicyValidationResult,
  PolicyImpactAnalysis,
  AccessPolicy, // Legacy support
  PaginatedResponse 
} from '@/types'

interface PoliciesServiceConfig {
  enableCache?: boolean
  cacheTimeout?: number
  enableValidation?: boolean
}

interface PolicyFilters {
  resourceType?: string
  isActive?: boolean
  isSystemPolicy?: boolean
  createdBy?: string
  search?: string
  priority?: { min?: number; max?: number }
  dateRange?: {
    start: string
    end: string
  }
}

export class PoliciesService {
  private config: PoliciesServiceConfig
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map()

  constructor(config: PoliciesServiceConfig = {}) {
    this.config = {
      enableCache: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      enableValidation: true,
      ...config,
    }
  }

  // Core CRUD operations
  async getPolicies(params?: PolicyListParams): Promise<PaginatedResponse<Policy>> {
    const cacheKey = `policies:${JSON.stringify(params || {})}`
    
    if (this.config.enableCache) {
      const cached = this.getCachedData<PaginatedResponse<Policy>>(cacheKey)
      if (cached) return cached
    }

    const result = await apiClient.getPaginated<Policy>('/policies/', params)
    
    if (this.config.enableCache) {
      this.setCachedData(cacheKey, result)
    }

    return result
  }

  async getPolicy(policyId: string, options?: { includeAssignments?: boolean; includeUsage?: boolean }): Promise<Policy> {
    const params = {
      ...options?.includeAssignments && { include_assignments: true },
      ...options?.includeUsage && { include_usage: true },
    }
    
    return apiClient.get<Policy>(`/policies/${policyId}`, Object.keys(params).length > 0 ? params : undefined)
  }

  async getPoliciesByIds(policyIds: string[]): Promise<Policy[]> {
    const params = { policy_ids: policyIds.join(',') }
    return apiClient.get<Policy[]>('/policies/batch', params)
  }

  async createPolicy(data: CreatePolicyRequest, options?: { validateOnly?: boolean }): Promise<Policy> {
    if (this.config.enableValidation || options?.validateOnly) {
      const validation = await this.validatePolicy(data)
      if (!validation.valid && !options?.validateOnly) {
        throw new Error(`Policy validation failed: ${validation.errors.join(', ')}`)
      }
      if (options?.validateOnly) {
        return validation as unknown as Policy
      }
    }
    
    const result = await apiClient.post<Policy>('/policies/', data)
    this.invalidateCache()
    return result
  }

  async createPolicyFromTemplate(templateId: string, data: Partial<CreatePolicyRequest>): Promise<Policy> {
    const requestData = {
      template_id: templateId,
      ...data,
    }
    
    const result = await apiClient.post<Policy>('/policies/from-template', requestData)
    this.invalidateCache()
    return result
  }

  async duplicatePolicy(policyId: string, newName: string): Promise<Policy> {
    const result = await apiClient.post<Policy>(`/policies/${policyId}/duplicate`, {
      policy_name: newName,
    })
    this.invalidateCache()
    return result
  }

  async updatePolicy(policyId: string, data: UpdatePolicyRequest, options?: { validateOnly?: boolean }): Promise<Policy> {
    if (this.config.enableValidation || options?.validateOnly) {
      const validation = await this.validatePolicyUpdate(policyId, data)
      if (!validation.valid && !options?.validateOnly) {
        throw new Error(`Policy validation failed: ${validation.errors.join(', ')}`)
      }
      if (options?.validateOnly) {
        return validation as unknown as Policy
      }
    }
    
    const result = await apiClient.put<Policy>(`/policies/${policyId}`, data)
    this.invalidateCache()
    return result
  }

  async patchPolicy(policyId: string, data: Partial<UpdatePolicyRequest>): Promise<Policy> {
    const result = await apiClient.patch<Policy>(`/policies/${policyId}`, data)
    this.invalidateCache()
    return result
  }

  async deletePolicy(policyId: string, options?: { force?: boolean; transferAssignments?: string }): Promise<void> {
    const params = {
      ...options?.force && { force: true },
      ...options?.transferAssignments && { transfer_to: options.transferAssignments },
    }
    
    await apiClient.delete(`/policies/${policyId}`, {
      ...Object.keys(params).length > 0 && { params }
    })
    this.invalidateCache()
  }

  async deletePolicies(policyIds: string[]): Promise<PolicyBulkResult> {
    const result = await apiClient.post<PolicyBulkResult>('/policies/bulk', {
      policy_ids: policyIds,
      operation: 'delete',
    })
    this.invalidateCache()
    return result
  }

  async togglePolicy(policyId: string, isActive: boolean): Promise<Policy> {
    const result = await apiClient.patch<Policy>(`/policies/${policyId}`, { is_active: isActive })
    this.invalidateCache()
    return result
  }

  async activatePolicy(policyId: string): Promise<Policy> {
    return this.togglePolicy(policyId, true)
  }

  async deactivatePolicy(policyId: string): Promise<Policy> {
    return this.togglePolicy(policyId, false)
  }

  async bulkTogglePolicies(policyIds: string[], operation: 'activate' | 'deactivate'): Promise<PolicyBulkResult> {
    return apiClient.post<PolicyBulkResult>('/policies/bulk', {
      policy_ids: policyIds,
      operation,
    })
  }

  // Policy assignment operations
  async assignPolicyToUser(policyId: string, assignment: UserPolicyAssignment): Promise<UserPolicyResponse> {
    const result = await apiClient.post<UserPolicyResponse>(`/policies/${policyId}/assignments`, assignment)
    this.invalidateCache()
    return result
  }

  async assignPolicyToUsers(policyId: string, assignments: UserPolicyAssignment[]): Promise<UserPolicyResponse[]> {
    const result = await apiClient.post<UserPolicyResponse[]>(`/policies/${policyId}/assignments/bulk`, {
      assignments,
    })
    this.invalidateCache()
    return result
  }

  async unassignPolicyFromUser(policyId: string, userId: string): Promise<void> {
    await apiClient.delete(`/policies/${policyId}/assignments/${userId}`)
    this.invalidateCache()
  }

  async updatePolicyAssignment(policyId: string, userId: string, assignment: Partial<UserPolicyAssignment>): Promise<UserPolicyResponse> {
    const result = await apiClient.patch<UserPolicyResponse>(`/policies/${policyId}/assignments/${userId}`, assignment)
    this.invalidateCache()
    return result
  }

  async getPolicyAssignments(policyId: string, params?: {
    skip?: number;
    limit?: number;
    userId?: string;
    isActive?: boolean;
  }): Promise<PaginatedResponse<UserPolicyResponse>> {
    return apiClient.getPaginated<UserPolicyResponse>(`/policies/${policyId}/assignments`, params)
  }

  async getUserPolicies(userId: string, params?: {
    skip?: number;
    limit?: number;
    isActive?: boolean;
    resourceType?: string;
  }): Promise<PaginatedResponse<UserPolicyResponse>> {
    return apiClient.getPaginated<UserPolicyResponse>(`/users/${userId}/policies`, params)
  }

  // Policy validation and analysis
  async validatePolicy(policy: CreatePolicyRequest): Promise<PolicyValidationResult> {
    return apiClient.post<PolicyValidationResult>('/policies/validate', policy)
  }

  async validatePolicyUpdate(policyId: string, update: UpdatePolicyRequest): Promise<PolicyValidationResult> {
    return apiClient.post<PolicyValidationResult>(`/policies/${policyId}/validate`, update)
  }

  async analyzePolicyImpact(policyId: string): Promise<PolicyImpactAnalysis> {
    return apiClient.get<PolicyImpactAnalysis>(`/policies/${policyId}/impact`)
  }

  async checkPolicyConflicts(policyId: string, otherPolicies?: string[]): Promise<{
    conflicts: Array<{
      policy_id: string;
      policy_name: string;
      conflict_type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  }> {
    const params = otherPolicies ? { policy_ids: otherPolicies.join(',') } : undefined
    return apiClient.get(`/policies/${policyId}/conflicts`, params)
  }

  // Policy templates
  async getPolicyTemplates(params?: {
    skip?: number;
    limit?: number;
    resourceType?: string;
    search?: string;
  }): Promise<PaginatedResponse<PolicyTemplate>> {
    return apiClient.getPaginated<PolicyTemplate>('/policies/templates', params)
  }

  async getPolicyTemplate(templateId: string): Promise<PolicyTemplate> {
    return apiClient.get<PolicyTemplate>(`/policies/templates/${templateId}`)
  }

  // Usage and statistics
  async getPolicyUsageStats(policyId: string, params?: {
    period?: 'day' | 'week' | 'month' | 'year';
    startDate?: string;
    endDate?: string;
  }): Promise<PolicyUsageStats> {
    return apiClient.get<PolicyUsageStats>(`/policies/${policyId}/usage`, params)
  }

  async getPoliciesOverview(): Promise<{
    total: number;
    active: number;
    inactive: number;
    systemPolicies: number;
    userPolicies: number;
    byResourceType: Record<string, number>;
    byPriority: Record<string, number>;
    assignmentsSummary: {
      totalAssignments: number;
      activeAssignments: number;
      expiredAssignments: number;
    };
  }> {
    return apiClient.get('/policies/overview')
  }

  // Utility and filtering methods
  async getActivePolicies(params?: PolicyFilters): Promise<Policy[]> {
    const response = await this.getPolicies({ ...params, is_active: true })
    return response.items
  }

  async searchPolicies(query: string, params?: PolicyFilters): Promise<Policy[]> {
    const response = await this.getPolicies({ ...params, search: query })
    return response.items
  }

  async getPoliciesByResourceType(resourceType: string, params?: PolicyListParams): Promise<PaginatedResponse<Policy>> {
    return this.getPolicies({ ...params, resource_type: resourceType })
  }

  async getPoliciesByUser(userId: string, params?: PolicyListParams): Promise<PaginatedResponse<Policy>> {
    return this.getPolicies({ ...params, created_by: userId })
  }

  async getSystemPolicies(params?: PolicyListParams): Promise<PaginatedResponse<Policy>> {
    const response = await apiClient.getPaginated<Policy>('/policies/system', params)
    return response
  }

  async getUserDefinedPolicies(params?: PolicyListParams): Promise<PaginatedResponse<Policy>> {
    const response = await apiClient.getPaginated<Policy>('/policies/user-defined', params)
    return response
  }

  // Export and import methods
  async exportPolicies(policyIds?: string[], format: 'json' | 'yaml' | 'csv' = 'json'): Promise<Blob> {
    const params = {
      format,
      ...policyIds && { policy_ids: policyIds.join(',') },
    }
    
    const response = await apiClient.raw.get('/policies/export', {
      params,
      responseType: 'blob',
    })
    
    return response.data
  }

  async importPolicies(file: File, options?: {
    overwrite?: boolean;
    validateOnly?: boolean;
    dryRun?: boolean;
  }): Promise<{
    success: boolean;
    results: Array<{
      policy_name: string;
      success: boolean;
      error?: string;
      warnings?: string[];
    }>;
  }> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (options?.overwrite) {
      formData.append('overwrite', 'true')
    }
    
    if (options?.validateOnly) {
      formData.append('validate_only', 'true')
    }
    
    if (options?.dryRun) {
      formData.append('dry_run', 'true')
    }
    
    const result = await apiClient.raw.post('/policies/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    this.invalidateCache()
    return result.data
  }

  // Cache management methods
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    const isExpired = Date.now() - cached.timestamp > this.config.cacheTimeout!
    if (isExpired) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data as T
  }

  private setCachedData(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  private invalidateCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  // Configuration methods
  updateConfig(config: Partial<PoliciesServiceConfig>): void {
    this.config = { ...this.config, ...config }
  }

  clearCache(): void {
    this.cache.clear()
  }

  // Legacy support methods (for backward compatibility)
  async getAccessPolicies(params?: PolicyListParams): Promise<PaginatedResponse<AccessPolicy>> {
    return this.getPolicies(params) as Promise<PaginatedResponse<AccessPolicy>>
  }

  async getAccessPolicy(policyId: string): Promise<AccessPolicy> {
    return this.getPolicy(policyId) as Promise<AccessPolicy>
  }
}

// Create singleton instance
export const policiesService = new PoliciesService()

// Export for dependency injection or testing
export default policiesService