export interface ApiResponse<T = unknown> {
  data?: T
  message?: string
  success: boolean
  timestamp?: string
}

export interface PaginatedResponse<T = unknown> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
    request_id?: string
  }
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  version: string
  components: {
    database: {
      status: 'healthy' | 'unhealthy'
      details?: string
    }
    redis: {
      status: 'healthy' | 'unhealthy'
      details?: string
    }
  }
}