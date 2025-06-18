import { clsx } from 'clsx'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  ClockIcon 
} from '@heroicons/react/24/solid'

export type StatusType = 'healthy' | 'warning' | 'error' | 'unknown'

interface StatusIndicatorProps {
  status: StatusType
  label: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

const statusConfig = {
  healthy: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    dotColor: 'bg-green-500',
    icon: CheckCircleIcon,
  },
  warning: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    dotColor: 'bg-yellow-500',
    icon: ExclamationTriangleIcon,
  },
  error: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    dotColor: 'bg-red-500',
    icon: XCircleIcon,
  },
  unknown: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    dotColor: 'bg-gray-500',
    icon: ClockIcon,
  },
}

const sizeConfig = {
  sm: {
    dot: 'h-2 w-2',
    icon: 'h-4 w-4',
    text: 'text-sm',
    description: 'text-xs',
  },
  md: {
    dot: 'h-3 w-3',
    icon: 'h-5 w-5',
    text: 'text-base',
    description: 'text-sm',
  },
  lg: {
    dot: 'h-4 w-4',
    icon: 'h-6 w-6',
    text: 'text-lg',
    description: 'text-base',
  },
}

export function StatusIndicator({
  status,
  label,
  description,
  size = 'md',
  showIcon = false,
}: StatusIndicatorProps) {
  const config = statusConfig[status]
  const sizeClass = sizeConfig[size]
  const Icon = config.icon

  return (
    <div className="flex items-center space-x-2">
      {showIcon ? (
        <div className={clsx('flex-shrink-0 rounded-full p-1', config.bgColor)}>
          <Icon className={clsx(sizeClass.icon, config.color)} />
        </div>
      ) : (
        <div className={clsx('flex-shrink-0 rounded-full', sizeClass.dot, config.dotColor)} />
      )}
      <div className="flex-1 min-w-0">
        <p className={clsx('font-medium truncate', sizeClass.text, config.color)}>
          {label}
        </p>
        {description && (
          <p className={clsx('text-gray-500 truncate', sizeClass.description)}>
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

// Preset components for common use cases
export function SystemHealthIndicator({ 
  status, 
  label, 
  responseTime 
}: { 
  status: StatusType
  label: string
  responseTime?: number 
}) {
  const description = responseTime 
    ? `${responseTime}ms response time`
    : undefined

  return (
    <StatusIndicator
      status={status}
      label={label}
      description={description}
      size="md"
      showIcon={false}
    />
  )
}

export function ConnectionStatusIndicator({
  isActive,
  providerName,
  lastChecked,
}: {
  isActive: boolean
  providerName: string
  lastChecked?: Date
}) {
  const status: StatusType = isActive ? 'healthy' : 'error'
  const description = lastChecked
    ? `Last checked: ${lastChecked.toLocaleTimeString()}`
    : 'Never checked'

  return (
    <StatusIndicator
      status={status}
      label={providerName}
      description={description}
      size="sm"
      showIcon={true}
    />
  )
}