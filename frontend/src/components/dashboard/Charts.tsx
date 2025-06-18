import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// Color palette for charts
const COLORS = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06B6D4',
  gray: '#6B7280',
}

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.success,
  COLORS.warning,
  COLORS.error,
  COLORS.info,
]

// Usage over time data
export interface UsageData {
  timestamp: string
  requests: number
  tokens: number
  cost: number
  errors: number
}

// Provider usage data
export interface ProviderData {
  name: string
  requests: number
  cost: number
  color?: string
}

// Response time data
export interface ResponseTimeData {
  timestamp: string
  average: number
  p95: number
  p99: number
}

interface UsageLineChartProps {
  data: UsageData[]
  height?: number
  loading?: boolean
}

export function UsageLineChart({ data, height = 300, loading = false }: UsageLineChartProps) {
  if (loading) {
    return (
      <div className="animate-pulse" style={{ height }}>
        <div className="h-full bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="timestamp" 
          tick={{ fontSize: 12 }}
          stroke="#6B7280"
        />
        <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="requests"
          stroke={COLORS.primary}
          strokeWidth={2}
          dot={{ r: 4 }}
          name="Requests"
        />
        <Line
          type="monotone"
          dataKey="tokens"
          stroke={COLORS.secondary}
          strokeWidth={2}
          dot={{ r: 4 }}
          name="Tokens"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface CostAreaChartProps {
  data: UsageData[]
  height?: number
  loading?: boolean
}

export function CostAreaChart({ data, height = 300, loading = false }: CostAreaChartProps) {
  if (loading) {
    return (
      <div className="animate-pulse" style={{ height }}>
        <div className="h-full bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="timestamp" 
          tick={{ fontSize: 12 }}
          stroke="#6B7280"
        />
        <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
        />
        <Area
          type="monotone"
          dataKey="cost"
          stroke={COLORS.success}
          fill={COLORS.success}
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface ProviderPieChartProps {
  data: ProviderData[]
  height?: number
  loading?: boolean
}

export function ProviderPieChart({ data, height = 300, loading = false }: ProviderPieChartProps) {
  if (loading) {
    return (
      <div className="animate-pulse" style={{ height }}>
        <div className="h-full bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="requests"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} 
            />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number, name: string) => [
            value.toLocaleString(), 
            name === 'requests' ? 'Requests' : name
          ]}
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

interface ResponseTimeChartProps {
  data: ResponseTimeData[]
  height?: number
  loading?: boolean
}

export function ResponseTimeChart({ data, height = 300, loading = false }: ResponseTimeChartProps) {
  if (loading) {
    return (
      <div className="animate-pulse" style={{ height }}>
        <div className="h-full bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="timestamp" 
          tick={{ fontSize: 12 }}
          stroke="#6B7280"
        />
        <YAxis 
          tick={{ fontSize: 12 }} 
          stroke="#6B7280"
          label={{ value: 'ms', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          formatter={(value: number) => [`${value}ms`, '']}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="average"
          stroke={COLORS.primary}
          strokeWidth={2}
          dot={{ r: 3 }}
          name="Average"
        />
        <Line
          type="monotone"
          dataKey="p95"
          stroke={COLORS.warning}
          strokeWidth={2}
          dot={{ r: 3 }}
          name="95th Percentile"
        />
        <Line
          type="monotone"
          dataKey="p99"
          stroke={COLORS.error}
          strokeWidth={2}
          dot={{ r: 3 }}
          name="99th Percentile"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Preset chart components with containers
export function UsageChartCard({ 
  data, 
  title = "Usage Over Time",
  loading = false 
}: { 
  data: UsageData[]
  title?: string
  loading?: boolean 
}) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-5">
          {title}
        </h3>
        <UsageLineChart data={data} loading={loading} />
      </div>
    </div>
  )
}

export function CostChartCard({ 
  data, 
  title = "Cost Analysis",
  loading = false 
}: { 
  data: UsageData[]
  title?: string
  loading?: boolean 
}) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-5">
          {title}
        </h3>
        <CostAreaChart data={data} loading={loading} />
      </div>
    </div>
  )
}

export function ProviderUsageCard({ 
  data, 
  title = "Provider Usage Distribution",
  loading = false 
}: { 
  data: ProviderData[]
  title?: string
  loading?: boolean 
}) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-5">
          {title}
        </h3>
        <ProviderPieChart data={data} loading={loading} />
      </div>
    </div>
  )
}