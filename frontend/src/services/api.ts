import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios'
import { toast } from 'react-hot-toast'

import type { ApiResponse, ApiError, PaginatedResponse } from '@/types'

// Extended axios config for retry logic
declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean
    _retryCount?: number
    _retryDelay?: number
  }
}

interface RequestConfig {
  timeout?: number
  retries?: number
  retryDelay?: number
  showErrorToast?: boolean
}

interface LoadingState {
  [key: string]: boolean
}

class NetworkError extends Error {
  constructor(message: string, public isNetworkError = true) {
    super(message)
    this.name = 'NetworkError'
  }
}

class ValidationError extends Error {
  constructor(message: string, public details?: Record<string, unknown>) {
    super(message)
    this.name = 'ValidationError'
  }
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

class ServerError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'ServerError'
  }
}

export class ApiClient {
  private client: AxiosInstance
  private loadingStates: LoadingState = {}
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 1000
  private readonly DEFAULT_TIMEOUT = 30000

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1',
      timeout: this.DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor to add auth token and logging
    this.client.interceptors.request.use(
      (config) => {
        // Add authentication token
        const token = localStorage.getItem('access_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId()

        // Set loading state
        const requestKey = this.getRequestKey(config)
        this.setLoadingState(requestKey, true)

        // Log request in development
        if (import.meta.env.DEV) {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data,
            params: config.params,
          })
        }

        return config
      },
      (error) => {
        console.error('❌ Request interceptor error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor to handle errors, retries, and token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Clear loading state
        const requestKey = this.getRequestKey(response.config)
        this.setLoadingState(requestKey, false)

        // Log response in development
        if (import.meta.env.DEV) {
          console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
          })
        }

        return response
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config
        
        if (!originalRequest) {
          return Promise.reject(error)
        }

        // Clear loading state
        const requestKey = this.getRequestKey(originalRequest)
        this.setLoadingState(requestKey, false)

        // Log error in development
        if (import.meta.env.DEV) {
          console.error(`❌ API Error: ${originalRequest.method?.toUpperCase()} ${originalRequest.url}`, {
            status: error.response?.status,
            error: error.response?.data,
            message: error.message,
          })
        }

        // Handle 401 errors (unauthorized) with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            await this.refreshToken()
            // Retry the original request with new token
            const token = localStorage.getItem('access_token')
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return this.client(originalRequest)
          } catch (refreshError) {
            this.handleAuthFailure()
            return Promise.reject(new AuthenticationError('Authentication failed'))
          }
        }

        // Handle network errors with retry logic
        if (this.isNetworkError(error) && this.shouldRetry(originalRequest)) {
          return this.retryRequest(originalRequest)
        }

        // Transform and handle API errors
        const transformedError = this.transformError(error)
        this.handleApiError(transformedError, !(originalRequest as any)?.showErrorToast === false)
        
        return Promise.reject(transformedError)
      }
    )
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw new AuthenticationError('No refresh token available')
    }

    try {
      // Use a separate axios instance to avoid interceptor loops
      const refreshClient = axios.create({
        baseURL: this.client.defaults.baseURL,
        timeout: 10000,
      })

      const response = await refreshClient.post('/auth/refresh', {
        refresh_token: refreshToken,
      })

      const { access_token, refresh_token: newRefreshToken } = response.data
      localStorage.setItem('access_token', access_token)
      
      // Update refresh token if provided
      if (newRefreshToken) {
        localStorage.setItem('refresh_token', newRefreshToken)
      }

      if (import.meta.env.DEV) {
        console.log('🔄 Token refreshed successfully')
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error)
      this.clearTokens()
      throw new AuthenticationError('Token refresh failed')
    }
  }

  private handleAuthFailure() {
    this.clearTokens()
    
    // Emit custom event for auth failure (can be caught by auth context)
    window.dispatchEvent(new CustomEvent('auth:failure'))
    
    // Only redirect if we're not already on the login page
    if (window.location.pathname !== '/login') {
      // Use replace to avoid back button issues
      window.location.replace('/login')
    }
  }

  private handleApiError(error: Error, showToast = true) {
    if (!showToast) return

    let message = 'An unexpected error occurred'
    
    if (error instanceof NetworkError) {
      message = 'Network error. Please check your connection and try again.'
    } else if (error instanceof ValidationError) {
      message = error.message || 'Invalid data provided'
    } else if (error instanceof AuthenticationError) {
      message = 'Authentication failed. Please log in again.'
    } else if (error instanceof AuthorizationError) {
      message = 'You do not have permission to perform this action.'
    } else if (error instanceof ServerError) {
      message = `Server error (${error.statusCode}). Please try again later.`
    } else if (error.message) {
      message = error.message
    }

    toast.error(message)
  }

  // HTTP methods with enhanced configuration
  async get<T = unknown>(url: string, params?: Record<string, unknown>, config?: RequestConfig): Promise<T> {
    const axiosConfig: AxiosRequestConfig = {
      params,
      ...this.buildRequestConfig(config),
    }
    
    const response = await this.client.get<ApiResponse<T>>(url, axiosConfig)
    return this.extractData(response)
  }

  async post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const axiosConfig: AxiosRequestConfig = {
      ...this.buildRequestConfig(config),
    }
    
    const response = await this.client.post<ApiResponse<T>>(url, data, axiosConfig)
    return this.extractData(response)
  }

  async put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const axiosConfig: AxiosRequestConfig = {
      ...this.buildRequestConfig(config),
    }
    
    const response = await this.client.put<ApiResponse<T>>(url, data, axiosConfig)
    return this.extractData(response)
  }

  async patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const axiosConfig: AxiosRequestConfig = {
      ...this.buildRequestConfig(config),
    }
    
    const response = await this.client.patch<ApiResponse<T>>(url, data, axiosConfig)
    return this.extractData(response)
  }

  async delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    const axiosConfig: AxiosRequestConfig = {
      ...this.buildRequestConfig(config),
    }
    
    const response = await this.client.delete<ApiResponse<T>>(url, axiosConfig)
    return this.extractData(response)
  }

  // Paginated GET method
  async getPaginated<T = unknown>(url: string, params?: Record<string, unknown>, config?: RequestConfig): Promise<PaginatedResponse<T>> {
    const axiosConfig: AxiosRequestConfig = {
      params,
      ...this.buildRequestConfig(config),
    }
    
    const response = await this.client.get<PaginatedResponse<T>>(url, axiosConfig)
    return response.data
  }

  // Utility methods
  private buildRequestConfig(config?: RequestConfig): AxiosRequestConfig {
    return {
      timeout: config?.timeout || this.DEFAULT_TIMEOUT,
      _retryCount: 0,
      _retryDelay: config?.retryDelay || this.RETRY_DELAY,
      showErrorToast: config?.showErrorToast !== false,
      ...(config?.retries && { maxRetries: config.retries }),
    }
  }

  private extractData<T>(response: AxiosResponse<ApiResponse<T>>): T {
    // Handle different response formats
    if (response.data && 'data' in response.data) {
      return response.data.data as T
    }
    return response.data as unknown as T
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getRequestKey(config: AxiosRequestConfig): string {
    return `${config.method}_${config.url}`
  }

  private setLoadingState(key: string, loading: boolean): void {
    this.loadingStates[key] = loading
    
    // Emit loading state change event
    window.dispatchEvent(new CustomEvent('api:loading', {
      detail: { key, loading, states: { ...this.loadingStates } }
    }))
  }

  private isNetworkError(error: AxiosError): boolean {
    return !error.response || 
           error.code === 'NETWORK_ERROR' || 
           error.code === 'ECONNABORTED' || 
           error.message.includes('Network Error')
  }

  private shouldRetry(config: AxiosRequestConfig): boolean {
    const retryCount = config._retryCount || 0
    const maxRetries = (config as any).maxRetries || this.MAX_RETRIES
    
    return retryCount < maxRetries && config.method?.toLowerCase() === 'get'
  }

  private async retryRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
    const retryCount = (config._retryCount || 0) + 1
    const retryDelay = config._retryDelay || this.RETRY_DELAY
    
    config._retryCount = retryCount
    
    // Exponential backoff
    const delay = retryDelay * Math.pow(2, retryCount - 1)
    
    if (import.meta.env.DEV) {
      console.log(`🔄 Retrying request (${retryCount}/${this.MAX_RETRIES}) after ${delay}ms`)
    }
    
    await new Promise(resolve => setTimeout(resolve, delay))
    
    return this.client(config)
  }

  private transformError(error: AxiosError<ApiError>): Error {
    if (!error.response) {
      return new NetworkError(error.message || 'Network error occurred')
    }

    const { status, data } = error.response
    const apiError = data?.error

    switch (status) {
      case 400:
        return new ValidationError(apiError?.message || 'Bad request', apiError?.details)
      case 401:
        return new AuthenticationError(apiError?.message || 'Authentication required')
      case 403:
        return new AuthorizationError(apiError?.message || 'Access forbidden')
      case 422:
        return new ValidationError(apiError?.message || 'Validation failed', apiError?.details)
      case 500:
      case 502:
      case 503:
      case 504:
        return new ServerError(apiError?.message || 'Server error', status)
      default:
        return new Error(apiError?.message || `HTTP error ${status}`)
    }
  }

  private clearTokens(): void {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  // Public utility methods
  isLoading(key?: string): boolean {
    if (key) {
      return this.loadingStates[key] || false
    }
    return Object.values(this.loadingStates).some(loading => loading)
  }

  getLoadingStates(): LoadingState {
    return { ...this.loadingStates }
  }

  // Raw axios instance for special cases
  get raw(): AxiosInstance {
    return this.client
  }

  // Configuration methods
  setTimeout(timeout: number): void {
    this.client.defaults.timeout = timeout
  }

  setBaseURL(baseURL: string): void {
    this.client.defaults.baseURL = baseURL
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.get('/health', {}, { showErrorToast: false })
      return response as { status: string; timestamp: string }
    } catch (error) {
      throw new Error('Health check failed')
    }
  }
}

// Export error classes for external use
export {
  NetworkError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ServerError,
}

// Create a singleton instance
export const apiClient = new ApiClient()

// Export default instance
export default apiClient