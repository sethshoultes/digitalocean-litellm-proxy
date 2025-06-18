import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LinkIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChartBarSquareIcon,
  CogIcon,
} from '@heroicons/react/24/outline'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
  adminOnly?: boolean
}

interface QuickActionsProps {
  userRole?: string
  customActions?: QuickAction[]
}

const defaultActions: QuickAction[] = [
  {
    id: 'new-connection',
    title: 'Add New Connection',
    description: 'Connect to a new LLM provider',
    icon: LinkIcon,
    href: '/connections/new',
    color: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
    adminOnly: false,
  },
  {
    id: 'create-policy',
    title: 'Create Access Policy',
    description: 'Set up access control rules',
    icon: ShieldCheckIcon,
    href: '/policies/new',
    color: 'text-purple-600 bg-purple-50 hover:bg-purple-100',
    adminOnly: false,
  },
  {
    id: 'manage-users',
    title: 'Manage Users',
    description: 'Add or modify user accounts',
    icon: UserGroupIcon,
    href: '/users',
    color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100',
    adminOnly: true,
  },
  {
    id: 'view-logs',
    title: 'System Logs',
    description: 'Review system activity and errors',
    icon: DocumentTextIcon,
    href: '/monitoring/logs',
    color: 'text-gray-600 bg-gray-50 hover:bg-gray-100',
    adminOnly: true,
  },
  {
    id: 'analytics',
    title: 'Usage Analytics',
    description: 'View usage reports and metrics',
    icon: ChartBarSquareIcon,
    href: '/monitoring/analytics',
    color: 'text-green-600 bg-green-50 hover:bg-green-100',
    adminOnly: true,
  },
  {
    id: 'settings',
    title: 'System Settings',
    description: 'Configure system preferences',
    icon: CogIcon,
    href: '/settings',
    color: 'text-orange-600 bg-orange-50 hover:bg-orange-100',
    adminOnly: true,
  },
]

export function QuickActions({ userRole = 'user', customActions }: QuickActionsProps) {
  const actions = customActions || defaultActions
  const isAdmin = userRole === 'admin'
  
  // Filter actions based on user role
  const filteredActions = actions.filter(action => !action.adminOnly || isAdmin)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filteredActions.map((action) => (
        <Link
          key={action.id}
          to={action.href}
          className={clsx(
            'relative group p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg transition-colors duration-200',
            action.color
          )}
        >
          <div>
            <span className="rounded-lg inline-flex p-3 ring-4 ring-white">
              <action.icon className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium">
              <span className="absolute inset-0" aria-hidden="true" />
              {action.title}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {action.description}
            </p>
          </div>
          <span
            className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
            aria-hidden="true"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
            </svg>
          </span>
        </Link>
      ))}
    </div>
  )
}

// Preset component for dashboard quick actions
export function DashboardQuickActions({ 
  userRole, 
  title = 'Quick Actions' 
}: { 
  userRole?: string
  title?: string 
}) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-5">
          {title}
        </h3>
        <QuickActions userRole={userRole} />
      </div>
    </div>
  )
}

// Compact version for smaller spaces
export function CompactQuickActions({ userRole = 'user' }: { userRole?: string }) {
  const isAdmin = userRole === 'admin'
  
  const compactActions = [
    {
      id: 'new-connection',
      title: 'New Connection',
      icon: LinkIcon,
      href: '/connections/new',
      color: 'text-blue-600 hover:bg-blue-50',
    },
    {
      id: 'create-policy',
      title: 'New Policy',
      icon: ShieldCheckIcon,
      href: '/policies/new',
      color: 'text-purple-600 hover:bg-purple-50',
    },
    ...(isAdmin ? [{
      id: 'system-logs',
      title: 'System Logs',
      icon: DocumentTextIcon,
      href: '/monitoring/logs',
      color: 'text-gray-600 hover:bg-gray-50',
    }] : []),
  ]

  return (
    <div className="flex space-x-2">
      {compactActions.map((action) => (
        <Link
          key={action.id}
          to={action.href}
          className={clsx(
            'inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md transition-colors duration-200',
            action.color,
            'border-gray-300 hover:border-gray-400'
          )}
          title={action.title}
        >
          <action.icon className="h-4 w-4 mr-2" />
          {action.title}
        </Link>
      ))}
    </div>
  )
}