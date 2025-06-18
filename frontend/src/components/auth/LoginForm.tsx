import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import type { LoginRequest } from '@/types'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)
  
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setFocus,
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Focus email field on mount
  useEffect(() => {
    setFocus('email')
  }, [setFocus])

  const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error
    if (error?.message) return error.message
    if (error?.response?.data?.detail) return error.response.data.detail
    if (error?.response?.status === 401) return 'Invalid email or password'
    if (error?.response?.status === 429) return 'Too many login attempts. Please try again later.'
    if (error?.response?.status >= 500) return 'Server error. Please try again later.'
    return 'Login failed. Please try again.'
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setLoginError(null)
    
    try {
      await login(data as LoginRequest)
      toast.success('Welcome back!')
      
      // Navigate to intended destination
      const from = (location.state as any)?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (error) {
      console.error('Login error:', error)
      const errorMessage = getErrorMessage(error)
      setLoginError(errorMessage)
      setAttemptCount(prev => prev + 1)
      
      // Show toast for specific errors
      if (errorMessage.includes('Too many')) {
        toast.error(errorMessage)
      } else if (attemptCount >= 2) {
        toast.error('Multiple failed attempts. Please check your credentials.')
      }
      
      // Focus password field on error for better UX
      setFocus('password')
    } finally {
      setIsLoading(false)
    }
  }

  // Clear error when user starts typing
  const clearError = () => {
    if (loginError) setLoginError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to LiteLLM Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 max-w-sm mx-auto">
            Connection and Access Management Interface for enterprise LLM deployments
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-xl border border-gray-100">
          {/* Global Error Message */}
          {loginError && (
            <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Authentication Failed
                  </h3>
                  <div className="mt-1 text-sm text-red-700">
                    {loginError}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  {...register('email', {
                    onChange: clearError,
                  })}
                  type="email"
                  autoComplete="email"
                  className={`
                    appearance-none relative block w-full px-3 py-3 border rounded-lg
                    placeholder-gray-400 text-gray-900 focus:outline-none focus:z-10 sm:text-sm
                    transition-colors duration-200
                    ${errors.email 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                    }
                    ${isLoading ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
                  `}
                  placeholder="Enter your email address"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    onChange: clearError,
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`
                    appearance-none relative block w-full px-3 py-3 pr-12 border rounded-lg
                    placeholder-gray-400 text-gray-900 focus:outline-none focus:z-10 sm:text-sm
                    transition-colors duration-200
                    ${errors.password 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                    }
                    ${isLoading ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
                  `}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Security Notice */}
            {attemptCount >= 3 && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-amber-700">
                      Multiple failed login attempts detected. Please verify your credentials.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading || !isValid}
                className={`
                  group relative w-full flex justify-center py-3 px-4 border border-transparent 
                  text-sm font-medium rounded-lg text-white transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                  ${isLoading || !isValid
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-primary-600 hover:bg-primary-700 hover:shadow-lg transform hover:-translate-y-0.5'
                  }
                `}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  <span className="flex items-center">
                    Sign in
                    <svg className="ml-2 -mr-1 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Secure enterprise authentication powered by JWT
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}