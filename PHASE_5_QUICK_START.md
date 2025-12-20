# 🚀 Phase 5 Integration - Quick Start Guide

## 5-Minute Setup

### 1. Copy Environment File
```bash
cp .env.local.example .env.local
```

### 2. Generate NextAuth Secret
```bash
openssl rand -base64 32
# Copy output and paste into NEXTAUTH_SECRET in .env.local
```

### 3. Update .env.local
```env
DATABASE_URL=postgresql://[your-connection-string]
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=[paste-generated-secret]
CRON_SECRET=[generate-your-own-secret]
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. Sync Database
```bash
npx prisma db push
npx prisma generate
```

### 5. Start Development Server
```bash
npm run dev
```

### 6. Test It
- Go to http://localhost:3000/dashboard
- Login with your credentials
- You should be redirected to appropriate dashboard based on role

## 🎯 What's Now Available

### Admin Users Access
- ✅ `/dashboard/admin/pms` - Job monitoring
- ✅ `/dashboard/admin/settings` - Hotel configuration
- ✅ `/dashboard/analytics` - Metrics dashboard
- ✅ `/dashboard/staff/tasks` - Staff task management

### Staff Users Access
- ✅ `/dashboard/staff/tasks` - Assigned tasks
- ✅ Task filtering and management

### Guest Users Access
- ✅ `/dashboard/guest/bookings` - Booking management
- ✅ Check-in/out information
- ✅ Support contact info

## 🔧 How It Works

1. **Authentication**: NextAuth validates user
2. **Middleware**: Checks role and grants/denies access
3. **Navigation**: Shows only accessible menu items
4. **Dashboard**: Loads appropriate page with data

## 📊 File Changes Made

**Created**:
- `/app/dashboard/layout.tsx` - Dashboard wrapper
- `/app/dashboard/admin/layout.tsx` - Admin section
- `/app/dashboard/staff/layout.tsx` - Staff section
- `/app/dashboard/guest/layout.tsx` - Guest section
- `/app/dashboard/analytics/layout.tsx` - Analytics section
- `/middleware.ts` - Auth & RBAC middleware
- `/.env.local.example` - Environment template

**Updated**:
- `/app/dashboard/page.tsx` - Role-based redirect
- `/components/pms/DashboardNavigation.tsx` - Role filtering + user menu

## ✅ Verification

Check everything is working:

```bash
# Type checking
npx tsc --noEmit

# Lint check
npm run lint

# Test build
npm run build
```

All should show 0 errors!

## 🐛 Troubleshooting

**Issue**: "Module not found: @/components/pms/DashboardNavigation"
- **Fix**: Ensure `@` alias in `tsconfig.json` points to root

**Issue**: "NextAuth not configured"
- **Fix**: Ensure NextAuth route exists at `/app/api/auth/[...nextauth].ts`

**Issue**: "Middleware not executing"
- **Fix**: Clear `.next` folder and restart: `rm -rf .next && npm run dev`

**Issue**: "Session not loading"
- **Fix**: Ensure `SessionProvider` is in `/app/layout.tsx`

## 📖 Next Steps

1. **Connect APIs**: Update fetch calls in dashboards
2. **Test Flows**: Login as different roles and test
3. **Customize**: Adjust colors, logos, and branding
4. **Deploy**: Push to production with env vars

## 💡 Tips

- Use `[PHASE_5_QUICK_REFERENCE.md](PHASE_5_QUICK_REFERENCE.md)` for component details
- Check `[PHASE_5_COMPLETION.md](PHASE_5_COMPLETION.md)` for technical specs
- See `[MODULE_10_COMPLETE_SUMMARY.md](MODULE_10_COMPLETE_SUMMARY.md)` for full overview

---

**Status**: ✅ Integration Complete - Ready to Use!

Estimated time to full setup: **5-10 minutes** ⏱️

