import { formatDistanceToNow } from 'date-fns'
import { clsx } from 'clsx'
import {
  LinkIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CogIcon,
} from '@heroicons/react/24/outline'

export interface ActivityItem {
  id: string
  type: 'connection' | 'policy' | 'user' | 'system' | 'security'
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated' | 'failed' | 'success'
  title: string
  description: string
  timestamp: Date
  user?: {
    name: string
    email: string
  }
  metadata?: Record<string, any>
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  loading?: boolean
  maxItems?: number
  showUser?: boolean
}

const activityIcons = {
  connection: LinkIcon,
  policy: ShieldCheckIcon,
  user: UserGroupIcon,
  system: CogIcon,
  security: ExclamationTriangleIcon,
}

const activityColors = {
  connection: 'text-blue-600 bg-blue-100',
  policy: 'text-purple-600 bg-purple-100',
  user: 'text-indigo-600 bg-indigo-100',
  system: 'text-gray-600 bg-gray-100',
  security: 'text-red-600 bg-red-100',
}

const actionColors = {
  created: 'text-green-700',
  updated: 'text-blue-700',
  deleted: 'text-red-700',
  activated: 'text-green-700',
  deactivated: 'text-yellow-700',
  failed: 'text-red-700',
  success: 'text-green-700',
}

const actionIcons = {
  created: CheckCircleIcon,
  updated: CogIcon,
  deleted: XCircleIcon,
  activated: CheckCircleIcon,
  deactivated: ExclamationTriangleIcon,
  failed: XCircleIcon,
  success: CheckCircleIcon,
}

export function ActivityFeed({ 
  activities, 
  loading = false, 
  maxItems = 10,
  showUser = true 
}: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems)

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex space-x-3">
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (displayActivities.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <CogIcon className="h-8 w-8 mx-auto" />
        </div>
        <p className="text-gray-500 text-sm">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {displayActivities.map((activity, activityIdx) => {
          const TypeIcon = activityIcons[activity.type]
          const ActionIcon = actionIcons[activity.action]
          
          return (
            <li key={activity.id}>
              <div className="relative pb-8">
                {activityIdx !== displayActivities.length - 1 ? (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span
                      className={clsx(
                        activityColors[activity.type],
                        'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white'
                      )}
                    >
                      <TypeIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      <ActionIcon 
                        className={clsx('h-4 w-4', actionColors[activity.action])} 
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {activity.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </p>
                      {showUser && activity.user && (
                        <p className="text-xs text-gray-500">
                          by {activity.user.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Preset component for system activity
export function SystemActivityFeed({ activities, loading }: { 
  activities: ActivityItem[]
  loading?: boolean 
}) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-5">
          Recent Activity
        </h3>
        <ActivityFeed 
          activities={activities} 
          loading={loading}
          maxItems={8}
          showUser={true}
        />
      </div>
    </div>
  )
}