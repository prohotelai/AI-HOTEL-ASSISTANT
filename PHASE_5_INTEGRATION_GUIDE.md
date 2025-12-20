# Phase 5 Integration Guide - Dashboard Navigation & Layout Setup

## Overview

This guide walks through integrating the Phase 5 UI components into your Next.js application with proper navigation, layout hierarchy, and authentication.

## Step 1: Update Main Dashboard Layout

Update or create `/app/dashboard/layout.tsx`:

```typescript
import { ReactNode } from 'react'
import DashboardNavigation from '@/components/pms/DashboardNavigation'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      {children}
    </div>
  )
}
```

## Step 2: Create Admin Dashboard Layout

Create `/app/dashboard/admin/layout.tsx`:

```typescript
import { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

## Step 3: Create Staff Dashboard Layout

Create `/app/dashboard/staff/layout.tsx`:

```typescript
import { ReactNode } from 'react'

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

## Step 4: Create Guest Dashboard Layout

Create `/app/dashboard/guest/layout.tsx`:

```typescript
import { ReactNode } from 'react'

export default function GuestLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

## Step 5: Create Analytics Dashboard Layout

Create `/app/dashboard/analytics/layout.tsx`:

```typescript
import { ReactNode } from 'react'

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

## Step 6: Add Authentication Middleware (Optional but Recommended)

Create `/lib/auth-middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })

  // Check if user is authenticated
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check role-based access
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/dashboard/admin') && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard/guest/bookings', request.url))
  }

  if (pathname.startsWith('/dashboard/staff') && !['ADMIN', 'STAFF'].includes(token.role)) {
    return NextResponse.redirect(new URL('/dashboard/guest/bookings', request.url))
  }

  if (pathname.startsWith('/dashboard/analytics') && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard/guest/bookings', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

## Step 7: Create Dashboard Home Page

Create or update `/app/dashboard/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { MetricCard } from '@/components/pms/DashboardComponents'

export default function DashboardHome() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    // Redirect based on role
    if (session?.user?.role === 'ADMIN') {
      router.push('/dashboard/admin/pms')
    } else if (session?.user?.role === 'STAFF') {
      router.push('/dashboard/staff/tasks')
    } else {
      router.push('/dashboard/guest/bookings')
    }
  }, [session, status, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-600">Redirecting...</p>
    </div>
  )
}
```

## Step 8: Configure Navigation Routes

Update `DashboardNavigation.tsx` to handle role-based visibility:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface NavItem {
  label: string
  href: string
  icon: string
  roles: string[]
}

const navItems: NavItem[] = [
  { label: 'Admin Dashboard', href: '/dashboard/admin/pms', icon: '📊', roles: ['ADMIN'] },
  { label: 'Staff Tasks', href: '/dashboard/staff/tasks', icon: '✅', roles: ['STAFF', 'ADMIN'] },
  { label: 'My Bookings', href: '/dashboard/guest/bookings', icon: '📅', roles: ['GUEST', 'ADMIN'] },
  { label: 'Analytics', href: '/dashboard/analytics', icon: '📈', roles: ['ADMIN'] },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: '⚙️', roles: ['ADMIN'] }
]

export default function DashboardNavigation() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const visibleItems = navItems.filter(item =>
    session?.user?.role && item.roles.includes(session.user.role)
  )

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏨</span>
            <h1 className="text-xl font-bold text-gray-900">Hotel PMS</h1>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive(item.href)
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="md:hidden flex items-center gap-2">
            <span className="text-sm text-gray-600">{session?.user?.name}</span>
            <button className="text-gray-600 hover:text-gray-900">⚙️</button>
          </div>
        </div>
      </div>
    </nav>
  )
}
```

## Step 9: Add Environment Variables

Update `.env.local`:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Job Configuration
CRON_SECRET=your-cron-secret-here
```

## Step 10: Create Session Extension (for NextAuth)

Update `/types/next-auth.d.ts`:

```typescript
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
    role: 'ADMIN' | 'STAFF' | 'GUEST'
  }

  interface Session {
    user: User
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'ADMIN' | 'STAFF' | 'GUEST'
  }
}
```

## File Structure After Integration

```
/workspaces/AI-HOTEL-ASSISTANT/
├── app/
│   └── dashboard/
│       ├── layout.tsx                    (NEW - Dashboard wrapper)
│       ├── page.tsx                      (UPDATE - Role-based redirect)
│       ├── admin/
│       │   ├── layout.tsx                (NEW)
│       │   ├── pms/
│       │   │   └── page.tsx              (✓ Admin Dashboard)
│       │   └── settings/
│       │       └── page.tsx              (✓ Configuration UI)
│       ├── staff/
│       │   ├── layout.tsx                (NEW)
│       │   └── tasks/
│       │       └── page.tsx              (✓ Staff Portal)
│       ├── guest/
│       │   ├── layout.tsx                (NEW)
│       │   └── bookings/
│       │       └── page.tsx              (✓ Guest Portal)
│       └── analytics/
│           ├── layout.tsx                (NEW)
│           └── page.tsx                  (✓ Analytics Dashboard)
│
├── components/pms/
│   ├── JobMonitoring.tsx                 (✓)
│   ├── DashboardComponents.tsx           (✓)
│   └── DashboardNavigation.tsx           (✓ UPDATE - Add role-based filtering)
│
├── lib/
│   └── auth-middleware.ts                (NEW - Optional)
│
└── types/
    └── next-auth.d.ts                    (UPDATE)
```

## Testing Checklist

After completing integration steps:

- [ ] Dashboard home page redirects based on user role
- [ ] Navigation shows only accessible items for user's role
- [ ] Admin can access `/dashboard/admin/pms`, `/dashboard/analytics`, `/dashboard/admin/settings`
- [ ] Staff can access `/dashboard/staff/tasks`
- [ ] Guest can access `/dashboard/guest/bookings`
- [ ] Unauthenticated users redirected to login
- [ ] 30-second auto-refresh works on all pages
- [ ] Job triggering works from admin dashboard
- [ ] Data fetching shows proper loading/error states
- [ ] Responsive design works on mobile/tablet/desktop

## Common Issues & Solutions

### Issue: "DashboardNavigation is not a function"
**Solution**: Ensure `'use client'` directive at top of DashboardNavigation.tsx

### Issue: "Module not found: @/components/pms"
**Solution**: Verify `@` alias in `tsconfig.json` points to root directory

### Issue: Authentication not working
**Solution**: Ensure NextAuth is properly configured and middleware is active

### Issue: CSS not applying
**Solution**: Verify Tailwind CSS is configured in `tailwind.config.ts` and `globals.css`

### Issue: 404 on dashboard pages
**Solution**: Check that page.tsx files exist in correct subdirectories

## Performance Optimization Tips

1. **Lazy Loading**: Wrap heavy components
   ```typescript
   const JobMonitoringList = dynamic(() => import('@/components/pms/JobMonitoring'), {
     ssr: false
   })
   ```

2. **Memoization**: Memoize reusable components
   ```typescript
   export const MetricCard = memo(function MetricCard(props) { ... })
   ```

3. **Image Optimization**: Use Next.js Image component
   ```typescript
   import Image from 'next/image'
   ```

4. **Bundle Analysis**: Check bundle size
   ```bash
   npm install --save-dev @next/bundle-analyzer
   ```

## Next Steps

1. **Implement real API endpoints** for analytics and other dashboards
2. **Add WebSocket support** for real-time job updates
3. **Create user profile page** for account settings
4. **Add notification system** for alerts and events
5. **Implement export functionality** for reports
6. **Add dark mode** support
7. **Create mobile-responsive menu** for smaller screens
8. **Add accessibility features** (ARIA labels, keyboard navigation)

## Support & Debugging

### Enable Debug Logging

Add to `/lib/debug.ts`:

```typescript
export const debug = {
  dashboard: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Dashboard] ${message}`, data)
    }
  }
}
```

### Check TypeScript Errors

```bash
npx tsc --noEmit
```

### Validate Component Props

Each component includes TypeScript interfaces for type safety. Hover over components in VS Code to see required props.

## Deployment Considerations

- **Environment Variables**: Update `.env.production` with production URLs
- **CRON_SECRET**: Set a strong, random secret in production
- **NextAuth Secret**: Generate with `openssl rand -base64 32`
- **Database**: Ensure Prisma migrations are run
- **Build**: Run `npm run build` to verify no errors
- **Testing**: Run integration tests before deploying

## Quick Start Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build

# Run production build
npm start
```

Visit `http://localhost:3000/dashboard` to access the PMS dashboard system.
