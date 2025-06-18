// Enums matching backend exactly
export type ConnectionStatus = 'active' | 'inactive' | 'error' | 'testing'

export type ProviderType = 
  | 'openai'
  | 'anthropic'
  | 'azure'
  | 'aws'
  | 'google'
  | 'huggingface'
  | 'cohere'
  | 'replicate'
  | 'custom'

export type ConnectionType = 
  | 'api_key'
  | 'oauth'
  | 'service_account'
  | 'custom'

export type ActivityType = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'tested'
  | 'used'
  | 'failed'
  | 'api_call'
  | 'connection_test'

export interface ConnectionConfiguration {
  [key: string]: unknown
}

export interface ConnectionCredentials {
  [key: string]: string
}

export interface ConnectionMetadata {
  [key: string]: unknown
}

// Base connection schema
export interface ConnectionBase {
  connection_name: string
  provider: ProviderType
  configuration: ConnectionConfiguration
  connection_metadata?: ConnectionMetadata
}

// Connection creation schema
export interface ConnectionCreate extends ConnectionBase {
  credentials?: ConnectionCredentials
}

// Connection update schema
export interface ConnectionUpdate {
  connection_name?: string
  configuration?: ConnectionConfiguration
  connection_metadata?: ConnectionMetadata
  status?: ConnectionStatus
}

// Full connection response schema
export interface Connection extends ConnectionBase {
  connection_id: string
  user_id: string
  status: ConnectionStatus
  last_used?: string
  last_health_check?: string
  health_status?: string
  error_count: number
  success_count: number
  avg_response_time_ms?: number
  usage_count: number
  models: string[]
  spend: number
  max_budget?: number
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

// Connection summary schema
export interface ConnectionSummary {
  connection_id: string
  connection_name: string
  provider: ProviderType
  status: ConnectionStatus
  health_status?: string
  last_used?: string
}

// Request/Response types for API
export interface CreateConnectionRequest extends ConnectionCreate {}
export interface UpdateConnectionRequest extends ConnectionUpdate {}
export interface ConnectionResponse extends Connection {}

export interface ConnectionListParams {
  skip?: number
  limit?: number
  provider?: ProviderType
  status?: ConnectionStatus
  search?: string
  user_id?: string
  sort_by?: 'created_at' | 'updated_at' | 'connection_name' | 'last_used'
  sort_order?: 'asc' | 'desc'
}

export interface ConnectionBulkOperation {
  connection_ids: string[]
  operation: 'delete' | 'activate' | 'deactivate' | 'test'
}

export interface ConnectionBulkResult {
  success: boolean
  results: Array<{
    connection_id: string
    success: boolean
    error?: string
  }>
}

export interface ConnectionTestResult {
  success: boolean
  message: string
  response_time_ms?: number
  provider_response?: unknown
  error_details?: string
  tested_at: string
  test_type: 'manual' | 'automated' | 'health_check'
}

export interface ConnectionHealthStatus {
  connection_id: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  last_check: string
  response_time_ms?: number
  error_message?: string
  uptime_percentage?: number
}

export interface ConnectionActivity {
  activity_id: string
  connection_id: string
  activity_type: ActivityType
  timestamp: string
  details?: Record<string, unknown>
  success: boolean
  error_message?: string
  response_time_ms?: number
  user_id?: string
}

export interface ConnectionUsageStats {
  connection_id: string
  period_start: string
  period_end: string
  total_requests: number
  successful_requests: number
  failed_requests: number
  avg_response_time_ms: number
  total_spend: number
  error_rate: number
}

export interface ConnectionQuota {
  connection_id: string
  daily_limit?: number
  monthly_limit?: number
  daily_used: number
  monthly_used: number
  daily_remaining: number
  monthly_remaining: number
  reset_date: string
}