import { apiClient } from './api'
import type { 
  Connection, 
  CreateConnectionRequest, 
  UpdateConnectionRequest, 
  ConnectionListParams, 
  ConnectionTestResult,
  PaginatedResponse 
} from '@/types'

export class ConnectionsService {
  async getConnections(params?: ConnectionListParams): Promise<PaginatedResponse<Connection>> {
    return apiClient.get<PaginatedResponse<Connection>>('/connections/', params)
  }

  async getConnection(connectionId: string): Promise<Connection> {
    return apiClient.get<Connection>(`/connections/${connectionId}`)
  }

  async createConnection(data: CreateConnectionRequest): Promise<Connection> {
    return apiClient.post<Connection>('/connections/', data)
  }

  async updateConnection(connectionId: string, data: UpdateConnectionRequest): Promise<Connection> {
    return apiClient.put<Connection>(`/connections/${connectionId}`, data)
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await apiClient.delete(`/connections/${connectionId}`)
  }

  async testConnection(connectionId: string): Promise<ConnectionTestResult> {
    return apiClient.post<ConnectionTestResult>(`/connections/${connectionId}/test`)
  }

  async toggleConnection(connectionId: string, isActive: boolean): Promise<Connection> {
    return apiClient.patch<Connection>(`/connections/${connectionId}`, { is_active: isActive })
  }

  // Utility methods
  async getActiveConnections(): Promise<Connection[]> {
    const response = await this.getConnections({ status: 'active' })
    return response.items
  }

  async getConnectionsByProvider(provider: string): Promise<Connection[]> {
    const response = await this.getConnections({ provider: provider as any })
    return response.items
  }

  async searchConnections(query: string): Promise<Connection[]> {
    const response = await this.getConnections({ search: query })
    return response.items
  }
}

export const connectionsService = new ConnectionsService()