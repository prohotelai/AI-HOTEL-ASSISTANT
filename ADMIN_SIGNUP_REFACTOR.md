# Hotel Admin Signup Refactor - Complete Implementation

## Overview
Refactored the signup flow to allow **ONLY Hotel Admins** to sign up. Each signup now creates:
1. Admin User (role: OWNER)
2. Hotel entity (with auto-generated hotelId)
3. Both in a single atomic transaction

## Changes Made

### 1. New Admin Signup Service
**File**: [lib/services/adminSignupService.ts](lib/services/adminSignupService.ts)

```typescript
export async function createHotelAdminSignup(input: AdminSignupInput): Promise<AdminSignupResult>
```

**Features**:
- ✅ Creates User (role: OWNER) and Hotel in atomic transaction
- ✅ Generates unique hotelId format: `H-XXXXX` (e.g., H-AX2K9)
- ✅ Generates URL-friendly hotel slug
- ✅ Sets default subscription plan to STARTER
- ✅ Validates email uniqueness
- ✅ Validates password strength (min 8 chars)
- ✅ Uses bcrypt cost 12 for stronger admin passwords
- ✅ Rollback on hotel creation failure (no orphaned users)

**Validation**:
- Email must be valid format
- Password must be >= 8 characters
- Email must be unique
- Hotel name required

### 2. Updated Signup API Endpoint
**File**: [app/api/register/route.ts](app/api/register/route.ts)

**Changes**:
- Now accepts `hotelName` field (required)
- Calls `createHotelAdminSignup` service
- Returns hotelId in response
- Proper error handling for all validation failures
- Distinguishes between validation errors (400) and server errors (500)

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "admin@hotel.com",
  "password": "SecurePassword123",
  "hotelName": "Sunset Beach Resort"
}
```

**Success Response** (201):
```json
{
  "success": true,
  "message": "Hotel account created successfully",
  "userId": "cuid-string",
  "hotelId": "H-AX2K9",
  "email": "admin@hotel.com",
  "onboardingRequired": true
}
```

### 3. Updated Signup UI Page
**File**: [app/admin/register/page.tsx](app/admin/register/page.tsx)

**Changes**:
- Added "Hotel name" input field
- Client-side validation for all fields
- Clear error messages
- Form validation before submission

**Fields**:
- Full name (required)
- Email (required)
- Password (required, min 8 chars)
- Hotel name (required)

### 4. Updated Middleware
**File**: [middleware.ts](middleware.ts)

**Changes**:
- Added `/api/register` to public routes (accessible without auth)
- Added `/api/register` to emergency public routes
- Already had `/admin/register` in public routes

**Public Routes** (no auth required):
```typescript
const publicRoutes = [
  '/admin/login',
  '/admin/register',
  '/api/auth',
  '/api/register',  // NEW
  '/staff/access',
  '/guest/access',
  // ... others
]
```

## Authentication Flow After Signup

### Step 1: User Signup
```
POST /api/register
→ Creates User (role: OWNER, hotelId = H-XXXXX)
→ Creates Hotel (id = H-XXXXX)
→ Returns 201 with hotelId
```

### Step 2: Admin Login
```
POST /api/auth/signin (NextAuth)
→ JWT token includes:
  - userId
  - hotelId (H-XXXXX)
  - role (OWNER)
  - onboardingCompleted (false)
```

### Step 3: Middleware Routing
```
GET /dashboard
→ Middleware checks:
  - User is authenticated? ✓
  - Role is OWNER? ✓
  - Has hotelId? ✓
  - onboardingCompleted? ✗
→ Redirects to /admin/onboarding
```

### Step 4: Onboarding Wizard
```
GET /admin/onboarding
→ Fetches existing hotel (H-XXXXX)
→ Allows admin to:
  - Update hotel details
  - Configure PMS
  - Invite staff
  - Test AI chat
→ POST /api/onboarding/complete
→ Sets User.onboardingCompleted = true
```

### Step 5: Dashboard Access
```
GET /dashboard
→ Middleware checks:
  - onboardingCompleted? ✓
→ Allows access to dashboard
```

## Key Security Features

### Atomic Transactions
- User and Hotel created together
- If hotel creation fails, user creation rolls back
- No orphaned records possible

### Password Security
- Bcrypt cost 12 (stronger than previous cost 10)
- Minimum 8 characters enforced
- Never logged or returned in responses

### Tenant Isolation
- Each user must have valid hotelId
- Middleware enforces hotel boundaries
- Onboarding endpoints validate hotelId ownership

### Email Uniqueness
- Checked before transaction
- Database unique constraint as fallback

## What Did NOT Change

### ✅ Preserved Functionality
- NextAuth authentication system
- JWT tokens and session management
- Staff/Guest authentication flows (unchanged)
- PMS integration logic
- Onboarding wizard steps
- Role-based access control (RBAC)

### ✅ Backward Compatibility
- Old `/register` redirects to `/admin/register` (via middleware)
- Old `/api/onboarding/create-hotel` still works (legacy support)
- Existing admin sessions continue to work
- Database migrations not required (no schema changes)

## Error Handling

### Validation Errors (400)
- Email already exists
- Password too short
- Email format invalid
- Required field missing

### Server Errors (500)
- Database connection failure
- Transaction rollback
- Unexpected errors

**Example Error Response**:
```json
{
  "error": "An account with this email already exists"
}
```

## Testing the Flow

### 1. Test Signup
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Admin",
    "email": "admin@example.com",
    "password": "TestPassword123",
    "hotelName": "Test Hotel"
  }'
```

**Expected**: 201 with userId and hotelId

### 2. Test Login
Navigate to `/admin/login` and sign in with the email and password

**Expected**: Redirect to `/admin/onboarding` (since onboardingCompleted = false)

### 3. Test Onboarding
Complete the onboarding wizard steps

**Expected**: Redirect to `/dashboard` after completion

### 4. Test Dashboard Access
Navigate to `/dashboard`

**Expected**: Full dashboard access

## Database State After Signup

### User Record
```sql
SELECT * FROM "User" WHERE email = 'admin@example.com';
-- id: cuid-string
-- role: OWNER
-- hotelId: H-XXXXX
-- onboardingCompleted: false
-- password: bcrypt(cost=12)
```

### Hotel Record
```sql
SELECT * FROM "Hotel" WHERE id = 'H-XXXXX';
-- id: H-XXXXX
-- name: Test Hotel
-- slug: test-hotel
-- subscriptionPlan: STARTER
-- subscriptionStatus: ACTIVE
```

## Deployment Checklist

- [x] Code changes complete
- [x] TypeScript compiles without errors
- [x] Middleware allows signup routes without auth
- [x] Service handles transaction rollback
- [x] API endpoint returns proper error codes
- [x] UI form includes hotel name field
- [x] No PMS logic affected
- [x] No auth system changes
- [x] Backward compatible

## Monitoring & Alerts

### Success Metrics
- Track signup conversion rate (signups → onboarding)
- Monitor failed signup attempts
- Track hotelId generation rate

### Error Monitoring
- Failed hotel creation (transaction rollback)
- Duplicate email registration attempts
- Password validation failures

## Future Enhancements

1. **Email Verification**: Add email confirmation before full signup
2. **Hotel Availability Check**: Validate hotel name/slug format
3. **Stripe Integration**: Auto-create Stripe customer at signup
4. **Welcome Email**: Send onboarding guide after signup
5. **Password Reset**: Implement password reset flow
6. **MFA**: Add multi-factor authentication for admins

---

**Status**: ✅ Complete and Ready for Testing  
**Build**: ✅ Compiles successfully  
**Backward Compatible**: ✅ Yes  
**Database Migrations**: ✅ None required
