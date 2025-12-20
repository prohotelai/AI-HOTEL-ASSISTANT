'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { MetricCard } from '@/components/pms/DashboardComponents'

// Revenue Analytics
export interface RevenueData {
  date: string
  revenue: number
  bookings: number
  avgRate: number
}

export function RevenueChart({ data }: { data: RevenueData[] }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => `$${value}`} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#3B82F6"
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Occupancy Rate Chart
export interface OccupancyData {
  date: string
  occupied: number
  available: number
  blocked: number
}

export function OccupancyChart({ data }: { data: OccupancyData[] }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Occupancy Trends</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="occupied" stackId="a" fill="#10B981" />
          <Bar dataKey="available" stackId="a" fill="#93C5FD" />
          <Bar dataKey="blocked" stackId="a" fill="#EF4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Housekeeping Productivity
export interface HousekeepingData {
  date: string
  tasksCompleted: number
  tasksAssigned: number
  avgTime: number
}

export function HousekeepingChart({ data }: { data: HousekeepingData[] }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Housekeeping Productivity</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="tasksCompleted" stroke="#10B981" />
          <Line yAxisId="left" type="monotone" dataKey="tasksAssigned" stroke="#F59E0B" />
          <Line yAxisId="right" type="monotone" dataKey="avgTime" stroke="#8B5CF6" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Work Order KPIs
export interface WorkOrderData {
  status: string
  count: number
  avgTime: number
}

export function WorkOrderChart({ data }: { data: WorkOrderData[] }) {
  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6']

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Order Status Distribution</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, count }) => `${name}: ${count}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Guest Analytics
export interface GuestData {
  source: string
  count: number
  revenue: number
  satisfaction: number
}

export function GuestAnalyticsChart({ data }: { data: GuestData[] }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Guest Analytics by Source</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="source" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="count" fill="#3B82F6" name="Bookings" />
          <Bar yAxisId="right" dataKey="revenue" fill="#10B981" name="Revenue ($)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Booking Sources Pie
export interface BookingSourceData {
  source: string
  count: number
  percentage: number
}

export function BookingSourceChart({ data }: { data: BookingSourceData[] }) {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Bookings by Source</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ source, percentage }) => `${source}: ${percentage}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name, props) => [value, props.payload.source]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Analytics Summary Cards
export interface AnalyticsSummary {
  totalRevenue: number
  avgOccupancy: number
  taskCompletionRate: number
  avgStayDuration: number
  guestSatisfaction: number
  bookingsThisMonth: number
}

export function AnalyticsSummary({ data }: { data: AnalyticsSummary }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <MetricCard
        title="Total Revenue"
        value={`$${data.totalRevenue.toLocaleString()}`}
        icon="💰"
        color="green"
        trend="up"
      />
      <MetricCard
        title="Avg Occupancy"
        value={`${data.avgOccupancy}%`}
        icon="🏨"
        color="blue"
      />
      <MetricCard
        title="Task Completion"
        value={`${data.taskCompletionRate}%`}
        icon="✅"
        color="green"
      />
      <MetricCard
        title="Avg Stay"
        value={`${data.avgStayDuration} nights`}
        icon="🌙"
        color="purple"
      />
      <MetricCard
        title="Guest Satisfaction"
        value={`${data.guestSatisfaction}/5`}
        icon="⭐"
        color="amber"
      />
      <MetricCard
        title="Bookings (Month)"
        value={data.bookingsThisMonth}
        icon="📅"
        color="blue"
      />
    </div>
  )
}

// Filterable Analytics Dashboard
interface AnalyticsFilters {
  dateRange: 'week' | 'month' | 'quarter' | 'year'
  roomType?: string
  status?: string
}

export function AnalyticsDashboard() {
  const [filters, setFilters] = useState<AnalyticsFilters>({ dateRange: 'month' })
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/analytics?dateRange=${filters.dateRange}`)
        // const data = await response.json()
        // setData(data)

        // Mock data for now
        setData({
          revenueData: [
            { date: 'Mon', revenue: 4200, bookings: 12, avgRate: 120 },
            { date: 'Tue', revenue: 3800, bookings: 10, avgRate: 118 },
            { date: 'Wed', revenue: 5100, bookings: 14, avgRate: 125 },
            { date: 'Thu', revenue: 4900, bookings: 13, avgRate: 123 },
            { date: 'Fri', revenue: 5800, bookings: 16, avgRate: 128 },
            { date: 'Sat', revenue: 6200, bookings: 18, avgRate: 132 },
            { date: 'Sun', revenue: 5500, bookings: 15, avgRate: 129 }
          ],
          summary: {
            totalRevenue: 41600,
            avgOccupancy: 78.5,
            taskCompletionRate: 94,
            avgStayDuration: 3.2,
            guestSatisfaction: 4.6,
            bookingsThisMonth: 256
          }
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [filters])

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading analytics...</div>
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-600">No data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setFilters({ ...filters, dateRange: range })}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              filters.dateRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-white border text-gray-700 hover:bg-gray-50'
            }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <AnalyticsSummary data={data.summary} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={data.revenueData} />
        <OccupancyChart
          data={[
            { date: 'Mon', occupied: 94, available: 20, blocked: 6 },
            { date: 'Tue', occupied: 92, available: 22, blocked: 6 },
            { date: 'Wed', occupied: 98, available: 18, blocked: 4 },
            { date: 'Thu', occupied: 96, available: 20, blocked: 4 },
            { date: 'Fri', occupied: 108, available: 8, blocked: 4 },
            { date: 'Sat', occupied: 110, available: 6, blocked: 4 },
            { date: 'Sun', occupied: 102, available: 14, blocked: 4 }
          ]}
        />
        <HousekeepingChart
          data={[
            { date: 'Mon', tasksCompleted: 34, tasksAssigned: 36, avgTime: 45 },
            { date: 'Tue', tasksCompleted: 32, tasksAssigned: 35, avgTime: 43 },
            { date: 'Wed', tasksCompleted: 38, tasksAssigned: 40, avgTime: 44 },
            { date: 'Thu', tasksCompleted: 36, tasksAssigned: 38, avgTime: 46 },
            { date: 'Fri', tasksCompleted: 40, tasksAssigned: 42, avgTime: 45 },
            { date: 'Sat', tasksCompleted: 42, tasksAssigned: 44, avgTime: 47 },
            { date: 'Sun', tasksCompleted: 38, tasksAssigned: 39, avgTime: 45 }
          ]}
        />
        <WorkOrderChart
          data={[
            { status: 'Completed', count: 156, avgTime: 24 },
            { status: 'In Progress', count: 23, avgTime: 8 },
            { status: 'Pending', count: 12, avgTime: 0 }
          ]}
        />
      </div>
    </div>
  )
}
