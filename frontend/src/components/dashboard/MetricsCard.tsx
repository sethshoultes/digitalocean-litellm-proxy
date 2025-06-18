import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'

interface MetricsCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  href?: string
  trend?: {
    value: number
    label: string
    type: 'increase' | 'decrease'
  }
  subtitle?: string
  loading?: boolean
}

export function MetricsCard({
  title,
  value,
  icon: Icon,
  iconColor,
  href,
  trend,
  subtitle,
  loading = false,
}: MetricsCardProps) {
  const cardContent = (
    <div className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Icon */}
      <dt>
        <div className={clsx('absolute rounded-md p-3', iconColor)}>
          <Icon className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
        <p className="ml-16 text-sm font-medium text-gray-500 truncate">
          {title}
        </p>
      </dt>
      
      {/* Value */}
      <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
        ) : (
          <>
            <p className="text-2xl font-semibold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {trend && (
              <div className="ml-3 flex items-center">
                {trend.type === 'increase' ? (
                  <ArrowUpIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={clsx(
                    'text-sm font-medium ml-1',
                    trend.type === 'increase' ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend.value}%
                </span>
                <span className="text-sm text-gray-500 ml-1">{trend.label}</span>
              </div>
            )}
          </>
        )}
      </dd>
      
      {/* Subtitle */}
      {subtitle && (
        <div className="absolute bottom-2 left-4 right-4">
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        </div>
      )}
      
      {/* Link indicator */}
      {href && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link to={href} className="group block">
        {cardContent}
      </Link>
    )
  }

  return cardContent
}