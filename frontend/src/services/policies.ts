import { apiClient } from './api'
import type { 
  AccessPolicy, 
  CreatePolicyRequest, 
  UpdatePolicyRequest, 
  PolicyListParams,
  PaginatedResponse 
} from '@/types'

export class PoliciesService {
  async getPolicies(params?: PolicyListParams): Promise<PaginatedResponse<AccessPolicy>> {
    return apiClient.get<PaginatedResponse<AccessPolicy>>('/policies/', params)
  }

  async getPolicy(policyId: string): Promise<AccessPolicy> {
    return apiClient.get<AccessPolicy>(`/policies/${policyId}`)
  }

  async createPolicy(data: CreatePolicyRequest): Promise<AccessPolicy> {
    return apiClient.post<AccessPolicy>('/policies/', data)
  }

  async updatePolicy(policyId: string, data: UpdatePolicyRequest): Promise<AccessPolicy> {
    return apiClient.put<AccessPolicy>(`/policies/${policyId}`, data)
  }

  async deletePolicy(policyId: string): Promise<void> {
    await apiClient.delete(`/policies/${policyId}`)
  }

  async togglePolicy(policyId: string, isActive: boolean): Promise<AccessPolicy> {
    return apiClient.patch<AccessPolicy>(`/policies/${policyId}`, { is_active: isActive })
  }

  // Utility methods
  async getActivePolicies(): Promise<AccessPolicy[]> {
    const response = await this.getPolicies({ is_active: true })
    return response.items
  }

  async searchPolicies(query: string): Promise<AccessPolicy[]> {
    const response = await this.getPolicies({ search: query })
    return response.items
  }
}

export const policiesService = new PoliciesService()