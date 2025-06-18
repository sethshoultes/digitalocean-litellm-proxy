import { apiClient } from './api'
import type { HealthCheckResponse } from '@/types'

export class HealthService {
  async getHealthStatus(): Promise<HealthCheckResponse> {
    // Health check endpoint is typically not under /api/v1
    return apiClient.raw.get('/health').then(response => response.data)
  }

  async getDatabaseHealth(): Promise<{ status: string; details?: string }> {
    const health = await this.getHealthStatus()
    return health.components.database
  }

  async getRedisHealth(): Promise<{ status: string; details?: string }> {
    const health = await this.getHealthStatus()
    return health.components.redis
  }

  isHealthy(health: HealthCheckResponse): boolean {
    return health.status === 'healthy'
  }
}

export const healthService = new HealthService()