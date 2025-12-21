# 🧪 Production Testing Guide - Auth Restructure

## Overview
This guide walks through testing all three authentication flows in production after the major auth restructure deployment (commit `e0a0594`).

**Deploy Status**: ✅ Phase 4 Complete  
**Commit**: `e0a0594` - Session management and AI context gating  
**Database**: ⚠️ Requires migration (see below)

---

## ⚠️ CRITICAL: Database Migration Required

Before testing, run migrations in production:

```bash
# 1. Generate Prisma client with new schema
npx prisma generate

# 2. Apply migrations (creates new tables/enums)
npx prisma migrate deploy

# 3. Run data migration (converts existing roles)
npx ts-node scripts/migrate-auth-restructure.ts
```

**What this does**:
- Creates `SessionType` enum (ADMIN, STAFF, GUEST)
- Creates `SystemRole` enum (OWNER, MANAGER, RECEPTION, STAFF, GUEST, AI_AGENT)
- Creates `QRPurpose` enum
- Creates `StaffSession` table
- Creates `GuestSession` table
- Adds fields to `User` table: `staffPassword`, `mustChangePassword`, `guestPassportId`, `guestRoomNumber`
- Migrates existing `User.role` string values to `SystemRole` enum

---

## 🧪 Testing Checklist

### Prerequisites
```bash
# Run setup script to create test data
npx ts-node scripts/test-auth-flows.ts
```

This will:
- ✅ Verify schema changes
- ✅ Create test admin account
- ✅ Create test staff account with QR token
- ✅ Create test guest QR token
- ✅ Output test URLs and credentials

---

## 1️⃣ Admin Flow Testing

### A. Registration Flow
1. **Navigate to**: `/admin/register`
2. **Expected**: Registration form with fields:
   - Name
   - Email
   - Password
   - Hotel Name
3. **Action**: Fill form and submit
4. **Expected**: Redirect to `/admin/login?registered=true`
5. **Verify**: Database contains:
   - New `Hotel` record
   - New `User` record with `role=OWNER`, `onboardingCompleted=false`

### B. Login Flow
1. **Navigate to**: `/admin/login`
2. **Expected**: Login form (blue gradient design)
3. **Action**: Enter credentials from test script
4. **Expected**: Redirect to `/admin/onboarding` (if not completed)
5. **Verify**: NextAuth session created (check cookies: `next-auth.session-token`)

### C. Onboarding Flow
1. **Expected**: Wizard UI with 5 steps
2. **Action**: Complete wizard (hotel info, rooms, staff, AI, review)
3. **Expected**: Redirect to `/dashboard`
4. **Verify**: `User.onboardingCompleted = true`

### D. Legacy Redirects
1. **Navigate to**: `/owner-login`
   - **Expected**: Redirect to `/admin/login`
2. **Navigate to**: `/register`
   - **Expected**: Redirect to `/admin/register`
3. **Navigate to**: `/onboarding`
   - **Expected**: Redirect to `/admin/onboarding`

---

## 2️⃣ Staff Flow Testing

### A. QR Access Flow
1. **Generate QR**: Use URL from test script output
   - Format: `/staff/access?token={32-char-token}`
2. **Navigate to QR URL**: Should show staff access page
3. **Expected**: 
   - If no password: Redirect to `/staff/password?token={token}`
   - If password exists: Redirect to staff login

### B. First-Time Password Creation
1. **Navigate to**: `/staff/password?token={token}`
2. **Expected**: Password creation form
3. **Action**: Enter new password + confirm
4. **Expected**: 
   - POST to `/api/staff/create-password`
   - Sets `User.staffPassword` (bcrypt hash)
   - Sets `User.mustChangePassword = false`
   - Redirect to staff login

### C. Staff Login
1. **Navigate to**: `/staff/access?token={token}` (with password set)
2. **Expected**: Login form
3. **Action**: Enter staff password
4. **Expected**:
   - POST to `/api/staff/login` with `{ token, password }`
   - Creates `StaffSession` record (8h expiry)
   - Returns `sessionToken` + permissions
   - Stores session in localStorage (`staff-session`)
   - Redirect to `/staff/console`

### D. Staff Console
1. **Expected**: Dashboard showing:
   - Tickets (if `canViewTickets`)
   - Knowledge Base (if `canAccessKB`)
   - AI Chat
   - Notifications
2. **Action**: Click on accessible features
3. **Verify**: Middleware adds headers:
   - `x-staff-id`
   - `x-hotel-id`
   - `x-session-type: STAFF`

### E. Staff Logout
1. **Action**: Click logout in console
2. **Expected**:
   - POST to `/api/staff/logout`
   - Deletes `StaffSession` from database
   - Clears localStorage
   - Redirect to `/staff/access`

---

## 3️⃣ Guest Flow Testing

### A. QR Access Flow
1. **Generate QR**: Use URL from test script output
   - Format: `/guest/access?token={32-char-token}`
2. **Navigate to QR URL**: Should show guest access page
3. **Expected**: Redirect to `/guest/identify?token={token}`

### B. Guest Identification
1. **Navigate to**: `/guest/identify?token={token}`
2. **Expected**: Form with:
   - Room Number field
   - OR Passport ID field
3. **Action**: Enter room number (e.g., "101")
4. **Expected**:
   - POST to `/api/guest/create-session` with `{ token, roomNumber }`
   - Resolves QR to get `hotelId`
   - Looks up guest by room in `Booking` table
   - Creates `Conversation` record
   - Creates `GuestSession` record (24h expiry)
   - Returns `sessionToken` + `conversationId`
   - Stores session in localStorage (`guest-session`)
   - Redirect to `/guest/chat`

### C. Guest Chat
1. **Expected**: Chat UI with:
   - Message history
   - Input field
   - Send button
2. **Action**: Type message and send
3. **Expected**:
   - POST to `/api/chat` with Bearer token
   - Body includes: `{ message, conversationId, hotelId, guestId }`
   - Middleware validates `GuestSession`
   - Sets headers: `x-guest-id`, `x-conversation-id`, `x-session-type: GUEST`
4. **Verify**: AI response appears in chat

### D. Context Gating
1. **Action**: Send chat message from guest
2. **Backend Verification**:
   - `/api/chat` calls `extractChatContext()`
   - Returns `{ role: 'GUEST', hotelId, guestId, conversationId }`
   - Validates `role === 'GUEST'` requires `guestId`
   - Enforces hotel boundary: session hotelId must match request hotelId
3. **Expected**: AI response scoped to guest context (no access to other hotels' data)

---

## 4️⃣ Middleware Verification

### Test Route Protection
```bash
# Should return 401 (no session)
curl https://YOUR_DOMAIN/staff/console

# Should return 401 (no session)
curl https://YOUR_DOMAIN/guest/chat

# Should redirect to /admin/login
curl -I https://YOUR_DOMAIN/dashboard
```

### Test Session Headers
1. **Staff Request** (with valid session):
   - Should include: `x-staff-id`, `x-hotel-id`, `x-session-type: STAFF`
2. **Guest Request** (with valid session):
   - Should include: `x-guest-id`, `x-conversation-id`, `x-session-type: GUEST`
3. **Admin Request** (with NextAuth):
   - Should include: `x-user-id`, `x-hotel-id`, `x-session-type: ADMIN`

---

## 5️⃣ AI Context Isolation

### Test Cross-Tenant Protection
1. **Setup**:
   - Create two hotels (Hotel A, Hotel B)
   - Create guest session for Hotel A
2. **Attack**: Guest from Hotel A tries to access Hotel B's data:
   ```json
   {
     "message": "Show me bookings",
     "hotelId": "hotel-b-id",  // ❌ Different hotel
     "conversationId": "conv-a-id"
   }
   ```
3. **Expected**: 403 Forbidden - "Hotel mismatch"

### Test Role Requirements
1. **Guest without guestId**:
   - **Expected**: 403 - "Guest context requires guestId"
2. **Staff without staffId**:
   - **Expected**: 403 - "Staff context requires staffId"

---

## 6️⃣ Session Expiry Testing

### Staff Session (8 hours)
1. **Create**: Staff logs in → session expires at `now + 8h`
2. **Wait**: 8 hours
3. **Action**: Try to access `/staff/console`
4. **Expected**: Middleware returns 401, redirects to `/staff/access`

### Guest Session (24 hours)
1. **Create**: Guest identifies → session expires at `now + 24h`
2. **Wait**: 24 hours
3. **Action**: Try to send chat message
4. **Expected**: 401 error, localStorage cleared

### Cleanup Script
```bash
# Run periodically to remove expired sessions
npx ts-node scripts/cleanup-sessions.ts
```

---

## 7️⃣ Common Issues & Troubleshooting

### Issue: "Role enum not found"
**Cause**: Migration not run  
**Fix**: Run `npx prisma migrate deploy`

### Issue: "staffPassword field doesn't exist"
**Cause**: Prisma client not regenerated  
**Fix**: Run `npx prisma generate`

### Issue: Staff/Guest sessions not validating
**Cause**: Middleware not updated  
**Fix**: Check [middleware.ts](middleware.ts) has latest changes from commit `e0a0594`

### Issue: AI chat returns 403
**Cause**: Context validation failed  
**Fix**: Check:
1. Session token in request (Bearer or cookie)
2. `hotelId` matches session
3. Role has required ID field (`guestId` for GUEST, `staffId` for STAFF)

### Issue: QR token doesn't resolve
**Cause**: No `GuestStaffQRToken` record  
**Fix**: Run test script to generate tokens: `npx ts-node scripts/test-auth-flows.ts`

---

## 8️⃣ Performance Checks

### Database Indexes
Verify indexes exist for:
- `StaffSession.sessionToken` (unique)
- `StaffSession.staffId`
- `StaffSession.expiresAt`
- `GuestSession.sessionToken` (unique)
- `GuestSession.conversationId`
- `GuestSession.expiresAt`

### Session Queries
```sql
-- Check active staff sessions
SELECT COUNT(*) FROM "StaffSession" WHERE "expiresAt" > NOW();

-- Check active guest sessions
SELECT COUNT(*) FROM "GuestSession" WHERE "expiresAt" > NOW();

-- Check expired sessions (should be cleaned up)
SELECT COUNT(*) FROM "StaffSession" WHERE "expiresAt" < NOW();
SELECT COUNT(*) FROM "GuestSession" WHERE "expiresAt" < NOW();
```

---

## 9️⃣ Security Validation

### ✅ Checklist
- [ ] Admin sessions use NextAuth JWT (secure, httpOnly)
- [ ] Staff sessions have 8h expiry
- [ ] Guest sessions have 24h expiry
- [ ] Passwords hashed with bcrypt (cost 12)
- [ ] Session tokens use nanoid (32 chars)
- [ ] Middleware validates all sessions before routing
- [ ] AI context gated by role + hotel boundary
- [ ] No cross-tenant data leaks possible
- [ ] QR tokens expire after 1 year (staff) / 7 days (guest)
- [ ] Suspended staff cannot create sessions

---

## 🎯 Success Criteria

All three flows must:
1. ✅ **Isolate Entry**: Admin never touches staff/guest flows, and vice versa
2. ✅ **Enforce Boundaries**: Middleware blocks invalid sessions
3. ✅ **Gate AI**: Chat API validates context before processing
4. ✅ **Expire Sessions**: Staff (8h) and guest (24h) sessions auto-expire
5. ✅ **Prevent Leaks**: No cross-tenant data access possible

**Pass Criteria**: Complete all tests above with zero security issues.

---

## 📊 Monitoring

### Metrics to Track
- **Session Creation Rate**: Staff vs Guest per day
- **Session Duration**: Average active time before expiry
- **Failed Login Attempts**: Staff password failures
- **Context Validation Failures**: 403 errors from /api/chat
- **QR Token Usage**: Scan rate per hotel

### Alerts
- **High 401 Rate**: Possible session expiry issues
- **High 403 Rate**: Possible attack or misconfiguration
- **Long Session Duration**: Sessions not expiring (check cleanup job)

---

## 🚀 Next Steps

After testing passes:
1. Enable monitoring dashboards
2. Set up session cleanup cron job
3. Document QR generation for hotel admins
4. Train hotel staff on password management
5. Add MFA for admin accounts (future phase)
6. Implement password reset flows (future phase)

---

**Documentation**: [AUTH_RESTRUCTURE_PLAN.md](AUTH_RESTRUCTURE_PLAN.md)  
**Implementation Commit**: `e0a0594`  
**Database Schema**: [prisma/schema.prisma](prisma/schema.prisma)  
**Middleware**: [middleware.ts](middleware.ts)
