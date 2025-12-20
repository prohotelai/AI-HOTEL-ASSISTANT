# Dashboard Navigation Guide

## Main Dashboard Overview

The dashboard is your central hub for hotel operations. It provides real-time insights and quick access to all platform features.

### Dashboard Layout

```
┌─────────────────────────────────────────────────┐
│  Header: Logo | Hotel Name | User Menu         │
├─────────────────────────────────────────────────┤
│  Sidebar Navigation                             │
│  - Dashboard (Home)                             │
│  - Tickets                                       │
│  - Knowledge Base                               │
│  - PMS                                          │
│  - Staff                                        │
│  - Analytics                                    │
│  - Settings                                     │
├─────────────────────────────────────────────────┤
│  Main Content Area                              │
│  ┌──────────┬──────────┬──────────┐           │
│  │ Metric 1 │ Metric 2 │ Metric 3 │           │
│  └──────────┴──────────┴──────────┘           │
│                                                 │
│  Recent Activity                                │
│  Quick Actions                                  │
└─────────────────────────────────────────────────┘
```

## Navigation Paths

### For Guests (Level 0)
**Available Routes**:
- `/` - Landing page
- `/chat` - Guest chat interface
- `/login` - Authentication

**Restricted**: Cannot access dashboard, settings, or admin features

### For Staff (Level 1)
**Available Routes**:
- `/dashboard` - Main dashboard (redirected from /)
- `/dashboard/tickets` - View and manage tickets
- `/dashboard/tickets/[id]` - Ticket details
- `/knowledge-base` - Search documentation
- `/profile` - Personal profile

**Restricted**: Settings, staff management, PMS config

### For Supervisors (Level 2)
**Includes Staff Routes Plus**:
- `/dashboard/staff` - View team members
- `/dashboard/reports` - Basic reporting
- `/dashboard/analytics` - Department analytics

**Restricted**: Hotel settings, PMS configuration

### For Managers (Level 3)
**Includes Supervisor Routes Plus**:
- `/dashboard/settings/hotel` - Hotel profile
- `/dashboard/pms` - PMS integration dashboard
- `/dashboard/staff/invite` - Invite team members
- `/dashboard/analytics/advanced` - Full analytics

**Restricted**: System administration, billing

### For Admin/Owner (Level 4)
**Full Access Including**:
- `/dashboard/settings` - All settings
- `/dashboard/billing` - Subscription management
- `/dashboard/admin` - System administration
- `/dashboard/audit-logs` - Complete audit trail

## Key Dashboard Widgets

### 1. Ticket Overview Card
**Location**: Top of main dashboard
**Shows**:
- Open tickets count
- Average response time
- Pending assignments
- High priority alerts

**Actions**:
- Click to view all tickets
- Quick create new ticket
- Filter by status

### 2. Recent Activity Feed
**Location**: Center column
**Shows**:
- Latest ticket updates
- Staff assignments
- Guest check-ins/outs
- System notifications

**Actions**:
- Click item for details
- Filter by activity type
- Mark as read

### 3. Performance Metrics
**Location**: Top metrics row
**Shows**:
- Guest satisfaction score
- Average resolution time
- Staff utilization
- Knowledge base usage

**Actions**:
- Click for detailed view
- Export reports
- Set up alerts

### 4. Quick Actions Panel
**Location**: Right sidebar
**Shows**:
- Create ticket
- Add knowledge base document
- Invite staff member
- View reports
- Settings shortcut

## Navigation Tips

### Keyboard Shortcuts
- `Ctrl/Cmd + K` - Quick search
- `Ctrl/Cmd + N` - New ticket
- `Ctrl/Cmd + /` - Toggle sidebar
- `Esc` - Close modals
- `?` - Show all shortcuts

### Mobile Navigation
- Hamburger menu for sidebar
- Bottom navigation bar
- Swipe gestures for cards
- Pull-to-refresh

### Search Functionality
**Global Search (Header)**:
- Type to search tickets, guests, documents
- Filter by type, date, status
- Quick actions displayed
- Recent searches saved

### Breadcrumb Navigation
Shows current location path:
`Dashboard > Tickets > #12345 > Edit`

Click any segment to navigate back.

## Common Navigation Scenarios

### Creating a Ticket
1. Click "New Ticket" quick action OR
2. Navigate to `/dashboard/tickets`
3. Click "Create Ticket" button
4. Fill form and submit

### Searching Knowledge Base
1. Click Knowledge Base in sidebar
2. Use search bar or browse categories
3. Click document to view
4. Use AI assistant for specific questions

### Managing Staff
1. Navigate to `/dashboard/staff`
2. View all team members
3. Click "Invite" to add new member
4. Assign roles and permissions

### Viewing Analytics
1. Navigate to `/dashboard/analytics`
2. Select date range
3. Choose report type
4. Export or share

## Responsive Design

### Desktop (> 1024px)
- Full sidebar visible
- Multi-column layout
- All widgets shown

### Tablet (768px - 1024px)
- Collapsible sidebar
- Two-column layout
- Priority widgets

### Mobile (< 768px)
- Bottom navigation
- Single column
- Swipeable panels
- Compact widgets

## Page Load Optimization

### Fast Navigation
- Next.js App Router prefetching
- Optimistic UI updates
- Cached data where appropriate
- Progressive loading

### Offline Capability
- View cached tickets
- Draft creation offline
- Auto-sync when online

## Error Handling

### Navigation Errors
- **404**: Page not found - Redirect to dashboard
- **403**: Unauthorized - Show permission denied
- **401**: Not authenticated - Redirect to login

### Loading States
- Skeleton screens while loading
- Progress indicators for actions
- Timeout handling (30s)

## Customization

### User Preferences
- Default landing page
- Sidebar collapse state
- Notification settings
- Theme (light/dark)
- Language preference

**Saved Automatically**: Preferences persist across sessions

## Accessibility

### Screen Readers
- Proper ARIA labels
- Skip to content links
- Semantic HTML structure

### Keyboard Navigation
- Tab navigation support
- Focus indicators
- No keyboard traps

### Color Contrast
- WCAG AA compliance
- High contrast mode
- Color-blind friendly

## Troubleshooting Navigation Issues

### Page Won't Load
1. Check internet connection
2. Clear browser cache
3. Try different browser
4. Contact support if persistent

### Unauthorized Access
1. Verify your role/permissions
2. Log out and log back in
3. Contact manager for access
4. Check with admin if needed

### Missing Features
1. Confirm your role level
2. Check if feature enabled for hotel
3. Verify subscription tier
4. Contact support

## Best Practices

1. **Use Breadcrumbs**: Always know where you are
2. **Bookmark Frequently Used Pages**: Save time
3. **Learn Keyboard Shortcuts**: Boost productivity
4. **Customize Layout**: Arrange widgets for your workflow
5. **Use Search**: Faster than browsing
6. **Check Notifications**: Stay updated
7. **Update Profile**: Keep information current
