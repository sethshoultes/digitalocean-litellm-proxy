import { useEffect, useState } from 'react'
import {
  LinkIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useDashboardData } from '@/services/dashboard'
import { useRoleAccess, RoleGuard } from '@/hooks/useRoleAccess'
import {
  MetricsCard,
  SystemHealthIndicator,
  SystemActivityFeed,
  DashboardQuickActions,
  UsageChartCard,
  CostChartCard,
  ProviderUsageCard,
  type ActivityItem,
  type UsageData,
  type ProviderData,
} from '@/components/dashboard'

interface DashboardStats {
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

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error'
  redis: 'healthy' | 'warning' | 'error'
  apiResponseTime: number
  uptime: number
}

// Mock data - replace with real API calls
const mockStats: DashboardStats = {
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

const mockSystemHealth: SystemHealth = {
  database: 'healthy',
  redis: 'healthy',
  apiResponseTime: 245,
  uptime: 99.8,
}

const mockActivities: ActivityItem[] = [
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
]

const mockUsageData: UsageData[] = [
  { timestamp: '00:00', requests: 120, tokens: 15000, cost: 12.50, errors: 2 },
  { timestamp: '04:00', requests: 80, tokens: 9000, cost: 8.20, errors: 1 },
  { timestamp: '08:00', requests: 280, tokens: 35000, cost: 28.50, errors: 3 },
  { timestamp: '12:00', requests: 350, tokens: 42000, cost: 35.80, errors: 5 },
  { timestamp: '16:00', requests: 420, tokens: 48000, cost: 42.30, errors: 2 },
  { timestamp: '20:00', requests: 190, tokens: 22000, cost: 19.80, errors: 1 },
]

const mockProviderData: ProviderData[] = [
  { name: 'OpenAI', requests: 1250, cost: 125.50, color: '#10B981' },
  { name: 'Anthropic', requests: 780, cost: 89.20, color: '#3B82F6' },
  { name: 'Azure OpenAI', requests: 560, cost: 67.80, color: '#8B5CF6' },
  { name: 'AWS Bedrock', requests: 320, cost: 42.30, color: '#F59E0B' },
  { name: 'Google AI', requests: 180, cost: 28.90, color: '#EF4444' },
]

export function DashboardPage() {
  const { user } = useAuth()
  const { data, loading: isLoading, error } = useDashboardData()
  const { isAdmin, permissions } = useRoleAccess()

  // Extract data with fallbacks
  const stats = data.stats || mockStats
  const systemHealth = data.systemHealth || mockSystemHealth
  const activities = data.activities || mockActivities
  const usageData = data.usageData || mockUsageData
  const providerData = data.providerData || mockProviderData

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading dashboard
                </h3>
                <p className="mt-2 text-sm text-red-700">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 text-sm font-medium text-red-800 hover:text-red-600"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const baseMetricCards = [
    {
      title: 'Total Connections',
      value: stats?.totalConnections || 0,
      icon: LinkIcon,
      iconColor: 'bg-blue-500',
      href: '/connections',
      trend: {
        value: stats?.trends.connections || 0,
        label: 'from last month',
        type: 'increase' as const,
      },
      subtitle: `${stats?.activeConnections || 0} active`,
    },
    {
      title: 'Access Policies',
      value: stats?.totalPolicies || 0,
      icon: ShieldCheckIcon,
      iconColor: 'bg-purple-500',
      href: '/policies',
      subtitle: `${stats?.activePolicies || 0} active`,
    },
    {
      title: 'Monthly Cost',
      value: `$${stats?.totalCost?.toLocaleString() || '0'}`,
      icon: CurrencyDollarIcon,
      iconColor: 'bg-green-500',
      trend: {
        value: Math.abs(stats?.trends.cost || 0),
        label: 'from last month',
        type: (stats?.trends.cost || 0) >= 0 ? 'increase' : 'decrease',
      },
    },
    {
      title: 'Avg Response Time',
      value: `${stats?.avgResponseTime || 0}ms`,
      icon: ClockIcon,
      iconColor: 'bg-yellow-500',
      trend: {
        value: stats?.trends.responseTime || 0,
        label: 'from last week',
        type: 'increase' as const,
      },
    },
  ]

  const adminMetricCards = [
    ...baseMetricCards,
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: UserGroupIcon,
      iconColor: 'bg-indigo-500',
      href: '/users',
      trend: {
        value: stats?.trends.users || 0,
        label: 'from last month',
        type: 'increase' as const,
      },
    },
    {
      title: 'Error Rate',
      value: `${stats?.errorRate || 0}%`,
      icon: ExclamationTriangleIcon,
      iconColor: 'bg-red-500',
      href: '/monitoring',
    },
  ]

  const metricCards = isAdmin ? adminMetricCards : baseMetricCards

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Welcome back, {user?.email}. Here's what's happening with your LiteLLM system.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {metricCards.map((card) => (
            <MetricsCard
              key={card.title}
              title={card.title}
              value={card.value}
              icon={card.icon}
              iconColor={card.iconColor}
              href={card.href}
              trend={card.trend}
              subtitle={card.subtitle}
              loading={isLoading}
            />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <UsageChartCard 
            data={usageData} 
            title="API Usage Over Time"
            loading={isLoading}
          />
          <CostChartCard 
            data={usageData} 
            title="Cost Analysis"
            loading={isLoading}
          />
        </div>

        {/* Provider Usage - Admin Only */}
        <RoleGuard requiredPermissions={['canViewAnalytics']}>
          <div className="mb-8">
            <ProviderUsageCard 
              data={providerData} 
              title="Provider Usage Distribution"
              loading={isLoading}
            />
          </div>
        </RoleGuard>

        {/* Bottom Section */}
        <div className={`grid gap-6 ${permissions.canViewSystemHealth ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
          {/* System Health - Admin Only */}
          <RoleGuard requiredPermissions={['canViewSystemHealth']}>
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-5">
                  System Health
                </h3>
                <div className="space-y-4">
                  <SystemHealthIndicator
                    status={systemHealth?.database === 'healthy' ? 'healthy' : 'error'}
                    label="Database"
                    responseTime={systemHealth?.database === 'healthy' ? 15 : undefined}
                  />
                  <SystemHealthIndicator
                    status={systemHealth?.redis === 'healthy' ? 'healthy' : 'error'}
                    label="Redis Cache"
                    responseTime={systemHealth?.redis === 'healthy' ? 8 : undefined}
                  />
                  <SystemHealthIndicator
                    status={
                      (systemHealth?.apiResponseTime || 0) < 300 ? 'healthy' : 
                      (systemHealth?.apiResponseTime || 0) < 500 ? 'warning' : 'error'
                    }
                    label="API Response Time"
                    responseTime={systemHealth?.apiResponseTime}
                  />
                  <SystemHealthIndicator
                    status={
                      (systemHealth?.uptime || 0) > 99.5 ? 'healthy' : 
                      (systemHealth?.uptime || 0) > 99 ? 'warning' : 'error'
                    }
                    label={`Uptime (${systemHealth?.uptime || 0}%)`}
                  />
                </div>
              </div>
            </div>
          </RoleGuard>

          {/* Recent Activity */}
          <div className={permissions.canViewSystemHealth ? 'lg:col-span-1 xl:col-span-2' : 'col-span-1'}>
            <SystemActivityFeed activities={activities} loading={isLoading} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <DashboardQuickActions userRole={user?.role} />
        </div>
      </div>
    </div>
  )
}