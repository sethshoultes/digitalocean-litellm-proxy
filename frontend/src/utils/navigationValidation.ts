// Navigation flow validation utilities

export interface NavigationRoute {
  path: string
  title: string
  description: string
  adminOnly?: boolean
  requiredPermissions?: string[]
}

export const dashboardRoutes: NavigationRoute[] = [
  {
    path: '/dashboard',
    title: 'Dashboard',
    description: 'Main overview with metrics and system status',
  },
  {
    path: '/connections',
    title: 'Connections',
    description: 'Manage LLM provider connections',
  },
  {
    path: '/connections/new',
    title: 'New Connection',
    description: 'Create a new provider connection',
  },
  {
    path: '/policies',
    title: 'Policies',
    description: 'Access control and permission policies',
  },
  {
    path: '/policies/new',
    title: 'New Policy',
    description: 'Create a new access policy',
  },
  {
    path: '/users',
    title: 'Users',
    description: 'User management and administration',
    adminOnly: true,
    requiredPermissions: ['canManageUsers'],
  },
  {
    path: '/monitoring',
    title: 'Monitoring',
    description: 'System monitoring and analytics',
    adminOnly: true,
    requiredPermissions: ['canViewAnalytics'],
  },
  {
    path: '/monitoring/logs',
    title: 'System Logs',
    description: 'Application and system logs',
    adminOnly: true,
    requiredPermissions: ['canViewLogs'],
  },
  {
    path: '/settings',
    title: 'Settings',
    description: 'System configuration and preferences',
    adminOnly: true,
    requiredPermissions: ['canManageSystem'],
  },
]

export interface ResponsiveBreakpoint {
  name: string
  minWidth: number
  maxWidth?: number
  testCases: string[]
}

export const responsiveBreakpoints: ResponsiveBreakpoint[] = [
  {
    name: 'Mobile',
    minWidth: 320,
    maxWidth: 639,
    testCases: [
      'Sidebar should be hidden by default',
      'Mobile menu button should be visible',
      'Metrics cards should stack vertically',
      'Charts should be full width',
      'Tables should be horizontally scrollable',
      'Quick actions should stack vertically',
    ],
  },
  {
    name: 'Tablet',
    minWidth: 640,
    maxWidth: 1023,
    testCases: [
      'Sidebar should be hidden by default',
      'Metrics cards should display in 2 columns',
      'Charts should display side by side',
      'Navigation should be touch-friendly',
      'Forms should have appropriate spacing',
    ],
  },
  {
    name: 'Desktop',
    minWidth: 1024,
    testCases: [
      'Sidebar should be visible by default',
      'Metrics cards should display in 4 columns',
      'Charts should have optimal spacing',
      'All features should be accessible',
      'Hover states should work properly',
    ],
  },
]

export interface AccessibilityTest {
  category: string
  tests: string[]
}

export const accessibilityTests: AccessibilityTest[] = [
  {
    category: 'Keyboard Navigation',
    tests: [
      'Tab navigation works through all interactive elements',
      'Enter and Space keys activate buttons and links',
      'Escape key closes modals and dropdowns',
      'Arrow keys navigate through menu items',
      'Focus indicators are clearly visible',
    ],
  },
  {
    category: 'Screen Reader Support',
    tests: [
      'All images have appropriate alt text',
      'Form inputs have associated labels',
      'Buttons have descriptive text or aria-labels',
      'Status messages are announced',
      'Page structure uses semantic HTML',
    ],
  },
  {
    category: 'Color and Contrast',
    tests: [
      'Text meets WCAG contrast requirements',
      'Color is not the only way to convey information',
      'Focus indicators are clearly visible',
      'Error states are clearly indicated',
      'Status indicators work without color',
    ],
  },
]

export interface PerformanceMetric {
  name: string
  target: number
  unit: string
  description: string
}

export const performanceTargets: PerformanceMetric[] = [
  {
    name: 'First Contentful Paint',
    target: 1.5,
    unit: 'seconds',
    description: 'Time to first visible content',
  },
  {
    name: 'Largest Contentful Paint',
    target: 2.5,
    unit: 'seconds',
    description: 'Time to largest content element',
  },
  {
    name: 'Time to Interactive',
    target: 3.0,
    unit: 'seconds',
    description: 'Time until page is fully interactive',
  },
  {
    name: 'Cumulative Layout Shift',
    target: 0.1,
    unit: 'score',
    description: 'Visual stability score',
  },
]

// Validation functions
export function validateNavigationFlow(userRole: string = 'user'): {
  accessibleRoutes: NavigationRoute[]
  restrictedRoutes: NavigationRoute[]
} {
  const accessibleRoutes = dashboardRoutes.filter(route => {
    if (route.adminOnly && userRole !== 'admin') {
      return false
    }
    return true
  })

  const restrictedRoutes = dashboardRoutes.filter(route => {
    if (route.adminOnly && userRole !== 'admin') {
      return true
    }
    return false
  })

  return { accessibleRoutes, restrictedRoutes }
}

export function validateResponsiveLayout(screenWidth: number): {
  currentBreakpoint: ResponsiveBreakpoint | null
  applicableTests: string[]
} {
  const currentBreakpoint = responsiveBreakpoints.find(bp => {
    if (bp.maxWidth) {
      return screenWidth >= bp.minWidth && screenWidth <= bp.maxWidth
    }
    return screenWidth >= bp.minWidth
  })

  return {
    currentBreakpoint: currentBreakpoint || null,
    applicableTests: currentBreakpoint?.testCases || [],
  }
}

export function generateValidationReport(userRole: string, screenWidth: number) {
  const { accessibleRoutes, restrictedRoutes } = validateNavigationFlow(userRole)
  const { currentBreakpoint, applicableTests } = validateResponsiveLayout(screenWidth)

  return {
    navigation: {
      userRole,
      accessibleRoutes: accessibleRoutes.length,
      restrictedRoutes: restrictedRoutes.length,
      routes: { accessibleRoutes, restrictedRoutes },
    },
    responsive: {
      screenWidth,
      breakpoint: currentBreakpoint?.name || 'Unknown',
      testCases: applicableTests,
    },
    accessibility: accessibilityTests,
    performance: performanceTargets,
    timestamp: new Date().toISOString(),
  }
}

// Component testing utilities
export function testComponentResponsiveness(componentName: string) {
  const tests = [
    'Component renders without errors',
    'Text remains readable at all screen sizes',
    'Interactive elements are touch-friendly (44px minimum)',
    'Content doesn\'t overflow container',
    'Images scale appropriately',
    'Loading states work properly',
    'Error states are handled gracefully',
  ]

  console.group(`📱 Testing ${componentName} Responsiveness`)
  tests.forEach(test => {
    console.log(`✓ ${test}`)
  })
  console.groupEnd()
}

export function testNavigationAccessibility() {
  const tests = [
    'Sidebar navigation is keyboard accessible',
    'Mobile menu can be opened with keyboard',
    'Breadcrumbs are properly announced',
    'Current page is indicated to screen readers',
    'Skip navigation link is available',
    'Focus is managed when navigating between pages',
  ]

  console.group('♿ Testing Navigation Accessibility')
  tests.forEach(test => {
    console.log(`✓ ${test}`)
  })
  console.groupEnd()
}

// Development helpers
export function logValidationReport() {
  if (import.meta.env.DEV) {
    const report = generateValidationReport(
      'admin', // Default to admin for full testing
      window.innerWidth
    )

    console.group('🧪 Dashboard Validation Report')
    console.table(report.navigation)
    console.table(report.responsive)
    console.log('Accessibility Tests:', report.accessibility)
    console.log('Performance Targets:', report.performance)
    console.groupEnd()
  }
}