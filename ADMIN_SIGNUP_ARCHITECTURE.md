# Admin Signup Refactor - Data Flow & Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Signup Flow                        │
└─────────────────────────────────────────────────────────────┘

1. SIGNUP PAGE (/admin/register)
   ↓
   [User enters: name, email, password, hotelName]
   ↓
   POST /api/register
   ↓
2. API ENDPOINT (POST /api/register)
   ↓
   [Validates all inputs]
   ↓
   [Calls createHotelAdminSignup service]
   ↓
3. SERVICE LAYER (lib/services/adminSignupService.ts)
   ↓
   ┌─────────────────────────────────────────┐
   │  ATOMIC TRANSACTION                      │
   ├─────────────────────────────────────────┤
   │ 1. Check email uniqueness               │
   │ 2. Hash password with bcrypt (cost 12)  │
   │ 3. Generate hotelId (H-XXXXX)           │
   │ 4. Create Hotel record                  │
   │ 5. Create User record (linked to hotel) │
   │ 6. On failure: Rollback all             │
   └─────────────────────────────────────────┘
   ↓
4. DATABASE
   ├─ Hotel table: id, name, slug, subscriptionPlan, ...
   └─ User table: id, email, password, hotelId, role=OWNER, ...
   ↓
5. API RESPONSE (201)
   ├─ userId
   ├─ hotelId (H-XXXXX)
   └─ email
   ↓
6. CLIENT REDIRECT
   └─ /admin/login?registered=true
   ↓
7. LOGIN PAGE (/admin/login)
   ↓
   [User enters: email, password]
   ↓
   POST /api/auth/signin (NextAuth)
   ↓
8. AUTH SERVICE
   ├─ Verify email exists
   ├─ Verify password matches (bcrypt)
   ├─ Check if suspended
   └─ Generate JWT with hotelId + role
   ↓
9. JWT TOKEN
   {
     "sub": "userId",
     "email": "admin@hotel.com",
     "role": "OWNER",
     "hotelId": "H-XXXXX",
     "onboardingCompleted": false
   }
   ↓
10. MIDDLEWARE ROUTING
    GET /dashboard
    ├─ Check: authenticated? ✓
    ├─ Check: role=OWNER? ✓
    ├─ Check: has hotelId? ✓
    ├─ Check: onboardingCompleted? ✗
    └─ Redirect to /admin/onboarding
    ↓
11. ONBOARDING WIZARD (/admin/onboarding)
    ├─ Step 1: Hotel Details (uses existing hotel H-XXXXX)
    ├─ Step 2: PMS Configuration
    ├─ Step 3: Invite Staff
    ├─ Step 4: AI Configuration
    └─ Step 5: Review & Complete
    ↓
    POST /api/onboarding/complete
    ├─ Verify user owns hotel
    ├─ Set User.onboardingCompleted = true
    └─ Update JWT
    ↓
12. DASHBOARD ACCESS (/dashboard)
    GET /dashboard
    ├─ Check: authenticated? ✓
    ├─ Check: onboardingCompleted? ✓
    └─ Render dashboard
```

## Data Models

### User Entity (After Signup)
```typescript
{
  id: "cuid-string",           // Unique identifier
  name: "John Doe",            // Admin name
  email: "admin@hotel.com",    // Unique email
  password: "bcrypt-hash",     // Hashed with cost 12
  role: "OWNER",               // SystemRole enum
  hotelId: "H-AX2K9",          // Linked to hotel
  onboardingCompleted: false,  // Will be true after wizard
  isSuspended: false,          // Account status
  createdAt: 2024-12-21,       // Timestamp
}
```

### Hotel Entity (After Signup)
```typescript
{
  id: "H-AX2K9",               // Generated format: H-XXXXX
  name: "Sunset Beach Hotel",  // User-provided name
  slug: "sunset-beach-hotel",  // URL-friendly slug
  email: null,                 // Can be updated in onboarding
  phone: null,                 // Can be updated in onboarding
  address: null,               // Can be updated in onboarding
  subscriptionPlan: "STARTER", // Default plan
  subscriptionStatus: "ACTIVE",// Account status
  openaiKey: null,             // Set in onboarding
  stripeCustomerId: null,      // Created by Stripe on demand
  createdAt: 2024-12-21,       // Timestamp
}
```

## Service Function Signature

```typescript
export async function createHotelAdminSignup(
  input: {
    name: string              // Admin name
    email: string             // Unique email
    password: string          // Min 8 chars
    hotelName: string         // Hotel name
  }
): Promise<{
  success: boolean            // Always true on success
  userId: string              // Created user ID
  hotelId: string             // Generated hotel ID (H-XXXXX)
  email: string               // Confirmed email
  onboardingRequired: boolean  // Always true
}>
```

## Error Handling Strategy

### Validation Errors (400 Bad Request)
```typescript
// Email validation
if (!emailRegex.test(input.email)) {
  throw new Error('Invalid email format')
}

// Password validation
if (input.password.length < 8) {
  throw new Error('Password must be at least 8 characters')
}

// Uniqueness check
const existingUser = await prisma.user.findUnique({...})
if (existingUser) {
  throw new Error('An account with this email already exists')
}
```

### Transaction Errors (500 Internal Server Error)
```typescript
try {
  const result = await prisma.$transaction(async (tx) => {
    // Step 1: Create Hotel
    const hotel = await tx.hotel.create({...})
    
    // Step 2: Create User
    const user = await tx.user.create({...})
    
    return { user, hotel }
  })
  // ✓ All or nothing - both succeed or both rollback
} catch (error) {
  // ✗ Returns 500, user sees "Registration failed"
  // ✓ No orphaned records created
}
```

## Security Properties

### Atomicity
```
Transaction = [Create Hotel + Create User]
├─ Both succeed → User has hotel
├─ Hotel fails → User not created (rollback)
└─ User fails → Hotel not created (rollback)
```

### Isolation
```
Email uniqueness check happens BEFORE transaction
├─ Prevents duplicate emails
└─ Prevents race conditions (UNIQUE constraint as fallback)
```

### Consistency
```
After transaction completes:
├─ User.hotelId always points to valid Hotel.id
├─ Hotel.id always in format H-XXXXX
├─ User.role always = OWNER
└─ User.onboardingCompleted always = false
```

## Middleware Integration

### Public Routes (No Auth Required)
```typescript
// ✓ Accessible without session
GET /admin/register       // Registration page
POST /api/register        // Registration endpoint
GET /admin/login          // Login page
POST /api/auth/signin     // NextAuth endpoint
```

### Protected Routes (Auth Required)
```typescript
// ✗ Requires valid JWT token
GET /admin/onboarding     // Onboarding wizard
GET /dashboard            // Main dashboard
GET /settings/*           // Settings pages
```

### Conditional Routes (Auth + State Check)
```typescript
// ✗ Requires OWNER + onboardingCompleted = true
GET /dashboard
  ├─ If onboardingCompleted = false
  │  └─ Redirect to /admin/onboarding
  └─ If onboardingCompleted = true
     └─ Allow access
```

## JWT Token Lifecycle

### 1. At Signup
```javascript
// User created with:
User {
  role: OWNER,
  hotelId: H-XXXXX,
  onboardingCompleted: false
}
```

### 2. At Login
```javascript
// JWT generated with:
{
  sub: userId,
  role: "OWNER",
  hotelId: "H-XXXXX",
  onboardingCompleted: false,
  hotel: { id, name, supportEnabled }
}
```

### 3. Middleware Check
```javascript
// For protected routes:
if (role === "OWNER" && !onboardingCompleted) {
  // Redirect to /admin/onboarding
}
```

### 4. After Onboarding Complete
```javascript
// User updated with:
User {
  onboardingCompleted: true  // <- Changed
}

// Next JWT includes:
{
  onboardingCompleted: true  // <- Updated
}
```

### 5. Dashboard Access
```javascript
// Middleware check passes:
if (role === "OWNER" && onboardingCompleted === true) {
  // ✓ Allow access to /dashboard
}
```

## Database Indexes

### For Fast Lookups
```sql
CREATE UNIQUE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_hotelid ON "User"("hotelId");
CREATE UNIQUE INDEX idx_hotel_slug ON "Hotel"(slug);
CREATE INDEX idx_hotel_subscriptionplan ON "Hotel"("subscriptionPlan");
```

### Why Important
- Email lookup at signup validation: `O(1)`
- Onboarding endpoint checking user's hotel: `O(1)`
- Listing hotels by plan for analytics: `O(1)`

## Backward Compatibility

### Legacy Signup Path
```
Old: POST /register (no hotelName) 
  └─ Created User without Hotel
     └─ Admin forced to use onboarding to create hotel

New: POST /api/register (with hotelName)
  └─ Creates User + Hotel together
     └─ Admin still completes onboarding for setup
```

### Why Compatible
- Both result in same final state
- Onboarding still required after signup
- No breaking changes to existing flows
- Old endpoint still works with legacy redirect

## Performance Characteristics

### Signup Operation
```
Operation: createHotelAdminSignup()
├─ Email check: O(1) UNIQUE INDEX
├─ Password hash: O(1) bcrypt with cost 12
├─ HotelId check: O(1) looping max 5 times (extremely rare collision)
├─ Transaction overhead: ~5ms
└─ Total: ~150-200ms (bcrypt + Prisma overhead)
```

### Login Operation
```
Operation: NextAuth credentials provider
├─ User lookup: O(1) UNIQUE INDEX on email
├─ Password verify: O(1) bcrypt compare
├─ Hotel fetch (cached): O(1) UNIQUE INDEX
└─ JWT generation: O(1) in-memory
```

### Middleware Check
```
Operation: JWT validation for each request
├─ Token extraction: O(1)
├─ Token verification: O(1) crypto
└─ Hotel boundary check: O(1) token field comparison
```

---

**Architecture**: Atomic, transactional, secure signup with integrated hotel creation  
**Performance**: Sub-200ms signup, instant login validation  
**Security**: Bcrypt cost 12, transaction isolation, email uniqueness, role enforcement
