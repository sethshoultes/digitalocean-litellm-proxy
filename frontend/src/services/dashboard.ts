import { useState, useEffect } from 'react'
import { apiClient } from './api'
import type { ActivityItem, UsageData, ProviderData } from '@/components/dashboard'

export interface DashboardStats {
  totalConnections: number
  activeConnections: number
  totalPolicies: number
  activePolicies: number
  totalUsers: number
  totalCost: number
  avgResponseTime: number
  errorRate: number
  trends: {
    connections: number
    users: number
    cost: number
    responseTime: number
  }
}

export interface SystemHealth {
  database: 'healthy' | 'warning' | 'error'
  redis: 'healthy' | 'warning' | 'error'
  apiResponseTime: number
  uptime: number
  lastChecked: Date
}

export interface DashboardData {
  stats: DashboardStats
  systemHealth: SystemHealth
  activities: ActivityItem[]
  usageData: UsageData[]
  providerData: ProviderData[]
}

class DashboardService {
  private pollingInterval: NodeJS.Timeout | null = null
  private listeners: Array<(data: Partial<DashboardData>) => void> = []

  // Fetch all dashboard data
  async getDashboardData(): Promise<DashboardData> {
    try {
      const [stats, health, activities, usage, providers] = await Promise.all([
        this.getStats(),
        this.getSystemHealth(),
        this.getRecentActivity(),
        this.getUsageData(),
        this.getProviderData(),
      ])

      return {
        stats,
        systemHealth: health,
        activities,
        usageData: usage,
        providerData: providers,
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      throw error
    }
  }

  // Get dashboard statistics
  async getStats(): Promise<DashboardStats> {
    try {
      return await apiClient.get<DashboardStats>('/dashboard/stats')
    } catch (error) {
      // Fallback to mock data if API is not available
      console.warn('Using mock dashboard stats')
      return {
        totalConnections: 24,
        activeConnections: 18,
        totalPolicies: 12,
        activePolicies: 10,
        totalUsers: 156,
        totalCost: 2847.50,
        avgResponseTime: 245,
        errorRate: 0.8,
        trends: {
          connections: 12.5,
          users: 8.3,
          cost: -5.2,
          responseTime: 15.7,
        },
      }
    }
  }

  // Get system health status
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      return await apiClient.get<SystemHealth>('/health/system')
    } catch (error) {
      console.warn('Using mock system health data')
      return {
        database: 'healthy',
        redis: 'healthy',
        apiResponseTime: 245,
        uptime: 99.8,
        lastChecked: new Date(),
      }
    }
  }

  // Get recent activity
  async getRecentActivity(limit: number = 10): Promise<ActivityItem[]> {
    try {
      return await apiClient.get<ActivityItem[]>('/dashboard/activity', { limit })
    } catch (error) {
      console.warn('Using mock activity data')
      return [
        {
          id: '1',
          type: 'connection',
          action: 'created',
          title: 'New OpenAI Connection',
          description: 'GPT-4 connection established for Production team',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          user: { name: 'John Doe', email: 'john@example.com' },
        },
        {
          id: '2',
          type: 'policy',
          action: 'updated',
          title: 'Access Policy Modified',
          description: 'Updated rate limits for Development environment',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          user: { name: 'Jane Smith', email: 'jane@example.com' },
        },
        {
          id: '3',
          type: 'user',
          action: 'created',
          title: 'New User Added',
          description: 'Added new team member to Marketing group',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          user: { name: 'Admin', email: 'admin@example.com' },
        },
        {
          id: '4',
          type: 'system',
          action: 'success',
          title: 'System Backup Completed',
          description: 'Daily backup completed successfully',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
        {
          id: '5',
          type: 'security',
          action: 'failed',
          title: 'Failed Login Attempt',
          description: 'Multiple failed login attempts detected',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        },
      ].slice(0, limit)
    }
  }

  // Get usage data for charts
  async getUsageData(timeRange: string = '24h'): Promise<UsageData[]> {
    try {
      return await apiClient.get<UsageData[]>('/dashboard/usage', { timeRange })
    } catch (error) {
      console.warn('Using mock usage data')
      return [
        { timestamp: '00:00', requests: 120, tokens: 15000, cost: 12.50, errors: 2 },
        { timestamp: '04:00', requests: 80, tokens: 9000, cost: 8.20, errors: 1 },
        { timestamp: '08:00', requests: 280, tokens: 35000, cost: 28.50, errors: 3 },
        { timestamp: '12:00', requests: 350, tokens: 42000, cost: 35.80, errors: 5 },
        { timestamp: '16:00', requests: 420, tokens: 48000, cost: 42.30, errors: 2 },
        { timestamp: '20:00', requests: 190, tokens: 22000, cost: 19.80, errors: 1 },
      ]
    }
  }

  // Get provider usage data
  async getProviderData(timeRange: string = '24h'): Promise<ProviderData[]> {
    try {
      return await apiClient.get<ProviderData[]>('/dashboard/providers', { timeRange })
    } catch (error) {
      console.warn('Using mock provider data')
      return [
        { name: 'OpenAI', requests: 1250, cost: 125.50, color: '#10B981' },
        { name: 'Anthropic', requests: 780, cost: 89.20, color: '#3B82F6' },
        { name: 'Azure OpenAI', requests: 560, cost: 67.80, color: '#8B5CF6' },
        { name: 'AWS Bedrock', requests: 320, cost: 42.30, color: '#F59E0B' },
        { name: 'Google AI', requests: 180, cost: 28.90, color: '#EF4444' },
      ]
    }
  }

  // Real-time polling
  startPolling(interval: number = 30000) {
    if (this.pollingInterval) {
      this.stopPolling()
    }

    this.pollingInterval = setInterval(async () => {
      try {
        // Only fetch frequently changing data for polling
        const [stats, health, activities] = await Promise.all([
          this.getStats(),
          this.getSystemHealth(),
          this.getRecentActivity(5), // Only latest activities
        ])

        // Notify all listeners
        this.notifyListeners({
          stats,
          systemHealth: health,
          activities,
        })
      } catch (error) {
        console.error('Polling failed:', error)
      }
    }, interval)
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  // Event listeners for real-time updates
  addListener(callback: (data: Partial<DashboardData>) => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback)
    }
  }

  private notifyListeners(data: Partial<DashboardData>) {
    this.listeners.forEach(callback => callback(data))
  }

  // Utility methods for specific metrics
  async getConnectionsCount(): Promise<{ total: number; active: number }> {
    try {
      return await apiClient.get('/dashboard/connections/count')
    } catch (error) {
      return { total: 24, active: 18 }
    }
  }

  async getPoliciesCount(): Promise<{ total: number; active: number }> {
    try {
      return await apiClient.get('/dashboard/policies/count')
    } catch (error) {
      return { total: 12, active: 10 }
    }
  }

  async getUsersCount(): Promise<number> {
    try {
      return await apiClient.get('/dashboard/users/count')
    } catch (error) {
      return 156
    }
  }

  async getSystemMetrics(): Promise<{
    responseTime: number
    errorRate: number
    uptime: number
  }> {
    try {
      return await apiClient.get('/dashboard/metrics')
    } catch (error) {
      return {
        responseTime: 245,
        errorRate: 0.8,
        uptime: 99.8,
      }
    }
  }

  // Cost and usage analytics
  async getCostAnalytics(timeRange: string = '30d'): Promise<{
    totalCost: number
    trend: number
    breakdown: Array<{ date: string; cost: number }>
  }> {
    try {
      return await apiClient.get('/dashboard/costs', { timeRange })
    } catch (error) {
      return {
        totalCost: 2847.50,
        trend: -5.2,
        breakdown: [],
      }
    }
  }
}

// Create singleton instance
export const dashboardService = new DashboardService()

// Custom hook for dashboard data
export function useDashboardData() {
  const [data, setData] = useState<Partial<DashboardData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const dashboardData = await dashboardService.getDashboardData()
        setData(dashboardData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Set up real-time polling
    dashboardService.startPolling(30000) // Poll every 30 seconds

    // Listen for real-time updates
    const unsubscribe = dashboardService.addListener((updatedData) => {
      setData(prevData => ({
        ...prevData,
        ...updatedData,
      }))
    })

    // Cleanup
    return () => {
      dashboardService.stopPolling()
      unsubscribe()
    }
  }, [])

  return { data, loading, error, refetch: () => setLoading(true) }
}

// Helper hook for specific dashboard metrics
export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const stats = await dashboardService.getStats()
        setMetrics(stats)
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  return { metrics, loading }
}

export default dashboardService