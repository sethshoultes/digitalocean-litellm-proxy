export type ConnectionStatus = 'active' | 'inactive' | 'error' | 'testing'

export type ProviderType = 
  | 'openai' 
  | 'anthropic' 
  | 'azure_openai' 
  | 'aws_bedrock' 
  | 'google_ai' 
  | 'cohere' 
  | 'huggingface'

export interface ConnectionConfiguration {
  api_key?: string
  api_base?: string
  api_version?: string
  model?: string
  max_tokens?: number
  temperature?: number
  [key: string]: unknown
}

export interface Connection {
  connection_id: string
  user_id: string
  connection_name: string
  provider: ProviderType
  configuration: ConnectionConfiguration
  status: ConnectionStatus
  last_tested_at?: string
  created_at: string
  updated_at: string
  is_active: boolean
  tags?: string[]
  description?: string
  usage_count?: number
  last_used_at?: string
}

export interface CreateConnectionRequest {
  connection_name: string
  provider: ProviderType
  configuration: ConnectionConfiguration
  description?: string
  tags?: string[]
}

export interface UpdateConnectionRequest {
  connection_name?: string
  configuration?: ConnectionConfiguration
  description?: string
  tags?: string[]
  is_active?: boolean
}

export interface ConnectionListParams {
  skip?: number
  limit?: number
  provider?: ProviderType
  status?: ConnectionStatus
  search?: string
}

export interface ConnectionTestResult {
  success: boolean
  message: string
  response_time_ms?: number
  provider_response?: unknown
  error_details?: string
}