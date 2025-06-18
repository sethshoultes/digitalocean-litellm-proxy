import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  LinkIcon,
  ShieldCheckIcon,
  CogIcon,
  UserGroupIcon,
  ChartBarSquareIcon,
  BellIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

import { useAuth } from '@/contexts/AuthContext'
import { ResponsiveTest, ResponsiveVisibilityTest } from '@/components/common/ResponsiveTest'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, adminOnly: false },
  { name: 'Connections', href: '/connections', icon: LinkIcon, adminOnly: false },
  { name: 'Policies', href: '/policies', icon: ShieldCheckIcon, adminOnly: false },
  { name: 'Users', href: '/users', icon: UserGroupIcon, adminOnly: true },
  { name: 'Monitoring', href: '/monitoring', icon: ChartBarSquareIcon, adminOnly: true },
  { name: 'Settings', href: '/settings', icon: CogIcon, adminOnly: true },
]

// Breadcrumb mapping
const breadcrumbMap: Record<string, string[]> = {
  '/dashboard': ['Dashboard'],
  '/connections': ['Dashboard', 'Connections'],
  '/connections/new': ['Dashboard', 'Connections', 'New Connection'],
  '/policies': ['Dashboard', 'Policies'],
  '/policies/new': ['Dashboard', 'Policies', 'New Policy'],
  '/users': ['Dashboard', 'Users'],
  '/monitoring': ['Dashboard', 'Monitoring'],
  '/settings': ['Dashboard', 'Settings'],
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [notifications, setNotifications] = useState(3) // Mock notification count
  const { user } = useAuth()
  const location = useLocation()

  // Get filtered navigation based on user role
  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || user?.role === 'admin'
  )

  // Get current breadcrumbs
  const breadcrumbs = breadcrumbMap[location.pathname] || ['Dashboard']

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to search results or filter current view
      console.log('Searching for:', searchQuery)
      setShowSearch(false)
      setSearchQuery('')
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])


  return (
    <div className="h-screen flex">
      {/* Mobile sidebar */}
      <div
        className={clsx(
          'fixed inset-0 z-40 lg:hidden',
          sidebarOpen ? 'block' : 'hidden'
        )}
      >
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
              </div>
              <span className="ml-3 text-lg font-semibold text-gray-900">
                LiteLLM Admin
              </span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {filteredNavigation.map((item) => {
                const isCurrent = location.pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      isCurrent
                        ? 'bg-primary-50 border-primary-500 text-primary-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'group flex items-center px-3 py-2 text-sm font-medium border-l-4 rounded-r-md'
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon
                      className={clsx(
                        isCurrent ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500',
                        'mr-3 flex-shrink-0 h-6 w-6'
                      )}
                    />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          
          {/* Mobile User Section */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <UserProfile />
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-white border-r border-gray-200">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
                <span className="ml-3 text-lg font-semibold text-gray-900">
                  LiteLLM Admin
                </span>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {filteredNavigation.map((item) => {
                  const isCurrent = location.pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={clsx(
                        isCurrent
                          ? 'bg-primary-50 border-primary-500 text-primary-700'
                          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        'group flex items-center px-3 py-2 text-sm font-medium border-l-4 rounded-r-md'
                      )}
                    >
                      <item.icon
                        className={clsx(
                          isCurrent ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500',
                          'mr-3 flex-shrink-0 h-6 w-6'
                        )}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
            
            {/* User section */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4">
              <UserProfile />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top bar */}
        <div className="lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>

        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Breadcrumbs */}
              <div className="flex items-center">
                <nav className="flex" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-4">
                    {breadcrumbs.map((crumb, index) => (
                      <li key={crumb}>
                        <div className="flex items-center">
                          {index > 0 && (
                            <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                          )}
                          <span
                            className={clsx(
                              index === breadcrumbs.length - 1
                                ? 'text-gray-900 font-medium'
                                : 'text-gray-500 hover:text-gray-700',
                              index > 0 ? 'ml-4' : '',
                              'text-sm'
                            )}
                          >
                            {crumb}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>

              {/* Right side - Search and Notifications */}
              <div className="flex items-center space-x-4">
                {/* Quick Search */}
                <div className="relative">
                  {showSearch ? (
                    <form onSubmit={handleSearch} className="flex items-center">
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm w-64"
                          autoFocus
                          onBlur={() => {
                            if (!searchQuery) setShowSearch(false)
                          }}
                        />
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowSearch(true)}
                      className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                      title="Search (⌘K)"
                    >
                      <MagnifyingGlassIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Notifications */}
                <div className="relative">
                  <button
                    className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md transition-colors relative"
                    title="Notifications"
                  >
                    <BellIcon className="h-5 w-5" />
                    {notifications > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {notifications > 9 ? '9+' : notifications}
                      </span>
                    )}
                  </button>
                </div>

                {/* User menu */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-500">
                      <UserIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="hidden md:block">
                      <p className="text-sm font-medium text-gray-700 truncate max-w-32">
                        {user?.email}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                    title="Sign out"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none bg-gray-50">
          <Outlet />
        </main>
      </div>

      {/* Development-only responsive testing */}
      <ResponsiveTest />
      <ResponsiveVisibilityTest />
    </div>
  )
}