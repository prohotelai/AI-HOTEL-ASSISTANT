# Dashboard Isolation - Smoke Test Guide

## Quick Verification Checklist

Run these manual tests after deployment to verify dashboard isolation is working correctly.

---

## ✅ Test 1: Admin Dashboard Renders Correctly

**Route:** `/dashboard/admin`

**Expected:**
- [ ] AdminHeader visible (dark gradient header with "Admin Dashboard" text)
- [ ] NO "Hotel PMS" header visible
- [ ] Console log shows: `✅ ACTIVE DASHBOARD: ADMIN`
- [ ] User avatar shows in top-right with "Platform Admin" label
- [ ] Navigation shows: Dashboard, Hotel QR, PMS Setup, RBAC, Settings

**Fail Conditions:**
- ❌ Shows "Hotel PMS" header
- ❌ Console shows: `✅ ACTIVE DASHBOARD: PMS`
- ❌ Header is white/light themed (that's PMS header)

---

## ✅ Test 2: PMS Dashboard Renders Correctly

**Route:** `/dashboard/hotel/bookings` or `/dashboard/staff/tasks`

**Expected:**
- [ ] DashboardNavigation visible (white header with "🏨 Hotel PMS" text)
- [ ] NO "Admin Dashboard" header visible
- [ ] Console log shows: `✅ ACTIVE DASHBOARD: PMS`
- [ ] Navigation shows: Admin Dashboard, Staff Tasks, My Bookings, etc.

**Fail Conditions:**
- ❌ Shows "Admin Dashboard" header (dark gradient)
- ❌ Console shows: `✅ ACTIVE DASHBOARD: ADMIN`

---

## ✅ Test 3: Admin QR Page Displays Correctly

**Route:** `/dashboard/admin/hotel-qr`

**Expected:**
- [ ] QR code displays
- [ ] "Read-Only" badge visible
- [ ] Warning box: "cannot be regenerated or changed"
- [ ] AdminHeader visible at top (NOT PMS header)
- [ ] No "Generate QR" or "Regenerate" buttons
- [ ] Console log: `✅ ACTIVE DASHBOARD: ADMIN`

**Fail Conditions:**
- ❌ Shows PMS header instead of AdminHeader
- ❌ Shows "Generate QR" button
- ❌ No QR code visible

---

## ✅ Test 4: Context Isolation

**Admin Route Test:**
Navigate to `/dashboard/admin` and open browser console.

**In Console, run:**
```javascript
// This should work:
console.log(window.location.pathname) // "/dashboard/admin"

// If you try to use PMS context in admin route, app should throw error
```

**Expected:**
- [ ] No errors in console related to context misuse
- [ ] AdminHeader renders successfully
- [ ] No PMSContext errors

**PMS Route Test:**
Navigate to `/dashboard/hotel/bookings` and check console.

**Expected:**
- [ ] DashboardNavigation renders successfully
- [ ] No AdminContext errors
- [ ] Console log: `✅ ACTIVE DASHBOARD: PMS`

---

## ✅ Test 5: Route Guard Errors (Expected Failures)

These tests verify guards are working by intentionally triggering them.

**Test 5a: Try to use Admin component in PMS route**
(This would require code change to test, but guards should prevent it)

**Test 5b: Try to use PMS component in Admin route**
(This would require code change to test, but guards should prevent it)

---

## 🔧 Automated Test Commands

Run these commands to execute automated tests:

```bash
# Unit tests for route guards
npm test -- tests/unit/guards/dashboardGuards.test.ts

# Integration tests for dashboard isolation
npm test -- tests/integration/dashboard-isolation.test.ts

# Run all dashboard-related tests
npm test -- --grep "dashboard"
```

---

## 🐛 Debugging Failed Tests

### Issue: Admin Dashboard shows PMS Header

**Cause:** Layout nesting issue or middleware problem.

**Fix:**
1. Check `/app/dashboard/admin/layout.tsx` - should use `AdminHeader`
2. Check middleware.ts - ensure `/dashboard/admin` routes are handled correctly
3. Clear Next.js cache: `rm -rf .next` and restart dev server

### Issue: QR Code not visible in Admin Dashboard

**Cause:** API endpoint or context issue.

**Fix:**
1. Check browser Network tab - verify `/api/qr/[hotelId]` request succeeds
2. Check console for errors related to `useAdminContext`
3. Verify hotel has QR code in database: Check `Hotel.qrCode` field

### Issue: Console logs show wrong dashboard type

**Cause:** Component imported in wrong place.

**Fix:**
1. Search codebase for incorrect imports
2. Verify guards are present in components
3. Check that route guards are not disabled

---

## 📊 Success Criteria

All tests pass when:
- ✅ Admin routes render AdminHeader (dark gradient)
- ✅ PMS routes render DashboardNavigation (white header with 🏨)
- ✅ QR is read-only in Admin dashboard
- ✅ No context errors in console
- ✅ Console logs show correct dashboard type
- ✅ No cross-dashboard component usage
- ✅ Automated tests pass without errors

---

## 📝 Test Results Template

```
Date: _____________
Tester: ___________
Environment: [ ] Local [ ] Staging [ ] Production

Test 1 (Admin Dashboard): [ ] PASS [ ] FAIL
Test 2 (PMS Dashboard): [ ] PASS [ ] FAIL
Test 3 (Admin QR Page): [ ] PASS [ ] FAIL
Test 4 (Context Isolation): [ ] PASS [ ] FAIL
Test 5 (Route Guards): [ ] PASS [ ] FAIL

Automated Tests: [ ] PASS [ ] FAIL

Notes:
_______________________________________________
_______________________________________________
_______________________________________________
```
