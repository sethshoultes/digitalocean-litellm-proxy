import { useState, useEffect } from 'react'
import { 
  DevicePhoneMobileIcon, 
  DeviceTabletIcon, 
  ComputerDesktopIcon 
} from '@heroicons/react/24/outline'

interface BreakpointInfo {
  name: string
  minWidth: number
  maxWidth?: number
  icon: React.ComponentType<{ className?: string }>
}

const breakpoints: BreakpointInfo[] = [
  { name: 'Mobile', minWidth: 0, maxWidth: 639, icon: DevicePhoneMobileIcon },
  { name: 'Tablet', minWidth: 640, maxWidth: 1023, icon: DeviceTabletIcon },
  { name: 'Desktop', minWidth: 1024, icon: ComputerDesktopIcon },
]

export function ResponsiveTest() {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const [currentBreakpoint, setCurrentBreakpoint] = useState<BreakpointInfo | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Set initial value

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const breakpoint = breakpoints.find(bp => {
      if (bp.maxWidth) {
        return windowWidth >= bp.minWidth && windowWidth <= bp.maxWidth
      }
      return windowWidth >= bp.minWidth
    })
    setCurrentBreakpoint(breakpoint || null)
  }, [windowWidth])

  // Only show in development mode
  if (import.meta.env.PROD) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
      <div className="flex items-center space-x-2 text-xs">
        {currentBreakpoint && (
          <>
            <currentBreakpoint.icon className="h-4 w-4" />
            <span>{currentBreakpoint.name}</span>
            <span className="text-gray-300">({windowWidth}px)</span>
          </>
        )}
      </div>
    </div>
  )
}

// Grid system test component
export function GridTest() {
  if (import.meta.env.PROD) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 pointer-events-none z-40 opacity-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-screen">
        <div className="grid grid-cols-12 gap-4 h-full">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-red-500 h-full"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Component to test responsive visibility
export function ResponsiveVisibilityTest() {
  if (import.meta.env.PROD) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <div className="block sm:hidden bg-red-500 text-white px-2 py-1 rounded text-xs">
        Mobile Only
      </div>
      <div className="hidden sm:block md:hidden bg-blue-500 text-white px-2 py-1 rounded text-xs">
        Tablet Only
      </div>
      <div className="hidden md:block lg:hidden bg-green-500 text-white px-2 py-1 rounded text-xs">
        Small Desktop
      </div>
      <div className="hidden lg:block xl:hidden bg-purple-500 text-white px-2 py-1 rounded text-xs">
        Large Desktop
      </div>
      <div className="hidden xl:block bg-yellow-500 text-black px-2 py-1 rounded text-xs">
        Extra Large
      </div>
    </div>
  )
}

// Layout test for dashboard components
export function DashboardLayoutTest() {
  if (import.meta.env.PROD) {
    return null
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
      <div className="text-xs space-y-1">
        <div>Dashboard Layout Test</div>
        <div className="flex space-x-4">
          <span className="block sm:hidden text-red-400">📱 Mobile</span>
          <span className="hidden sm:block md:hidden text-blue-400">📱 Tablet</span>
          <span className="hidden md:block lg:hidden text-green-400">💻 Small Desktop</span>
          <span className="hidden lg:block xl:hidden text-purple-400">💻 Desktop</span>
          <span className="hidden xl:block text-yellow-400">🖥️ Large Desktop</span>
        </div>
      </div>
    </div>
  )
}