# PRODUCTION REVIEW - PHASE 3: INTEGRATION VERIFICATION

**Status:** ⏳ IN PROGRESS  
**Date:** December 22, 2025

---

## PHASE 3: Integration Verification Plan

### Overview

Phase 3 verifies that all 4 critical user flows work end-to-end:
1. **Admin Flow:** Signup → Wizard → Dashboard
2. **Staff Flow:** Admin creates → QR activation → Staff console
3. **Guest Flow:** QR scan → ID validation → Chat session
4. **Middleware:** Auth enforcement across all flows

### Flow 1: Admin Signup to Dashboard (HAPPY PATH)

**Steps:**
1. POST `/api/register` with name, email, password, hotelName
   - Verify: 200 response with userId, hotelId, onboardingRequired=true
   - Verify: User created with role OWNER, hotelId set
   - Verify: Hotel created with H-XXXXX format ID

2. GET `/api/session/me` with NextAuth token
   - Verify: Returns user object with role=OWNER, hotelId, onboardingCompleted=false

3. Navigate to `/onboarding` 
   - Verify: Wizard accessible (OWNER-only check passed)
   - Verify: Wizard bound to session.user.hotelId
   - Verify: All steps render (welcome, profile, settings, complete)

4. POST `/api/onboarding/profile` with hotel profile data
   - Verify: User.onboardingCompleted NOT yet true (still completing wizard)
   - Verify: OnboardingProgress created/updated

5. POST `/api/onboarding/complete` 
   - Verify: User.onboardingCompleted set to true
   - Verify: Redirect to /dashboard works

6. GET `/dashboard`
   - Verify: Dashboard accessible (auth + OWNER check)
   - Verify: Displays hotel name from onboarding

**Error Paths:**
- POST `/api/register` with existing email → 409 Conflict
- POST `/api/register` with short password → 400 Bad Request
- GET `/onboarding` without NextAuth session → 401 Unauthorized
- GET `/onboarding` with GUEST role → 403 Forbidden
- GET `/dashboard` without NextAuth session → 401 Unauthorized

---

### Flow 2: Staff Creation & Activation (HAPPY PATH)

**Step 1: Admin Creates Staff (Requires OWNER)**

POST `/api/staff` with hotelId, firstName, lastName, email, staffRole:
```json
{
  "hotelId": "H-ABC12",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@hotel.com",
  "staffRole": "FRONT_DESK"
}
```

**Verify:**
- ✅ 200 response with staffId (e.g., "ST-00001")
- ✅ Staff record created with status=PENDING
- ✅ NO User account created yet
- ✅ Staff.userId is null

**Error Paths:**
- POST `/api/staff` without auth → 401 Unauthorized
- POST `/api/staff` with STAFF role (no permission) → 403 Forbidden
- POST `/api/staff` with duplicate email (same hotel) → 409 Conflict
- POST `/api/staff` with invalid staffRole → 400 Bad Request

---

**Step 2: Admin Generates QR Code**

GET `/api/qr/{hotelId}`:
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgoA...",
  "content": "https://app.prohotelai.com/access?hotelId=H-ABC12"
}
```

**Verify:**
- ✅ QR content contains ONLY hotelId (no staffId, no secrets)
- ✅ QR redirects to /access?hotelId=H-ABC12
- ✅ isActive=true

---

**Step 3: Staff Scans QR & Selects Role**

1. GET `/access?hotelId=H-ABC12` 
   - Verify: Role selection page renders (guest vs staff buttons)

2. Click "Staff Login" → Navigate to `/staff/access?hotelId=H-ABC12`
   - Verify: Staff activation form renders
   - Verify: Asks for staffId, password (for new activation)

---

**Step 4: Staff Enters Credentials & Activates**

POST `/api/staff/activate` with hotelId, staffId, password:
```json
{
  "hotelId": "H-ABC12",
  "staffId": "ST-00001",
  "password": "SecurePassword123"
}
```

**Verify:**
- ✅ 200 response with staffSessionId, token
- ✅ User account created (password hashed, NOT plaintext)
- ✅ Staff.userId linked to new User
- ✅ Staff.status changed from PENDING to ACTIVE
- ✅ StaffSession created with token

**Error Paths:**
- POST `/api/staff/activate` with invalid staffId → 404 Not Found
- POST `/api/staff/activate` with already-active staffId → 409 Conflict
- POST `/api/staff/activate` with short password → 400 Bad Request

---

**Step 5: Staff Uses Token to Access Dashboard**

1. Client stores `staff-session` cookie with token
2. GET `/staff/console` with `staff-session` header
   - Verify: Staff console accessible (StaffSession validation in middleware)
   - Verify: Shows staff name, role, tasks
   - Verify: Middleware allows access (not 401)

**Error Paths:**
- GET `/staff/console` without `staff-session` cookie → 401 Unauthorized
- GET `/staff/console` with invalid token → 401 Unauthorized

---

### Flow 3: Guest Access via QR (HAPPY PATH)

**Step 1: Guest Scans QR & Selects Role**

1. GET `/access?hotelId=H-ABC12` → Role selection page
2. Click "Guest Access" → Navigate to `/guest/access?hotelId=H-ABC12`
   - Verify: Guest identification form renders (passport/ID input)

---

**Step 2: Guest Validates Identity**

POST `/api/guest/validate` with hotelId, documentType, documentNumber:
```json
{
  "hotelId": "H-ABC12",
  "documentType": "PASSPORT",
  "documentNumber": "A1234567"
}
```

**Verify:**
- ✅ 200 response with guestName, roomNumber, checkInDate, checkOutDate
- ✅ Guest record found in database
- ✅ Booking record exists and is active
- ✅ Stay period covers today's date

**Error Paths:**
- POST `/api/guest/validate` with invalid document → 404 Not Found
- POST `/api/guest/validate` with checkout date in past → 404 Not Found (inactive booking)
- POST `/api/guest/validate` with invalid documentType → 400 Bad Request

---

**Step 3: Guest Creates Session**

POST `/api/guest/session/create` with hotelId, documentType, documentNumber:
```json
{
  "hotelId": "H-ABC12",
  "documentType": "PASSPORT",
  "documentNumber": "A1234567"
}
```

**Verify:**
- ✅ 200 response with sessionId, sessionToken, expiresAt
- ✅ GuestSession created (NO User account)
- ✅ Session expires at guest checkout date
- ✅ NO password required

---

**Step 4: Guest Uses Session to Chat**

1. Client stores `guest-session` cookie with token
2. GET `/guest/chat` with `guest-session` header
   - Verify: Chat page accessible (GuestSession validation)
   - Verify: Can send messages via POST `/api/chat`
   - Verify: Messages scoped to this guest's hotelId

**Error Paths:**
- GET `/guest/chat` without `guest-session` cookie → 401 Unauthorized
- POST `/api/chat` with guest-session but hotelId mismatch → 403 Forbidden

---

### Flow 4: Middleware Auth Enforcement (SECURITY)

**Scenario 1: Unauthenticated Access to Protected Routes**

| Route | Method | No Auth | Expected |
|-------|--------|---------|----------|
| /dashboard | GET | No token | 401 Unauthorized |
| /admin/qr | GET | No token | 401 Unauthorized |
| /api/staff | POST | No header | 401 Unauthorized |
| /staff/console | GET | No staff-session | 401 Unauthorized |
| /guest/chat | GET | No guest-session | 401 Unauthorized |

**Verify:** All return 401, never 500

---

**Scenario 2: Role-Based Access Control**

| Route | Required Role | Test With | Expected |
|-------|---------------|-----------|----------|
| /admin/* | OWNER/ADMIN/MANAGER | GUEST | 403 Forbidden |
| /admin/* | OWNER/ADMIN/MANAGER | STAFF | 403 Forbidden |
| /dashboard | Any OWNER+ | GUEST | 403 Forbidden |
| /staff/console | STAFF token | GUEST token | 401 Unauthorized |
| /guest/chat | GUEST token | STAFF token | 401 Unauthorized |

**Verify:** All enforce role boundaries, no data leakage

---

**Scenario 3: hotelId Boundary Enforcement**

**Setup:**
- Hotel A (H-ABC12): User1 (hotelId=H-ABC12)
- Hotel B (H-XYZ99): User2 (hotelId=H-XYZ99)

**Test:**
1. User1 tries to access `/api/staff?hotelId=H-XYZ99` → 403 Forbidden (hotelId mismatch)
2. User1's hotelId extracted from JWT, not from request body
3. Verify: All queries include `where: { hotelId: sessionHotelId }`

**Verify:** No cross-tenant data leakage

---

**Scenario 4: Middleware Error Handling**

| Condition | Expected Response |
|-----------|------------------|
| Invalid NextAuth token | 401 Unauthorized (not 500) |
| Missing staff-session cookie | 401 Unauthorized (not 500) |
| Database timeout | 500 Internal Server Error (logged safely) |
| Malformed JWT | 401 Unauthorized (not 500) |

**Verify:** Auth errors → 401/403, system errors → 500 (with logging)

---

## TEST EXECUTION CHECKLIST

### Flow 1: Admin (6 tests)
- [ ] Admin signup creates User + Hotel atomically
- [ ] Onboarding wizard only accessible with OWNER role
- [ ] Wizard binding to session.hotelId works
- [ ] Dashboard accessible after onboarding complete
- [ ] GET /api/session/me returns correct role/hotelId
- [ ] Error paths return 400/401/403/409 (not 500)

### Flow 2: Staff (8 tests)
- [ ] Admin creates staff with OWNER permission
- [ ] Staff record created with status=PENDING (no User account)
- [ ] QR code generated with hotelId only
- [ ] Staff scans QR and activates with password
- [ ] User account created only at activation time
- [ ] Staff session cookie works for /staff/console
- [ ] Invalid staffId returns 404
- [ ] Error paths return 400/401/403/404/409 (not 500)

### Flow 3: Guest (6 tests)
- [ ] Guest validates identity via passport/ID
- [ ] No User account created for guest
- [ ] Guest session expires at checkout date
- [ ] Guest can access /guest/chat with session token
- [ ] Guest cannot access staff routes (401)
- [ ] Error paths return 400/401/404 (not 500)

### Flow 4: Security (8 tests)
- [ ] Unauthenticated requests return 401 (not 500)
- [ ] Role-based access works (403 for wrong role)
- [ ] hotelId extracted from JWT (not request body)
- [ ] Cross-tenant queries blocked
- [ ] Middleware doesn't throw 500 for auth failures
- [ ] Staff session token doesn't contain password
- [ ] Guest session token expires automatically
- [ ] No sensitive data in QR code

---

## SIGN-OFF CRITERIA

| Criterion | Status | Evidence Required |
|-----------|--------|------------------|
| All 4 flows execute | ⏳ | Test execution log |
| All error paths work | ⏳ | Error handling log |
| No 500 errors from auth | ⏳ | Request/response logs |
| hotelId isolation enforced | ⏳ | Cross-tenant test results |
| Passwords never exposed | ⏳ | Token inspection |
| Middleware works correctly | ⏳ | Route access log |

**Phase 3 Ready:** ✅ (Proceeding with integration tests)

---

## NEXT STEPS

1. Execute all 28 test scenarios
2. Document results in [PRODUCTION_REVIEW_PHASE3_RESULTS.md]
3. Fix any issues discovered
4. Proceed to Phase 4 (Vercel deployment prep)
5. Execute Phase 5 (Vercel deployment)

