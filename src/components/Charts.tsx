import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SeriesPoint } from '@/domain/portfolio'
import { formatMoney } from '@/domain/currency'
import { cn } from '@/lib/cn'

export interface DonutSlice {
  name: string
  value: number
  color: string
}

export function AllocationDonut({
  data,
  baseCurrency,
  size = 168,
}: {
  data: DonutSlice[]
  baseCurrency: string
  size?: number
}) {
  const slices = data.map((item) => ({
    name: item.name,
    value: Math.max(item.value, 0),
    color: item.color,
  }))

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            innerRadius="66%"
            outerRadius="100%"
            paddingAngle={2}
            stroke="none"
          >
            {slices.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatMoney(value, baseCurrency)}
            contentStyle={{
              borderRadius: 12,
              border: 'none',
              fontSize: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function NetWorthChart({
  points,
  baseCurrency,
  height = 180,
  color = '#6366f1',
  showAxis = true,
}: {
  points: SeriesPoint[]
  baseCurrency: string
  height?: number
  color?: string
  showAxis?: boolean
}) {
  const data = points.map((p) => ({ date: p.date, net: p.net }))
  const gradientId = `net-grad-${color.replace('#', '')}`

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showAxis && (
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tickFormatter={(d: string) => d.slice(5)}
            />
          )}
          {showAxis && (
            <YAxis
              hide
              domain={['dataMin', 'dataMax']}
            />
          )}
          <Tooltip
            formatter={(value: number) => formatMoney(value, baseCurrency)}
            labelFormatter={(label: string) => label}
            contentStyle={{
              borderRadius: 12,
              border: 'none',
              fontSize: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          />
          <Area
            type="monotone"
            dataKey="net"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MiniTrend({
  points,
  positive = true,
}: {
  points: SeriesPoint[]
  positive?: boolean
}) {
  const data = points.map((p) => ({ date: p.date, net: p.net }))
  const color = positive ? '#10b981' : '#f43f5e'
  return (
    <div className={cn('h-8 w-20')}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <Area type="monotone" dataKey="net" stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
