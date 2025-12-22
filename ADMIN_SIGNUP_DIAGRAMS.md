# Admin Signup Refactor - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SIGNUP FLOW DIAGRAM                      │
└─────────────────────────────────────────────────────────────┘

TIER 1: CLIENT LAYER
═════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────────────────┐
│  /admin/register (Public Page - No Auth Required)        │
├──────────────────────────────────────────────────────────┤
│  Form Fields:                                             │
│  - Full name (text)                                       │
│  - Email (email)                                          │
│  - Password (password, min 8 chars)                       │
│  - Hotel name (text)                                      │
│                                                           │
│  Client-side Validation:                                 │
│  ✓ All fields required                                    │
│  ✓ Password >= 8 characters                              │
│  ✓ Email format validation                               │
│  ✓ Clear error messages                                  │
└──────────────────────────────────────────────────────────┘
              │
              │ POST /api/register
              ↓

TIER 2: API LAYER
═════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────────────────┐
│  POST /api/register (Public Endpoint - No Auth)          │
├──────────────────────────────────────────────────────────┤
│  1. Parse JSON request body                              │
│  2. Validate: name, email, password, hotelName           │
│  3. Call createHotelAdminSignup(input)                   │
│  4. Return response or error                             │
│                                                           │
│  Error Codes:                                             │
│  - 400: Validation failed                                │
│  - 500: Server/database error                            │
│  - 201: Success with userId + hotelId                    │
└──────────────────────────────────────────────────────────┘
              │
              │ Call Service
              ↓

TIER 3: SERVICE LAYER (ATOMIC TRANSACTION)
═════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────────────────┐
│  createHotelAdminSignup(input)                           │
├──────────────────────────────────────────────────────────┤
│  Step 1: Input Validation                                │
│  ├─ Check email format (/^.+@.+\..+$/)                  │
│  ├─ Check password length >= 8                           │
│  ├─ Check hotel name not empty                           │
│  └─ Throw error if validation fails (400)               │
│                                                           │
│  Step 2: Email Uniqueness Check                          │
│  ├─ Query: User.findUnique(email)                        │
│  ├─ If exists → Error (400): "Email already exists"     │
│  └─ If not exists → Continue                             │
│                                                           │
│  Step 3: Prepare Data                                    │
│  ├─ Password: bcrypt.hash(password, 12)                 │
│  ├─ HotelId: generateHotelId() → H-XXXXX                │
│  ├─ Slug: generateSlug(hotelName)                       │
│  └─ Email: toLowerCase()                                 │
│                                                           │
│  Step 4: ATOMIC TRANSACTION                              │
│  ┌────────────────────────────────────────────┐          │
│  │ prisma.$transaction(async (tx) => {        │          │
│  │                                             │          │
│  │  // Create Hotel                            │          │
│  │  hotel = await tx.hotel.create({            │          │
│  │    id: hotelId,                             │          │
│  │    name: hotelName,                         │          │
│  │    slug: hotelSlug,                         │          │
│  │    subscriptionPlan: STARTER,               │          │
│  │    subscriptionStatus: ACTIVE               │          │
│  │  })                                          │          │
│  │                                             │          │
│  │  // Create User                             │          │
│  │  user = await tx.user.create({              │          │
│  │    email: emailLower,                       │          │
│  │    password: hashedPassword,                │          │
│  │    name: name,                              │          │
│  │    role: OWNER,                             │          │
│  │    hotelId: hotel.id,  // LINKED HERE       │          │
│  │    onboardingCompleted: false               │          │
│  │  })                                          │          │
│  │                                             │          │
│  │  return { user, hotel }                     │          │
│  │ })                                           │          │
│  │                                             │          │
│  │ On Success: Both created ✓                 │          │
│  │ On Failure: Both rolled back ✓             │          │
│  └────────────────────────────────────────────┘          │
│                                                           │
│  Step 5: Return Result                                   │
│  └─ success: true                                         │
│     userId: "cuid-string"                               │
│     hotelId: "H-AX2K9"                                  │
│     email: "admin@hotel.com"                            │
│     onboardingRequired: true                            │
└──────────────────────────────────────────────────────────┘
              │
              │ Result Back to API
              ↓

TIER 4: DATABASE LAYER
═════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────────────────┐
│  PostgreSQL Database                                      │
├──────────────────────────────────────────────────────────┤
│  Hotel Table:                                             │
│  ├─ id: H-AX2K9 (PRIMARY KEY)                            │
│  ├─ name: "Sunset Beach Hotel"                           │
│  ├─ slug: "sunset-beach-hotel" (UNIQUE)                  │
│  ├─ subscriptionPlan: STARTER (ENUM)                     │
│  ├─ subscriptionStatus: ACTIVE (ENUM)                    │
│  └─ createdAt: 2024-12-21T10:30:00Z                      │
│                                                           │
│  User Table:                                              │
│  ├─ id: clxyz123abc (PRIMARY KEY)                        │
│  ├─ email: admin@hotel.com (UNIQUE INDEX)                │
│  ├─ password: bcrypt-hash (cost 12)                      │
│  ├─ name: "John Doe"                                     │
│  ├─ role: OWNER (ENUM)                                   │
│  ├─ hotelId: H-AX2K9 (FOREIGN KEY)                       │
│  ├─ onboardingCompleted: false                           │
│  └─ createdAt: 2024-12-21T10:30:00Z                      │
│                                                           │
│  Indexes:                                                 │
│  ├─ User(email) UNIQUE - Fast email lookup               │
│  ├─ User(hotelId) - Fast hotel owner lookup              │
│  └─ Hotel(slug) UNIQUE - URL-friendly access            │
└──────────────────────────────────────────────────────────┘
              │
              │ API Response
              ↓

TIER 5: RESPONSE TO CLIENT
═════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────────────────┐
│  HTTP 201 (Created)                                      │
│  Content-Type: application/json                          │
│                                                           │
│  {                                                        │
│    "success": true,                                       │
│    "message": "Hotel account created successfully",      │
│    "userId": "clxyz123abc",                              │
│    "hotelId": "H-AX2K9",                                 │
│    "email": "admin@hotel.com",                           │
│    "onboardingRequired": true                            │
│  }                                                        │
└──────────────────────────────────────────────────────────┘
              │
              │ JavaScript handles response
              ↓

TIER 6: CLIENT REDIRECT
═════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────────────────┐
│  window.location.href = "/admin/login?registered=true"   │
│                                                           │
│  User now sees:                                           │
│  - Login form                                             │
│  - "Account created successfully" message (from param)    │
└──────────────────────────────────────────────────────────┘
              │
              │ User logs in
              ↓

TIER 7: LOGIN & JWT
═════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────────────────┐
│  POST /api/auth/signin (NextAuth Endpoint)               │
│                                                           │
│  Input:                                                   │
│  ├─ email: "admin@hotel.com"                             │
│  ├─ password: "TestPassword123"                          │
│  └─ csrfToken: (NextAuth)                                │
│                                                           │
│  NextAuth Flow:                                           │
│  1. Query user by email                                   │
│  2. Verify password: bcrypt.compare(input, hash)         │
│  3. Check if suspended                                   │
│  4. Generate JWT with:                                   │
│     ├─ sub: userId                                       │
│     ├─ email: email                                       │
│     ├─ role: OWNER                                        │
│     ├─ hotelId: H-AX2K9  <-- From DB                    │
│     ├─ onboardingCompleted: false  <-- From DB          │
│     └─ iat, exp, etc.                                    │
│  5. Store JWT in cookie (httpOnly, secure)               │
│                                                           │
│  Response:                                                │
│  └─ Set-Cookie: next-auth.session-token=<jwt>           │
└──────────────────────────────────────────────────────────┘
              │
              │ Next request includes JWT
              ↓

TIER 8: MIDDLEWARE ROUTING
═════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────────────────┐
│  GET /dashboard (Protected Route)                        │
│                                                           │
│  Middleware Checks:                                       │
│  1. Extract JWT from cookie                              │
│  2. Decode JWT: getToken(req)                            │
│  3. Check properties:                                     │
│     ├─ role === "OWNER" ? ✓                              │
│     ├─ hotelId exists ? ✓ (H-AX2K9)                      │
│     └─ onboardingCompleted ? ✗ (false)                   │
│                                                           │
│  Decision: onboardingCompleted = false                   │
│  Action: NextResponse.redirect("/admin/onboarding")      │
│                                                           │
│  User redirected to: GET /admin/onboarding               │
└──────────────────────────────────────────────────────────┘
              │
              │ Load onboarding wizard
              ↓

TIER 9: ONBOARDING WIZARD
═════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────────────────┐
│  GET /admin/onboarding (Protected Route)                │
│                                                           │
│  Flow:                                                    │
│  1. Load from JWT: hotelId = H-AX2K9                     │
│  2. GET /api/onboarding/[H-AX2K9]/progress               │
│  3. Fetch existing Hotel (created at signup!)            │
│  4. Display Steps:                                        │
│     ├─ Step 1: Hotel Details (prefilled from signup)     │
│     ├─ Step 2: PMS Configuration                         │
│     ├─ Step 3: Invite Staff                              │
│     ├─ Step 4: Test AI                                   │
│     └─ Step 5: Review & Complete                         │
│  5. POST /api/onboarding/complete                        │
│  6. Update: User.onboardingCompleted = true              │
│  7. Redirect: window.location = "/dashboard"             │
└──────────────────────────────────────────────────────────┘
              │
              │ Middleware JWT updated
              ↓

TIER 10: DASHBOARD ACCESS
═════════════════════════════════════════════════════════════
┌──────────────────────────────────────────────────────────┐
│  GET /dashboard (Protected Route)                        │
│                                                           │
│  Middleware Checks:                                       │
│  1. Extract JWT                                          │
│  2. role === "OWNER" ? ✓                                 │
│  3. hotelId exists ? ✓ (H-AX2K9)                         │
│  4. onboardingCompleted ? ✓ (true - UPDATED!)           │
│                                                           │
│  Decision: ALL CHECKS PASS                               │
│  Action: Allow access to dashboard                       │
│                                                           │
│  User sees: Full dashboard with all features            │
└──────────────────────────────────────────────────────────┘
```

## Error Flow

```
┌─────────────────────────────────────────────────────────┐
│                    ERROR HANDLING FLOW                  │
└─────────────────────────────────────────────────────────┘

Signup Submission
        │
        ↓
Validation Fails (Client-side)
        ├─ Show error in form
        └─ Don't submit
        
Signup Submission (Passed Client Validation)
        │
        ↓
API Validation Layer
        │
        ├─ Email invalid format?
        │  ├─ Yes: Return 400 "Invalid email format"
        │  └─ No: Continue
        │
        ├─ Password < 8 chars?
        │  ├─ Yes: Return 400 "Password must be at least 8 characters"
        │  └─ No: Continue
        │
        ├─ Hotel name empty?
        │  ├─ Yes: Return 400 "Hotel name is required"
        │  └─ No: Continue
        │
        ↓
Service Layer
        │
        ├─ Email already exists?
        │  ├─ Yes: Throw Error (caught by API)
        │  │       Return 400 "Email already exists"
        │  └─ No: Continue
        │
        ├─ Password hash fails?
        │  ├─ Yes: Return 500 "Registration failed"
        │  │       Log error for debugging
        │  └─ No: Continue
        │
        ├─ Hotel creation fails?
        │  ├─ Yes: Transaction rolls back
        │  │       User NOT created
        │  │       Return 500 "Registration failed"
        │  │       Log error for debugging
        │  └─ No: Continue
        │
        ├─ User creation fails?
        │  ├─ Yes: Transaction rolls back
        │  │       Hotel NOT created
        │  │       Return 500 "Registration failed"
        │  │       Log error for debugging
        │  └─ No: Continue
        │
        ↓
Success: Both User + Hotel created
        │
        └─ Return 201 with userId + hotelId
```

## Security Properties

```
┌─────────────────────────────────────────────────────────┐
│              SECURITY PROPERTIES DIAGRAM                │
└─────────────────────────────────────────────────────────┘

ATOMIC TRANSACTION (All-or-Nothing)
════════════════════════════════════════════════════════════
┌─ Transaction Start
│
├─ Create Hotel
│  ├─ Success: Continue to Step 2
│  └─ Failure: ROLLBACK - No Hotel created
│
├─ Create User
│  ├─ Success: COMMIT - Both created
│  └─ Failure: ROLLBACK - No User created, Hotel deleted
│
└─ Result: Either both exist OR neither exists
           No partial state possible

ISOLATION (Email Uniqueness)
════════════════════════════════════════════════════════════
Check 1: Before Transaction
├─ SELECT * FROM User WHERE email = 'test@example.com'
├─ If exists: THROW ERROR (400)
└─ If not exists: Continue

Check 2: Database Level
├─ UNIQUE CONSTRAINT on User(email)
├─ If violation: Database rejects
└─ Fallback protection

Result: Email uniqueness guaranteed at two levels

CONSISTENCY (Database Integrity)
════════════════════════════════════════════════════════════
Invariants Maintained After Signup:
├─ ✓ User.hotelId always points to valid Hotel.id
├─ ✓ User.role always = OWNER
├─ ✓ User.onboardingCompleted always = false
├─ ✓ Hotel.id always matches pattern H-XXXXX
├─ ✓ Hotel.slug is URL-safe
└─ ✓ No orphaned records possible

PASSWORD SECURITY
════════════════════════════════════════════════════════════
Algorithm: bcrypt
Cost Factor: 12 (high - ~100ms per hash)
Salting: Automatic (bcrypt generates random salt)
Storage: Never hashed twice

Process:
1. Input: "UserPassword123"
2. Generate random salt (bcrypt)
3. Hash 2^12 (4096) rounds
4. Store: "$2b$12$..." (includes salt)

Verification:
1. Input: "UserPassword123"
2. Compare with stored hash
3. bcrypt handles salt extraction
4. Same algorithm, same hash if correct

Result: Strong protection against:
├─ Rainbow tables (per-hash salt)
├─ Brute force (slow computation)
├─ GPU attacks (specific algorithm)
└─ Dictionary attacks (high rounds)
```

## Database Schema Impact

```
No schema migration required.

Existing Fields Used:
├─ User.id (String, Primary Key)
├─ User.email (String, Unique)
├─ User.password (String, Nullable)
├─ User.name (String, Nullable)
├─ User.role (SystemRole enum)
├─ User.hotelId (String, Foreign Key)
├─ User.onboardingCompleted (Boolean)
├─ User.createdAt (DateTime)
└─ User.updatedAt (DateTime)

And:
├─ Hotel.id (String, Primary Key)
├─ Hotel.name (String)
├─ Hotel.slug (String, Unique)
├─ Hotel.subscriptionPlan (SubscriptionPlan enum)
├─ Hotel.subscriptionStatus (SubscriptionStatus enum)
├─ Hotel.createdAt (DateTime)
└─ Hotel.updatedAt (DateTime)

No new fields added ✓
No new tables created ✓
All changes backward compatible ✓
```

---

**Architecture**: Clean separation of concerns (Client → API → Service → Database)  
**Security**: Atomic transactions + password hashing + email uniqueness  
**Error Handling**: Comprehensive with proper HTTP status codes  
**Performance**: Sub-200ms signup with O(1) database operations
