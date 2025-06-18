import { apiClient } from './api'
import type { 
  Connection,
  ConnectionSummary,
  CreateConnectionRequest, 
  UpdateConnectionRequest, 
  ConnectionListParams, 
  ConnectionTestResult,
  ConnectionHealthStatus,
  ConnectionActivity,
  ConnectionUsageStats,
  ConnectionQuota,
  ConnectionBulkOperation,
  ConnectionBulkResult,
  PaginatedResponse 
} from '@/types'

interface ConnectionsServiceConfig {
  enableCache?: boolean
  cacheTimeout?: number
  retryFailedRequests?: boolean
}

interface ConnectionFilters {
  provider?: string
  status?: string
  healthStatus?: string
  search?: string
  userId?: string
  dateRange?: {
    start: string
    end: string
  }
}

export class ConnectionsService {
  private config: ConnectionsServiceConfig
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map()

  constructor(config: ConnectionsServiceConfig = {}) {
    this.config = {
      enableCache: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      retryFailedRequests: true,
      ...config,
    }
  }

  // Core CRUD operations
  async getConnections(params?: ConnectionListParams): Promise<PaginatedResponse<Connection>> {
    const cacheKey = `connections:${JSON.stringify(params || {})}`
    
    if (this.config.enableCache) {
      const cached = this.getCachedData<PaginatedResponse<Connection>>(cacheKey)
      if (cached) return cached
    }

    const result = await apiClient.getPaginated<Connection>('/connections/', params)
    
    if (this.config.enableCache) {
      this.setCachedData(cacheKey, result)
    }

    return result
  }

  async getConnection(connectionId: string, options?: { includeCredentials?: boolean }): Promise<Connection> {
    const params = options?.includeCredentials ? { include_credentials: true } : undefined
    return apiClient.get<Connection>(`/connections/${connectionId}`, params)
  }

  async getConnectionSummary(connectionId: string): Promise<ConnectionSummary> {
    return apiClient.get<ConnectionSummary>(`/connections/${connectionId}/summary`)
  }

  async getConnectionsByIds(connectionIds: string[]): Promise<Connection[]> {
    const params = { connection_ids: connectionIds.join(',') }
    const response = await apiClient.get<Connection[]>('/connections/batch', params)
    return response
  }

  async createConnection(data: CreateConnectionRequest, options?: { testConnection?: boolean }): Promise<Connection> {
    const requestData = {
      ...data,
      test_connection: options?.testConnection || false,
    }
    
    const result = await apiClient.post<Connection>('/connections/', requestData)
    this.invalidateCache()
    return result
  }

  async createConnectionFromTemplate(templateId: string, data: Partial<CreateConnectionRequest>): Promise<Connection> {
    const requestData = {
      template_id: templateId,
      ...data,
    }
    
    const result = await apiClient.post<Connection>('/connections/from-template', requestData)
    this.invalidateCache()
    return result
  }

  async duplicateConnection(connectionId: string, newName: string): Promise<Connection> {
    const result = await apiClient.post<Connection>(`/connections/${connectionId}/duplicate`, {
      connection_name: newName,
    })
    this.invalidateCache()
    return result
  }

  async updateConnection(connectionId: string, data: UpdateConnectionRequest, options?: { testConnection?: boolean }): Promise<Connection> {
    const requestData = {
      ...data,
      test_connection: options?.testConnection || false,
    }
    
    const result = await apiClient.put<Connection>(`/connections/${connectionId}`, requestData)
    this.invalidateCache()
    return result
  }

  async patchConnection(connectionId: string, data: Partial<UpdateConnectionRequest>): Promise<Connection> {
    const result = await apiClient.patch<Connection>(`/connections/${connectionId}`, data)
    this.invalidateCache()
    return result
  }

  async deleteConnection(connectionId: string, options?: { force?: boolean }): Promise<void> {
    const params = options?.force ? { force: true } : undefined
    await apiClient.delete(`/connections/${connectionId}`, { 
      ...params && { params }
    })
    this.invalidateCache()
  }

  async deleteConnections(connectionIds: string[]): Promise<ConnectionBulkResult> {
    const result = await apiClient.post<ConnectionBulkResult>('/connections/bulk', {
      connection_ids: connectionIds,
      operation: 'delete',
    })
    this.invalidateCache()
    return result
  }

  async testConnection(connectionId: string, options?: { testType?: 'basic' | 'full' | 'custom'; customTest?: Record<string, unknown> }): Promise<ConnectionTestResult> {
    const requestData = {
      test_type: options?.testType || 'basic',
      ...options?.customTest && { custom_test: options.customTest },
    }
    
    return apiClient.post<ConnectionTestResult>(`/connections/${connectionId}/test`, requestData)
  }

  async testConnectionConfiguration(data: CreateConnectionRequest): Promise<ConnectionTestResult> {
    return apiClient.post<ConnectionTestResult>('/connections/test-config', data)
  }

  async bulkTestConnections(connectionIds: string[]): Promise<ConnectionBulkResult> {
    return apiClient.post<ConnectionBulkResult>('/connections/bulk', {
      connection_ids: connectionIds,
      operation: 'test',
    })
  }

  async toggleConnection(connectionId: string, isActive: boolean): Promise<Connection> {
    const result = await apiClient.patch<Connection>(`/connections/${connectionId}`, { status: isActive ? 'active' : 'inactive' })
    this.invalidateCache()
    return result
  }

  async activateConnection(connectionId: string): Promise<Connection> {
    return this.toggleConnection(connectionId, true)
  }

  async deactivateConnection(connectionId: string): Promise<Connection> {
    return this.toggleConnection(connectionId, false)
  }

  async bulkToggleConnections(connectionIds: string[], operation: 'activate' | 'deactivate'): Promise<ConnectionBulkResult> {
    return apiClient.post<ConnectionBulkResult>('/connections/bulk', {
      connection_ids: connectionIds,
      operation,
    })
  }

  // Health and monitoring methods
  async getConnectionHealth(connectionId: string): Promise<ConnectionHealthStatus> {
    return apiClient.get<ConnectionHealthStatus>(`/connections/${connectionId}/health`)
  }

  async getConnectionsHealth(connectionIds?: string[]): Promise<ConnectionHealthStatus[]> {
    const params = connectionIds ? { connection_ids: connectionIds.join(',') } : undefined
    return apiClient.get<ConnectionHealthStatus[]>('/connections/health', params)
  }

  async refreshConnectionHealth(connectionId: string): Promise<ConnectionHealthStatus> {
    return apiClient.post<ConnectionHealthStatus>(`/connections/${connectionId}/health/refresh`)
  }

  // Activity and usage methods
  async getConnectionActivity(connectionId: string, params?: { 
    start_date?: string;
    end_date?: string;
    activity_type?: string;
    limit?: number;
  }): Promise<PaginatedResponse<ConnectionActivity>> {
    return apiClient.getPaginated<ConnectionActivity>(`/connections/${connectionId}/activity`, params)
  }

  async getConnectionUsageStats(connectionId: string, params?: {
    period?: 'day' | 'week' | 'month' | 'year';
    start_date?: string;
    end_date?: string;
  }): Promise<ConnectionUsageStats> {
    return apiClient.get<ConnectionUsageStats>(`/connections/${connectionId}/usage`, params)
  }

  async getConnectionQuota(connectionId: string): Promise<ConnectionQuota> {
    return apiClient.get<ConnectionQuota>(`/connections/${connectionId}/quota`)
  }

  async updateConnectionQuota(connectionId: string, quota: Partial<ConnectionQuota>): Promise<ConnectionQuota> {
    return apiClient.patch<ConnectionQuota>(`/connections/${connectionId}/quota`, quota)
  }

  // Utility and filtering methods
  async getActiveConnections(params?: ConnectionFilters): Promise<Connection[]> {
    const response = await this.getConnections({ ...params, status: 'active' })
    return response.items
  }

  async getConnectionsByProvider(provider: string, params?: ConnectionFilters): Promise<Connection[]> {
    const response = await this.getConnections({ ...params, provider })
    return response.items
  }

  async searchConnections(query: string, params?: ConnectionFilters): Promise<Connection[]> {
    const response = await this.getConnections({ ...params, search: query })
    return response.items
  }

  async getConnectionsByUser(userId: string, params?: ConnectionListParams): Promise<PaginatedResponse<Connection>> {
    return this.getConnections({ ...params, user_id: userId })
  }

  async getConnectionsByStatus(status: string, params?: ConnectionListParams): Promise<PaginatedResponse<Connection>> {
    return this.getConnections({ ...params, status: status as any })
  }

  async getConnectionsByHealthStatus(healthStatus: 'healthy' | 'unhealthy' | 'unknown'): Promise<Connection[]> {
    const healthStatuses = await this.getConnectionsHealth()
    const filteredIds = healthStatuses
      .filter(h => h.status === healthStatus)
      .map(h => h.connection_id)
    
    if (filteredIds.length === 0) return []
    
    return this.getConnectionsByIds(filteredIds)
  }

  // Export and import methods
  async exportConnections(connectionIds?: string[], format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const params = {
      format,
      ...connectionIds && { connection_ids: connectionIds.join(',') },
    }
    
    const response = await apiClient.raw.get('/connections/export', { 
      params,
      responseType: 'blob',
    })
    
    return response.data
  }

  async importConnections(file: File, options?: { 
    overwrite?: boolean;
    validateOnly?: boolean;
  }): Promise<{ success: boolean; results: Array<{ connection_name: string; success: boolean; error?: string }> }> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (options?.overwrite) {
      formData.append('overwrite', 'true')
    }
    
    if (options?.validateOnly) {
      formData.append('validate_only', 'true')
    }
    
    const result = await apiClient.raw.post('/connections/import', formData, {
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
  updateConfig(config: Partial<ConnectionsServiceConfig>): void {
    this.config = { ...this.config, ...config }
  }

  clearCache(): void {
    this.cache.clear()
  }

  // Statistics and analytics
  async getConnectionsOverview(): Promise<{
    total: number;
    active: number;
    inactive: number;
    error: number;
    by_provider: Record<string, number>;
    by_status: Record<string, number>;
    health_summary: {
      healthy: number;
      unhealthy: number;
      unknown: number;
    };
  }> {
    return apiClient.get('/connections/overview')
  }

  async getConnectionsAnalytics(params?: {
    period?: 'day' | 'week' | 'month' | 'year';
    start_date?: string;
    end_date?: string;
  }): Promise<{
    usage_trends: Array<{ date: string; requests: number; errors: number }>;
    provider_distribution: Record<string, number>;
    cost_analysis: {
      total_spend: number;
      by_provider: Record<string, number>;
      by_connection: Array<{ connection_id: string; connection_name: string; spend: number }>;
    };
  }> {
    return apiClient.get('/connections/analytics', params)
  }
}

// Create singleton instance
export const connectionsService = new ConnectionsService()

// Export for dependency injection or testing
export default connectionsService