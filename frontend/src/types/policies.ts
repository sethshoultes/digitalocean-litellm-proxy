// Base policy schema matching backend
export interface PolicyBase {
  policy_name: string
  description?: string
  resource_type: string
  permissions: Record<string, unknown>
  conditions?: Record<string, unknown>
  priority: number
  models: string[]
  max_budget?: number
  tpm_limit?: number
  rpm_limit?: number
  budget_duration?: string
}

// Policy creation schema
export interface PolicyCreate extends PolicyBase {
  policy_metadata?: Record<string, unknown>
}

// Policy update schema
export interface PolicyUpdate {
  policy_name?: string
  description?: string
  resource_type?: string
  permissions?: Record<string, unknown>
  conditions?: Record<string, unknown>
  priority?: number
  policy_metadata?: Record<string, unknown>
  is_active?: boolean
}

// Full policy response schema
export interface Policy extends PolicyBase {
  policy_id: string
  policy_metadata: Record<string, unknown>
  is_system_policy: boolean
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// User policy assignment schema
export interface UserPolicyAssignment {
  user_id: string
  expires_at?: string
  conditions?: Record<string, unknown>
  assignment_metadata?: Record<string, unknown>
}

// User policy assignment response schema
export interface UserPolicyResponse {
  user_id: string
  policy_id: string
  policy: Policy
  granted_by: string
  granted_at: string
  expires_at?: string
  is_active: boolean
  conditions: Record<string, unknown>
  assignment_metadata: Record<string, unknown>
}

// Request/Response types for API
export interface CreatePolicyRequest extends PolicyCreate {}
export interface UpdatePolicyRequest extends PolicyUpdate {}
export interface PolicyResponse extends Policy {}

// Legacy interfaces for backward compatibility
export interface PolicyRule {
  action: string
  resource: string
  conditions?: Record<string, unknown>
}

export interface AccessPolicy extends Policy {}
export interface PolicyAssignment extends UserPolicyResponse {}

export interface PolicyListParams {
  skip?: number
  limit?: number
  resource_type?: string
  is_active?: boolean
  search?: string
  created_by?: string
  sort_by?: 'created_at' | 'updated_at' | 'policy_name' | 'priority'
  sort_order?: 'asc' | 'desc'
}

export interface PolicyBulkOperation {
  policy_ids: string[]
  operation: 'delete' | 'activate' | 'deactivate' | 'assign' | 'unassign'
  user_ids?: string[] // For assign/unassign operations
}

export interface PolicyBulkResult {
  success: boolean
  results: Array<{
    policy_id: string
    success: boolean
    error?: string
  }>
}

export interface PolicyUsageStats {
  policy_id: string
  period_start: string
  period_end: string
  assignments_count: number
  active_assignments: number
  expired_assignments: number
  total_usage: number
  users_affected: number
}

export interface PolicyTemplate {
  template_id: string
  template_name: string
  description: string
  resource_type: string
  permissions: Record<string, unknown>
  conditions?: Record<string, unknown>
  priority: number
  is_system_template: boolean
  created_at: string
  updated_at: string
}

export interface PolicyValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

export interface PolicyImpactAnalysis {
  policy_id: string
  affected_users: number
  affected_connections: number
  potential_conflicts: string[]
  resource_impact: {
    estimated_cost: number
    estimated_usage: number
  }
}