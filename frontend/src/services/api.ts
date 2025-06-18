import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { toast } from 'react-hot-toast'

import type { ApiResponse, ApiError } from '@/types'

export class ApiClient {
  private client: AxiosInstance

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor to handle errors and token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            await this.refreshToken()
            // Retry the original request
            const token = localStorage.getItem('access_token')
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return this.client(originalRequest)
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.handleAuthFailure()
            return Promise.reject(refreshError)
          }
        }

        // Handle other errors
        this.handleApiError(error)
        return Promise.reject(error)
      }
    )
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await axios.post(
        `${this.client.defaults.baseURL}/auth/refresh`,
        { refresh_token: refreshToken }
      )

      const { access_token } = response.data
      localStorage.setItem('access_token', access_token)
    } catch (error) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      throw error
    }
  }

  private handleAuthFailure() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    
    // Only redirect if we're not already on the login page
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  private handleApiError(error: AxiosError<ApiError>) {
    if (error.response?.data?.error) {
      const apiError = error.response.data.error
      toast.error(apiError.message || 'An error occurred')
    } else if (error.message) {
      toast.error(error.message)
    } else {
      toast.error('An unexpected error occurred')
    }
  }

  // HTTP methods
  async get<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params })
    return response.data.data as T
  }

  async post<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data)
    return response.data.data as T
  }

  async put<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data)
    return response.data.data as T
  }

  async patch<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data)
    return response.data.data as T
  }

  async delete<T = unknown>(url: string): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url)
    return response.data.data as T
  }

  // Raw axios instance for special cases
  get raw(): AxiosInstance {
    return this.client
  }
}

// Create a singleton instance
export const apiClient = new ApiClient()

// Export default instance
export default apiClient