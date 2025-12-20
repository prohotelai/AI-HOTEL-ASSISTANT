# Phase 5 UI Components - Quick Reference

## Component Library Imports

### Job Monitoring Components
```typescript
import {
  JobStatusBadge,
  JobExecutionCard,
  JobMonitoringList,
  JobStatistics,
  JobTriggerButton
} from '@/components/pms/JobMonitoring'
```

### Dashboard Components
```typescript
import {
  MetricCard,
  StatusSummary,
  DataTable,
  Alert,
  LoadingSkeleton
} from '@/components/pms/DashboardComponents'
```

### Navigation
```typescript
import DashboardNavigation from '@/components/pms/DashboardNavigation'
```

## Component Quick Reference

### MetricCard
```typescript
<MetricCard
  title="Occupancy Rate"
  value="78.5%"
  icon="🏨"
  color="blue"
  trend="up"
  subtitle="Last 30 days"
/>
```

**Props**:
- `title`: string - Card title
- `value`: number | string - Main value to display
- `icon`: string - Emoji icon
- `color`: 'blue' | 'green' | 'red' | 'amber' | 'purple'
- `trend?`: 'up' | 'down' | 'stable' - Optional trend indicator
- `subtitle?`: string - Optional subtitle text

### StatusSummary
```typescript
<StatusSummary
  status="operational"
  message="All systems operational, occupancy at 78%"
/>
```

**Props**:
- `status`: 'operational' | 'warning' | 'error'
- `message`: string - Status message

### JobStatistics
```typescript
<JobStatistics
  totalJobs={156}
  completedJobs={152}
  failedJobs={4}
  successRate={97.4}
/>
```

### JobMonitoringList
```typescript
<JobMonitoringList
  jobs={jobs}
  onRefresh={fetchJobs}
  isLoading={loading}
/>
```

### Alert
```typescript
<Alert
  type="error"
  title="Error"
  message="Failed to fetch data"
  onClose={() => setError(null)}
/>
```

**Types**: 'info' | 'success' | 'warning' | 'error'

### JobTriggerButton
```typescript
<JobTriggerButton
  jobName="daily-housekeeping"
  label="Start Housekeeping Round"
  onSuccess={() => alert('Job triggered!')}
/>
```

## Dashboard Routes

| Route | Component | Purpose | Role |
|-------|-----------|---------|------|
| `/dashboard/admin/pms` | Admin Dashboard | Job monitoring | ADMIN |
| `/dashboard/staff/tasks` | Staff Portal | Task assignments | STAFF |
| `/dashboard/guest/bookings` | Guest Portal | Booking management | GUEST |
| `/dashboard/analytics` | Analytics | PMS metrics | ADMIN |
| `/dashboard/admin/settings` | Configuration | Hotel settings | ADMIN |

## Common Patterns

### Fetch with Auto-refresh
```typescript
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

const fetchData = async () => {
  try {
    const res = await fetch('/api/endpoint')
    const json = await res.json()
    setData(json)
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}

useEffect(() => {
  fetchData()
  const interval = setInterval(fetchData, 30000)
  return () => clearInterval(interval)
}, [])
```

### Error Handling
```typescript
{error && (
  <Alert 
    type="error" 
    title="Error" 
    message={error}
    onClose={() => setError(null)} 
  />
)}
```

### Loading State
```typescript
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Loading...</p>
    </div>
  )
}
```

## Styling Classes Quick Reference

### Grid Layouts
```typescript
// 2 columns mobile, 4 desktop
className="grid grid-cols-2 md:grid-cols-4 gap-4"

// 3 columns responsive
className="grid grid-cols-1 md:grid-cols-3 gap-6"
```

### Colors (Tailwind + Custom)
```typescript
// Background
bg-blue-100, bg-green-100, bg-red-100, bg-amber-100, bg-purple-100
bg-blue-600, bg-green-600, bg-red-600, bg-amber-600, bg-purple-600

// Text
text-blue-800, text-green-800, text-red-800, text-amber-800
text-blue-600, text-green-600, text-red-600, text-amber-600

// Borders
border-blue-200, border-green-200, border-red-200
```

### Common Components
```typescript
// Button
className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium"

// Card
className="bg-white rounded-lg shadow-sm border p-6"

// Badge
className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"

// Input
className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
```

## API Endpoints Used

### Job Management
```
GET  /api/jobs                    - List executions
POST /api/jobs/trigger/[jobName]  - Trigger job
GET  /api/jobs/[jobId]            - Get execution details
```

### PMS Data
```
GET  /api/pms/bookings            - Fetch guest bookings
GET  /api/pms/housekeeping        - Fetch housekeeping tasks
GET  /api/pms/analytics           - Fetch analytics (future)
```

## TypeScript Interfaces

### JobExecution
```typescript
interface JobExecution {
  id: string
  jobName: string
  jobType: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  result?: any
  error?: string
  startedAt: Date
  completedAt?: Date
}
```

### HousekeepingTask
```typescript
interface HousekeepingTask {
  id: string
  roomNumber: string
  taskType: string
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  instructions: string
  assignedStaff?: string
}
```

### GuestBooking
```typescript
interface GuestBooking {
  id: string
  bookingNumber: string
  roomNumber: string
  roomType: string
  checkInDate: string
  checkOutDate: string
  numberOfGuests: number
  totalPrice: number
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED'
}
```

## Color Coding Reference

### Job Status Colors
- PENDING: Gray (#6B7280)
- RUNNING: Blue (#3B82F6)
- COMPLETED: Green (#10B981)
- FAILED: Red (#EF4444)

### Priority Colors
- URGENT: Red (#EF4444)
- HIGH: Orange/Amber (#F59E0B)
- NORMAL: Yellow (#FBBF24)
- LOW: Green (#10B981)

### Booking Status Colors
- CONFIRMED: Blue (#3B82F6)
- CHECKED_IN: Green (#10B981)
- CHECKED_OUT: Gray (#6B7280)
- CANCELLED: Red (#EF4444)

### System Status
- Operational: Green (#10B981)
- Warning: Amber (#F59E0B)
- Error: Red (#EF4444)

## Responsive Design Notes

- **Mobile First**: Design optimizes for mobile, enhances for desktop
- **Breakpoints**: `md` (768px), `lg` (1024px)
- **Grid System**: Typically 1 col mobile → 2-3 col tablet → 3-4 col desktop
- **Navigation**: Hidden on mobile, full on desktop (expandable menu ready)

## Future Enhancement Opportunities

1. **Charting**: Add Recharts for Analytics Dashboard
2. **Real-time**: WebSocket for live job updates
3. **Exports**: PDF/CSV export for reports
4. **Notifications**: Toast notifications or notification center
5. **Accessibility**: ARIA labels, keyboard navigation
6. **Mobile**: Drawer/hamburger menu for mobile nav
7. **Dark Mode**: Tailwind dark mode support
8. **Filters**: Advanced filtering for data tables
9. **Bulk Actions**: Multi-select for task management
10. **Theming**: Customizable color schemes per hotel

## Testing Checklist

- [ ] All 5 dashboard pages load without errors
- [ ] Navigation between dashboards works
- [ ] API data fetching succeeds/shows proper errors
- [ ] 30-second auto-refresh triggers data updates
- [ ] Forms save correctly (settings page)
- [ ] Filters work (staff tasks page)
- [ ] Modal/expandable details work (guest bookings)
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Error messages display properly
- [ ] Loading states show during fetch

## Deployment Notes

- All components use `'use client'` directive ✓
- No SSR dependencies ✓
- Environment variables handled via `.env.local` ✓
- TypeScript strict mode compatible ✓
- No external UI library dependencies ✓
- Tailwind CSS configured ✓
- Ready for production deployment ✓
