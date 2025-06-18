export interface PolicyRule {
  action: string
  resource: string
  conditions?: Record<string, unknown>
}

export interface AccessPolicy {
  policy_id: string
  policy_name: string
  description?: string
  rules: PolicyRule[]
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreatePolicyRequest {
  policy_name: string
  description?: string
  rules: PolicyRule[]
}

export interface UpdatePolicyRequest {
  policy_name?: string
  description?: string
  rules?: PolicyRule[]
  is_active?: boolean
}

export interface PolicyListParams {
  skip?: number
  limit?: number
  search?: string
  is_active?: boolean
}