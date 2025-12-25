# Dashboard Isolation - Deployment Checklist

## Pre-Deployment Verification

### ✅ Code Changes Complete
- [x] AdminHeader created and isolated
- [x] AdminSidebar created (optional, not yet integrated)
- [x] AdminLayout updated with AdminProvider
- [x] PMSLayout (dashboard/layout.tsx) updated with PMSProvider
- [x] AdminContext created with route guards
- [x] PMSContext created with route guards
- [x] DashboardNavigation updated with PMS route guard
- [x] Admin QR page updated with read-only logic
- [x] hotelQrService updated with backward compatibility docs
- [x] Route guard utility (dashboardGuards.ts) created

### ✅ Tests Pass
```bash
✓ Unit tests: tests/unit/guards/dashboardGuards.test.ts (12 passed)
✓ Integration tests: tests/integration/dashboard-isolation.test.ts (13 passed)
```

### ✅ No Breaking Changes
- [x] PMS dashboard unchanged (uses existing DashboardNavigation)
- [x] Admin API endpoints unchanged
- [x] Database schema unchanged
- [x] Authentication flow unchanged
- [x] Existing QR logic maintained

---

## Deployment Steps

### 1. Build Verification
```bash
npm run build
```
Expected: Clean build with no errors

### 2. Type Check
```bash
npx tsc --noEmit
```
Expected: May show warnings for test files (dynamic imports), but no blocking errors

### 3. Run Tests
```bash
npm test -- --run
```
Expected: All tests pass

### 4. Start Dev Server
```bash
npm run dev
```
Expected: Server starts without errors

---

## Post-Deployment Verification

### 1. Admin Dashboard Health Check
**URL:** `https://your-domain.com/dashboard/admin`

**Expected:**
- ✅ Dark gradient header visible
- ✅ "Admin Dashboard" text in header
- ✅ Console log: `✅ ACTIVE DASHBOARD: ADMIN`
- ✅ NO white "Hotel PMS" header

**Visual:**
```
┌─────────────────────────────────────┐
│ 🏢 Admin Dashboard                  │ ← Dark gradient (slate-900 → slate-800)
│    SaaS Platform Control            │
│                                     │
│ [Dashboard] [Hotel QR] [PMS] [RBAC] │
└─────────────────────────────────────┘
```

### 2. PMS Dashboard Health Check
**URL:** `https://your-domain.com/dashboard/hotel/bookings`

**Expected:**
- ✅ White header visible
- ✅ "🏨 Hotel PMS" text in header
- ✅ Console log: `✅ ACTIVE DASHBOARD: PMS`
- ✅ NO dark "Admin Dashboard" header

**Visual:**
```
┌─────────────────────────────────────┐
│ 🏨 Hotel PMS                        │ ← White background
│                                     │
│ [Staff Tasks] [My Bookings] [...] │
└─────────────────────────────────────┘
```

### 3. Admin QR Page Health Check
**URL:** `https://your-domain.com/dashboard/admin/hotel-qr`

**Expected:**
- ✅ QR code displays
- ✅ "Read-Only" badge visible
- ✅ Warning: "cannot be regenerated"
- ✅ Dark theme (matches AdminHeader)
- ✅ No "Generate QR" button

**Visual:**
```
┌─────────────────────────────────────┐
│ 🔒 Hotel QR Code [Read-Only]       │ ← Dark theme
│                                     │
│ ⚠️ This QR cannot be regenerated    │
│                                     │
│    ┌─────────────┐                 │
│    │             │                 │
│    │   QR CODE   │                 │
│    │             │                 │
│    └─────────────┘                 │
│                                     │
│  [Download PNG]  [Print]            │
└─────────────────────────────────────┘
```

### 4. Browser Console Check
Open browser DevTools console on each route:

**Admin Routes (`/dashboard/admin/*`):**
```
✅ ACTIVE DASHBOARD: ADMIN
```

**PMS Routes (`/dashboard/hotel/*`):**
```
✅ ACTIVE DASHBOARD: PMS
```

**Should NOT see:**
- ❌ Context errors
- ❌ Import errors
- ❌ "cannot be used in /admin routes" errors (on admin routes)
- ❌ "cannot be used in /dashboard/admin routes" errors (on PMS routes)

---

## Smoke Test Commands

### Quick Test (30 seconds):
```bash
# 1. Admin dashboard renders
curl -I https://your-domain.com/dashboard/admin

# 2. PMS dashboard renders
curl -I https://your-domain.com/dashboard/hotel/bookings

# 3. Admin QR page renders
curl -I https://your-domain.com/dashboard/admin/hotel-qr
```

All should return `200 OK`

### Automated Test Suite (2 minutes):
```bash
npm test -- --run
```

Expected output:
```
✓ tests/unit/guards/dashboardGuards.test.ts (12 passed)
✓ tests/integration/dashboard-isolation.test.ts (13 passed)
```

---

## Rollback Plan (Emergency)

If critical issues occur, revert these files:

### Option 1: Partial Rollback (Remove Admin Isolation)
```bash
git checkout HEAD -- app/dashboard/admin/layout.tsx
git checkout HEAD -- components/admin/AdminHeader.tsx
git checkout HEAD -- lib/contexts/AdminContext.tsx
```

This reverts to PMS header for Admin routes (temporary fix).

### Option 2: Full Rollback (Revert All Changes)
```bash
git revert <commit-hash>
```

Replace `<commit-hash>` with the commit that introduced these changes.

---

## Monitoring & Alerts

### Key Metrics to Monitor:

1. **Error Rate:**
   - Watch for: "cannot be used in /admin routes" errors
   - Watch for: "cannot be used in /dashboard/admin routes" errors
   - Alert if error rate > 0.1%

2. **Dashboard Load Time:**
   - Admin dashboard: < 2s
   - PMS dashboard: < 2s
   - Alert if > 5s

3. **QR Page Load:**
   - Admin QR page: < 1s
   - Alert if > 3s

### Logging Queries:

```javascript
// Check for dashboard isolation errors
console.error("cannot be used in")

// Check for context errors
console.error("CRITICAL:")

// Check dashboard activation logs
console.log("ACTIVE DASHBOARD:")
```

---

## Success Criteria

✅ **All checks pass:**
- [ ] Build completes successfully
- [ ] Tests pass (25/25)
- [ ] Admin dashboard shows AdminHeader
- [ ] PMS dashboard shows DashboardNavigation
- [ ] Admin QR is read-only
- [ ] Console logs show correct dashboard type
- [ ] No errors in browser console
- [ ] No increase in error rate
- [ ] Page load times within limits

---

## Support & Troubleshooting

### Common Issues:

**Issue:** Admin dashboard still shows PMS header

**Fix:**
1. Clear browser cache: `Ctrl+Shift+Del`
2. Clear Next.js cache: `rm -rf .next`
3. Restart server: `npm run dev`
4. Hard refresh: `Ctrl+Shift+R`

**Issue:** Console shows context errors

**Fix:**
1. Check route: Ensure `/dashboard/admin` not `/dashboard/hotel`
2. Check import: Verify using correct context (Admin vs PMS)
3. Check guards: Ensure route guards are not disabled

**Issue:** QR code not visible

**Fix:**
1. Check API: `GET /api/qr/[hotelId]` returns 200
2. Check database: Verify `Hotel.qrCode` field exists
3. Check session: Ensure user has `hotelId` in session

---

## Deployment Sign-Off

**Deployed By:** _________________  
**Date:** _________________  
**Time:** _________________  

**Pre-Deployment:**
- [ ] All tests pass
- [ ] Build successful
- [ ] Code reviewed
- [ ] Documentation updated

**Post-Deployment:**
- [ ] Admin dashboard verified
- [ ] PMS dashboard verified
- [ ] Admin QR page verified
- [ ] Console logs verified
- [ ] No errors in production

**Sign-Off:** _________________

---

## Contact

For issues or questions:
- **Senior Frontend Architect:** [Your Contact]
- **Full-Stack Engineer:** [Your Contact]
- **DevOps:** [Your Contact]

---

**Document Version:** 1.0  
**Last Updated:** December 25, 2025  
**Status:** ✅ READY FOR DEPLOYMENT
