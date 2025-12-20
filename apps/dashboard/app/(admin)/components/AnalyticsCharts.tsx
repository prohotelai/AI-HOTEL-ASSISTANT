"use client"

import { useMemo } from 'react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'

export type TrendPoint = {
  label: string
  value: number
}

export type BreakdownPoint = {
  label: string
  value: number
}

type TrendChartProps = {
  data: TrendPoint[]
  ariaLabel?: string
}

export function AnalyticsTrendChart({ data, ariaLabel = 'Trend chart' }: TrendChartProps) {
  const chartData = useMemo(
    () => data.map((point) => ({ month: point.label, value: point.value })),
    [data]
  )

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} aria-label={ariaLabel} role="img">
        <XAxis dataKey="month" stroke="#CBD5F5" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis stroke="#CBD5F5" tickLine={false} axisLine={false} fontSize={12} width={48} />
        <Tooltip
          cursor={{ stroke: '#3B82F6', strokeWidth: 1 }}
          contentStyle={{ background: 'rgba(15,23,42,0.9)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <Line type="monotone" dataKey="value" stroke="#60A5FA" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

const PIE_COLORS = ['#60A5FA', '#A855F7', '#34D399', '#FBBF24', '#F87171']

type PieChartProps = {
  data: BreakdownPoint[]
  ariaLabel?: string
}

export function AnalyticsPieChart({ data, ariaLabel = 'Breakdown chart' }: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart aria-label={ariaLabel} role="img">
        <Tooltip
          contentStyle={{ background: 'rgba(15,23,42,0.9)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={4}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}

type BarChartProps = {
  data: BreakdownPoint[]
  ariaLabel?: string
}

export function AnalyticsBarChart({ data, ariaLabel = 'Bar chart' }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} aria-label={ariaLabel} role="img">
        <XAxis dataKey="label" stroke="#CBD5F5" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis stroke="#CBD5F5" tickLine={false} axisLine={false} fontSize={12} width={48} />
        <Tooltip
          contentStyle={{ background: 'rgba(15,23,42,0.9)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <Legend wrapperStyle={{ color: '#CBD5F5', fontSize: 12 }} />
        <Bar dataKey="value" fill="#38BDF8" radius={[12, 12, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
