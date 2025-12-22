# PHASE 3: INTEGRATION TEST EXECUTION

**Status:** 🔄 IN PROGRESS  
**Date:** December 22, 2025  
**Start Time:** Now  
**Duration:** 2 hours (Phases 3-5)  
**Dev Server:** ✅ Running on http://localhost:3000

---

## TEST EXECUTION LOG

### FLOW 1: ADMIN SIGNUP TO DASHBOARD (6 tests)

#### Test 1.1: Admin Signup - Create User + Hotel
**Endpoint:** POST /api/register  
**Payload:**
```json
{
  "name": "Test Admin",
  "email": "admin-test-1@prohotel.test",
  "password": "TestPassword123",
  "hotelName": "Integration Test Hotel"
}
```

**Expected Response:** 
- Status: 200
- Contains: userId, hotelId (H-XXXXX format), onboardingRequired=true

**Result:** 🔄 Testing...

---

#### Test 1.2: Verify User Created with Correct Role
**Verify:**
- User exists in database
- role = OWNER
- hotelId = returned hotelId
- onboardingCompleted = false

**Result:** 🔄 Testing...

---

#### Test 1.3: Verify Hotel Created Atomically
**Verify:**
- Hotel exists in database
- id = returned hotelId
- name = "Integration Test Hotel"
- subscriptionPlan = STARTER
- subscriptionStatus = ACTIVE

**Result:** 🔄 Testing...

---

#### Test 1.4: Get Session with OWNER Role
**Endpoint:** GET /api/session/me  
**Headers:** NextAuth token (from signup)

**Expected Response:**
- Status: 200
- user.role = OWNER
- user.hotelId = signup hotelId
- user.email = signup email

**Result:** 🔄 Testing...

---

#### Test 1.5: Onboarding Wizard Accessible (OWNER Only)
**Endpoint:** GET /onboarding  
**Verify:**
- Status: 200 (not 403 or 401)
- Wizard rendered and bound to hotelId
- All steps accessible

**Result:** 🔄 Testing...

---

#### Test 1.6: Error Handling - Duplicate Email
**Endpoint:** POST /api/register  
**Payload:** Same email as Test 1.1

**Expected Response:**
- Status: 409 Conflict
- Message: Email already exists

**Result:** 🔄 Testing...

---

### FLOW 2: STAFF CREATION & ACTIVATION (8 tests)

#### Test 2.1: Admin Creates Staff Record
**Endpoint:** POST /api/staff  
**Auth:** NextAuth token from Flow 1 (OWNER)  
**Payload:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "staff-test-1@prohotel.test",
  "staffRole": "FRONT_DESK"
}
```

**Expected Response:**
- Status: 200
- staffId = ST-00001 (or sequential)
- status = PENDING

**Result:** 🔄 Testing...

---

#### Test 2.2: Verify No User Account Created Yet
**Verify:**
- Staff record exists with status=PENDING
- Staff.userId = null
- No User account created

**Result:** 🔄 Testing...

---

#### Test 2.3: Admin Cannot Create Staff Without Permission
**Endpoint:** POST /api/staff  
**Auth:** Token without STAFF_CREATE permission  

**Expected Response:**
- Status: 403 Forbidden
- Message: Permission denied

**Result:** 🔄 Testing...

---

#### Test 2.4: Get QR Code
**Endpoint:** GET /api/qr/{hotelId}  
**Auth:** OWNER token

**Expected Response:**
- Status: 200
- qrCode = PNG base64
- content = `https://localhost:3000/access?hotelId={hotelId}`
- No staffId, no passwords in URL

**Result:** 🔄 Testing...

---

#### Test 2.5: Staff Accesses QR Role Selection
**Endpoint:** GET /access?hotelId={hotelId}  
**Auth:** None (public)

**Expected Response:**
- Status: 200
- Role selection page rendered
- Guest vs Staff buttons available

**Result:** 🔄 Testing...

---

#### Test 2.6: Staff Navigates to Activation Form
**Endpoint:** GET /staff/access?hotelId={hotelId}  
**Auth:** None (public)

**Expected Response:**
- Status: 200
- Staff activation form rendered
- Asks for staffId, password

**Result:** 🔄 Testing...

---

#### Test 2.7: Staff Activates Account
**Endpoint:** POST /api/staff/activate  
**Payload:**
```json
{
  "hotelId": "{hotelId from Flow 1}",
  "staffId": "ST-00001",
  "password": "StaffPassword123"
}
```

**Expected Response:**
- Status: 200
- staffSessionId returned
- sessionToken returned
- User account NOW created (password hashed)

**Result:** 🔄 Testing...

---

#### Test 2.8: Staff Can Access Console with Token
**Endpoint:** GET /staff/console  
**Auth:** staff-session cookie with token from Test 2.7

**Expected Response:**
- Status: 200
- Staff console rendered
- Shows staff name, role, tasks

**Result:** 🔄 Testing...

---

### FLOW 3: GUEST SESSION ACCESS (6 tests)

#### Test 3.1: Guest Navigates to Role Selection
**Endpoint:** GET /access?hotelId={hotelId}  
**Auth:** None (public)

**Expected Response:**
- Status: 200
- Role selection (Guest vs Staff)

**Result:** 🔄 Testing...

---

#### Test 3.2: Guest Navigates to Identification Form
**Endpoint:** GET /guest/access?hotelId={hotelId}  
**Auth:** None (public)

**Expected Response:**
- Status: 200
- Guest identification form
- Document type selector (PASSPORT, NATIONAL_ID, etc.)

**Result:** 🔄 Testing...

---

#### Test 3.3: Guest Validates Identity
**Endpoint:** POST /api/guest/validate  
**Payload:**
```json
{
  "hotelId": "{hotelId}",
  "documentType": "PASSPORT",
  "documentNumber": "A1234567"
}
```

**Expected Response (if guest exists in DB):**
- Status: 200
- guestName, roomNumber, checkInDate, checkOutDate returned

**Expected Response (if guest not found):**
- Status: 404 Not Found

**Result:** 🔄 Testing...

---

#### Test 3.4: Guest Creates Session (No User Account)
**Endpoint:** POST /api/guest/session/create  
**Payload:**
```json
{
  "hotelId": "{hotelId}",
  "documentType": "PASSPORT",
  "documentNumber": "A1234567"
}
```

**Expected Response:**
- Status: 200
- sessionId returned
- sessionToken returned
- expiresAt returned (checkout date)
- NO User account created

**Result:** 🔄 Testing...

---

#### Test 3.5: Guest Can Access Chat
**Endpoint:** GET /guest/chat  
**Auth:** guest-session cookie from Test 3.4

**Expected Response:**
- Status: 200
- Chat interface rendered
- Can send messages

**Result:** 🔄 Testing...

---

#### Test 3.6: Error Handling - Invalid Document
**Endpoint:** POST /api/guest/validate  
**Payload:** Invalid documentNumber

**Expected Response:**
- Status: 404 Not Found
- Message: Guest not found

**Result:** 🔄 Testing...

---

### FLOW 4: MIDDLEWARE SECURITY (8 tests)

#### Test 4.1: Unauth Access to Dashboard Returns 401
**Endpoint:** GET /dashboard  
**Auth:** None

**Expected Response:**
- Status: 401 Unauthorized (not 500, not redirect)

**Result:** 🔄 Testing...

---

#### Test 4.2: Unauth Access to Admin Returns 401
**Endpoint:** GET /admin/qr  
**Auth:** None

**Expected Response:**
- Status: 401 Unauthorized

**Result:** 🔄 Testing...

---

#### Test 4.3: Staff Route Without Token Returns 401
**Endpoint:** GET /staff/console  
**Auth:** None

**Expected Response:**
- Status: 401 Unauthorized

**Result:** 🔄 Testing...

---

#### Test 4.4: Guest Route Without Token Returns 401
**Endpoint:** GET /guest/chat  
**Auth:** None

**Expected Response:**
- Status: 401 Unauthorized

**Result:** 🔄 Testing...

---

#### Test 4.5: Role-Based Access - GUEST Cannot Access Admin
**Endpoint:** GET /admin/qr  
**Auth:** NextAuth token with GUEST role

**Expected Response:**
- Status: 403 Forbidden (not 200)

**Result:** 🔄 Testing...

---

#### Test 4.6: hotelId Isolation - Cannot Access Other Hotel
**Endpoint:** POST /api/staff?hotelId=OTHER_HOTEL_ID  
**Auth:** OWNER token for different hotel

**Expected Response:**
- Status: 403 Forbidden or 404 Not Found
- Cannot access other tenant's data

**Result:** 🔄 Testing...

---

#### Test 4.7: Error Codes - No 500 for Auth Issues
**Test multiple endpoints without auth:**
- GET /api/session/me → 401 (not 500)
- POST /api/staff → 401 (not 500)
- GET /staff/console → 401 (not 500)

**Expected:** All return 401/403, never 500

**Result:** 🔄 Testing...

---

#### Test 4.8: Middleware Doesn't Crash
**Send malformed requests:**
- Missing Content-Type
- Invalid JSON
- Missing required fields

**Expected:** Proper error response (400, 401, 500 with logging, not crashes)

**Result:** 🔄 Testing...

---

## SUMMARY (To Be Completed)

### Tests Passed: 0/28
### Tests Failed: 0/28
### Tests Pending: 28/28

---

## NEXT STEPS
1. Execute each test scenario
2. Document PASS/FAIL
3. If any FAIL: Fix and re-test
4. When all PASS: Proceed to Phase 4

---

**Update this document as tests execute...**

