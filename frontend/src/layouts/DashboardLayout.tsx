import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  LinkIcon,
  ShieldCheckIcon,
  CogIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

import { useAuth } from '@/contexts/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Connections', href: '/connections', icon: LinkIcon },
  { name: 'Policies', href: '/policies', icon: ShieldCheckIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
]

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

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
              {navigation.map((item) => {
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
                {navigation.map((item) => {
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
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex-shrink-0 w-full group block">
                <div className="flex items-center">
                  <div>
                    <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-gray-500">
                      <UserIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-700">{user?.email}</p>
                    <p className="text-xs font-medium text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="ml-3 flex-shrink-0 p-1 text-gray-400 hover:text-gray-500"
                    title="Sign out"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
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

        {/* Page content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  )
}