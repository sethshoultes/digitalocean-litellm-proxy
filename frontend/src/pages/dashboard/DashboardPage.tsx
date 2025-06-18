import { useEffect, useState } from 'react'
import {
  LinkIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface DashboardStats {
  totalConnections: number
  activeConnections: number
  totalPolicies: number
  activePolicies: number
  totalUsers: number
  recentActivity: number
}

const mockStats: DashboardStats = {
  totalConnections: 12,
  activeConnections: 8,
  totalPolicies: 5,
  activePolicies: 4,
  totalUsers: 25,
  recentActivity: 47,
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    const fetchStats = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setStats(mockStats)
      setIsLoading(false)
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const statCards = [
    {
      name: 'Total Connections',
      value: stats?.totalConnections,
      icon: LinkIcon,
      color: 'bg-blue-500',
      href: '/connections',
    },
    {
      name: 'Active Connections',
      value: stats?.activeConnections,
      icon: LinkIcon,
      color: 'bg-green-500',
      href: '/connections?status=active',
    },
    {
      name: 'Access Policies',
      value: stats?.totalPolicies,
      icon: ShieldCheckIcon,
      color: 'bg-purple-500',
      href: '/policies',
    },
    {
      name: 'Total Users',
      value: stats?.totalUsers,
      icon: UserGroupIcon,
      color: 'bg-indigo-500',
      href: '/users',
    },
  ]

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Overview of your LiteLLM connection and access management system
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((card) => (
            <div
              key={card.name}
              className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden"
            >
              <dt>
                <div className={`absolute ${card.color} rounded-md p-3`}>
                  <card.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <p className="ml-16 text-sm font-medium text-gray-500 truncate">
                  {card.name}
                </p>
              </dt>
              <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
              </dd>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Health */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                System Health
              </h3>
              <div className="mt-5 space-y-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Database</p>
                    <p className="text-sm text-gray-500">Healthy</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Redis Cache</p>
                    <p className="text-sm text-gray-500">Healthy</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">API Response Time</p>
                    <p className="text-sm text-gray-500">245ms (Good)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Quick Actions
              </h3>
              <div className="mt-5 space-y-3">
                <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                  <div className="flex items-center">
                    <LinkIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-sm font-medium text-gray-900">
                      Add New Connection
                    </span>
                  </div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                  <div className="flex items-center">
                    <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-sm font-medium text-gray-900">
                      Create Access Policy
                    </span>
                  </div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-sm font-medium text-gray-900">
                      View System Logs
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}