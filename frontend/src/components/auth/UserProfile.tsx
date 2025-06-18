import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserIcon,
  ArrowRightOnRectangleIcon,
  CogIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

import { useAuth } from '@/contexts/AuthContext'

interface UserProfileProps {
  className?: string
}

export function UserProfile({ className }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  const { user, logout, isTokenExpiring } = useAuth()
  const navigate = useNavigate()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setIsOpen(false)
    
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const getUserInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (!user) return null

  return (
    <div className={clsx('relative', className)}>
      {/* Profile Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full flex items-center p-2 text-left rounded-lg transition-colors duration-200',
          'hover:bg-gray-100 focus:outline-none focus:bg-gray-100',
          isOpen && 'bg-gray-100'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
        disabled={isLoggingOut}
      >
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
            {getUserInitials(user.email)}
          </div>
        </div>
        
        <div className="ml-3 flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user.email}
          </p>
          <div className="flex items-center space-x-2">
            <span className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              user.role === 'admin' 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-blue-100 text-blue-800'
            )}>
              {user.role === 'admin' && <ShieldCheckIcon className="w-3 h-3 mr-1" />}
              {user.role}
            </span>
            {isTokenExpiring() && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                <ClockIcon className="w-3 h-3 mr-1" />
                Expiring
              </span>
            )}
          </div>
        </div>
        
        <ChevronDownIcon 
          className={clsx(
            'h-4 w-4 text-gray-400 transition-transform duration-200',
            isOpen && 'transform rotate-180'
          )} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
          role="menu"
          aria-orientation="vertical"
        >
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                {getUserInitials(user.email)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.email}
                </p>
                <p className="text-xs text-gray-500">
                  Member since {formatDate(user.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Session Status */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Session Status</span>
              <span className={clsx(
                'inline-flex items-center px-2 py-1 rounded-full font-medium',
                isTokenExpiring() 
                  ? 'bg-amber-100 text-amber-800' 
                  : 'bg-green-100 text-green-800'
              )}>
                {isTokenExpiring() ? 'Expiring Soon' : 'Active'}
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false)
                navigate('/settings')
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              role="menuitem"
            >
              <CogIcon className="h-4 w-4 mr-3 text-gray-400" />
              Account Settings
            </button>

            {user.role === 'admin' && (
              <button
                onClick={() => {
                  setIsOpen(false)
                  // Navigate to admin panel or show admin options
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                role="menuitem"
              >
                <ShieldCheckIcon className="h-4 w-4 mr-3 text-gray-400" />
                Admin Panel
              </button>
            )}
          </div>

          {/* Logout Section */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={clsx(
                'w-full flex items-center px-4 py-2 text-sm transition-colors',
                isLoggingOut
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-red-600 hover:bg-red-50 hover:text-red-700'
              )}
              role="menuitem"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
              {isLoggingOut ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Signing out...
                </span>
              ) : (
                'Sign out'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}