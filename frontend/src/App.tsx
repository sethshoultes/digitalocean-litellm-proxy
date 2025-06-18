import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import { HelmetProvider } from 'react-helmet-async'
import { ErrorBoundary } from 'react-error-boundary'

import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginForm } from '@/components/auth/LoginForm'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Something went wrong</h3>
        <p className="mt-1 text-sm text-gray-500">
          {error.message || 'An unexpected error occurred'}
        </p>
        <div className="mt-6">
          <button
            onClick={resetErrorBoundary}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router>
              <div className="App">
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<LoginForm />} />
                  
                  {/* Protected routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    
                    {/* User-accessible routes */}
                    <Route 
                      path="connections" 
                      element={
                        <div className="p-6">
                          <h1 className="text-2xl font-semibold text-gray-900">Connections</h1>
                          <p className="mt-2 text-gray-600">Connection management interface coming soon...</p>
                          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-700">
                              This interface will allow you to manage your LLM provider connections, 
                              including API keys, endpoint configurations, and connection health monitoring.
                            </p>
                          </div>
                        </div>
                      } 
                    />
                    <Route 
                      path="policies" 
                      element={
                        <div className="p-6">
                          <h1 className="text-2xl font-semibold text-gray-900">Policies</h1>
                          <p className="mt-2 text-gray-600">Policy management interface coming soon...</p>
                          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-green-700">
                              Create and manage access policies to control user permissions, 
                              rate limits, and usage quotas across your LLM connections.
                            </p>
                          </div>
                        </div>
                      } 
                    />
                    
                    {/* Admin-only routes */}
                    <Route 
                      path="users" 
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <div className="p-6">
                            <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
                            <p className="mt-2 text-gray-600">User administration interface coming soon...</p>
                            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                              <p className="text-sm text-purple-700">
                                Manage user accounts, roles, and permissions. Create new users and 
                                assign them to appropriate access policies.
                              </p>
                            </div>
                          </div>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="monitoring" 
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <div className="p-6">
                            <h1 className="text-2xl font-semibold text-gray-900">System Monitoring</h1>
                            <p className="mt-2 text-gray-600">Monitoring dashboard coming soon...</p>
                            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                              <p className="text-sm text-orange-700">
                                Real-time monitoring of LLM usage, performance metrics, 
                                error rates, and system health across all connections.
                              </p>
                            </div>
                          </div>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="settings" 
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <div className="p-6">
                            <h1 className="text-2xl font-semibold text-gray-900">System Settings</h1>
                            <p className="mt-2 text-gray-600">Settings interface coming soon...</p>
                            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <p className="text-sm text-gray-700">
                                Configure system-wide settings, authentication providers, 
                                security policies, and integration configurations.
                              </p>
                            </div>
                          </div>
                        </ProtectedRoute>
                      } 
                    />
                  </Route>

                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>

                {/* Global toast notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      style: {
                        background: '#059669',
                      },
                    },
                    error: {
                      style: {
                        background: '#DC2626',
                      },
                    },
                  }}
                />
              </div>
            </Router>
          </AuthProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  )
}

export default App