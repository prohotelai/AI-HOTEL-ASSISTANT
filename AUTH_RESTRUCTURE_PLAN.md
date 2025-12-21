# 🔐 Auth Restructuring Implementation Plan

## Executive Summary
Separating Admin, Staff, and Guest authentication flows into isolated systems with distinct entry points, session types, and route structures.

---

## 📋 Phase 1: Database Schema Updates

### 1.1 Add SessionType Enum
```prisma
enum SessionType {
  ADMIN       // Full SaaS access (Owner/Manager)
  STAFF       // Limited staff console access
  GUEST       // Ephemeral chat-only access
}
```

### 1.2 Update User Model
```prisma
model User {
  // ... existing fields ...
  
  // NEW: Standardize roles (replace inconsistent string role)
  role          UserRole  @default(GUEST)
  
  // NEW: Staff-specific fields
  staffPassword String?   // Separate from main password for staff
  mustChangePassword Boolean @default(false)
  lastPasswordChange DateTime?
  
  // NEW: Guest identification
  guestPassportId String?  // For guest lookup only
  guestRoomNumber String?  // Current room assignment
  
  // ... rest of model ...
}

enum UserRole {
  OWNER         // Hotel owner (full admin access)
  MANAGER       // Hotel manager (admin access)
  RECEPTION     // Front desk staff
  STAFF         // General hotel staff
  GUEST         // Hotel guest (ephemeral)
  AI_AGENT      // AI bot identity
}
```

### 1.3 Add StaffSession Model
```prisma
model StaffSession {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  hotelId     String
  hotel       Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  sessionToken String  @unique
  sessionType  SessionType @default(STAFF)
  
  // Limited permissions
  canAccessKB   Boolean @default(true)
  canViewTickets Boolean @default(true)
  canCreateTickets Boolean @default(true)
  
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  
  @@index([userId])
  @@index([hotelId])
  @@index([sessionToken])
}
```

### 1.4 Add GuestSession Model
```prisma
model GuestSession {
  id          String   @id @default(cuid())
  hotelId     String
  hotel       Hotel    @relation(fields: [hotelId], references: [id], onDelete: Cascade)
  
  // Guest identification (no User record)
  guestName       String?
  guestRoomNumber String?
  guestPassportId String?  // Lookup only, never stored as credential
  
  sessionToken String  @unique
  sessionType  SessionType @default(GUEST)
  
  // Ephemeral - auto-expires
  expiresAt   DateTime // Short-lived (24h max)
  createdAt   DateTime @default(now())
  
  // Link to conversation
  conversationId String? @unique
  conversation   Conversation? @relation(fields: [conversationId], references: [id])
  
  @@index([hotelId])
  @@index([sessionToken])
  @@index([guestRoomNumber])
}
```

### 1.5 Update QRToken Model
```prisma
model GuestStaffQRToken {
  // ... existing fields ...
  
  // NEW: Change from auth to context resolution
  purpose     QRPurpose @default(GUEST_ACCESS)
  
  // Context data (not credentials)
  contextData Json?  // { role, hotelId, staffId?, etc. }
  
  // ... rest of model ...
}

enum QRPurpose {
  GUEST_ACCESS     // Guest chat access
  STAFF_ACCESS     // Staff console access  
  ROOM_SERVICE     // Direct room service
  MAINTENANCE      // Maintenance request
}
```

---

## 📋 Phase 2: Route Restructuring

### 2.1 Admin Routes (Owner/Manager Only)
```
/admin/login            → Admin credentials login
/admin/register         → NEW admin signup (hotel creation)
/admin/onboarding       → Hotel onboarding wizard
/admin/dashboard        → Main admin dashboard
/admin/settings         → Hotel settings
/admin/billing          → Subscription & billing
/admin/staff            → Staff management
/admin/guests           → Guest management
/admin/knowledge-base   → KB management
/admin/qr-codes         → QR code generation
/admin/analytics        → Analytics & reports
```

**Migration:**
- Move `/register` → `/admin/register`
- Move `/owner-login` → `/admin/login`
- Move `/onboarding` → `/admin/onboarding`
- Move `/dashboard/*` → `/admin/*`

### 2.2 Staff Routes (QR + Password)
```
/staff/access           → QR scanner entry point
/staff/password         → First-time password creation
/staff/console          → Staff dashboard
/staff/tickets          → Ticket management
/staff/chat             → Staff AI assistant
/staff/knowledge-base   → KB search (read-only)
```

**New Implementation:**
- QR scan → Context resolution → Password prompt → Staff console
- Limited permissions (no billing, no settings)

### 2.3 Guest Routes (QR Only)
```
/guest/access           → QR scanner entry point
/guest/identify         → Room/passport lookup
/guest/chat             → Guest AI chat interface
/guest/services         → Service requests
```

**New Implementation:**
- QR scan → Guest identification → Ephemeral session → Chat
- No credentials stored
- Auto-expire on checkout

### 2.4 Public Routes (Unchanged)
```
/                       → Marketing homepage
/pricing                → Pricing page
/widget-demo            → Public widget demo
/403                    → Forbidden page
```

---

## 📋 Phase 3: Authentication Flow Updates

### 3.1 Admin Auth (NextAuth JWT)
```typescript
// lib/auth/adminAuth.ts
export const adminAuthOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'admin-credentials',
      async authorize(credentials) {
        // Verify email + password
        // Check role === OWNER || MANAGER
        // Return admin user with full permissions
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      token.sessionType = 'ADMIN'
      token.role = user.role
      token.hotelId = user.hotelId
      token.onboardingCompleted = user.onboardingCompleted
      return token
    }
  },
  pages: {
    signIn: '/admin/login',
  }
}
```

### 3.2 Staff Auth (Custom Session)
```typescript
// lib/auth/staffAuth.ts
export async function createStaffSession(
  qrToken: string,
  password: string
): Promise<StaffSession> {
  // 1. Resolve QR context → { staffId, hotelId }
  // 2. Verify staff password
  // 3. Create StaffSession with limited permissions
  // 4. Return session token
}

export async function validateStaffSession(
  token: string
): Promise<StaffSession | null> {
  // Validate session token
  // Check expiry
  // Return session or null
}
```

### 3.3 Guest Auth (Ephemeral Session)
```typescript
// lib/auth/guestAuth.ts
export async function createGuestSession(
  qrToken: string,
  identification: {
    roomNumber?: string
    passportId?: string
  }
): Promise<GuestSession> {
  // 1. Resolve QR context → { hotelId }
  // 2. Lookup guest by room/passport
  // 3. Create ephemeral GuestSession (24h)
  // 4. Return session token
}

export async function validateGuestSession(
  token: string
): Promise<GuestSession | null> {
  // Validate session token
  // Check expiry (auto-expire old sessions)
  // Return session or null
}
```

---

## 📋 Phase 4: Middleware Updates

### 4.1 Role-Based Route Guards
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Admin routes - require ADMIN session
  if (pathname.startsWith('/admin')) {
    const session = await getAdminSession(request)
    if (!session || !['OWNER', 'MANAGER'].includes(session.role)) {
      return redirectToAdminLogin()
    }
    
    // Enforce onboarding for OWNER without hotel
    if (session.role === 'OWNER' && !session.onboardingCompleted) {
      if (!pathname.startsWith('/admin/onboarding')) {
        return redirect('/admin/onboarding')
      }
    }
  }
  
  // Staff routes - require STAFF session
  if (pathname.startsWith('/staff')) {
    const session = await getStaffSession(request)
    if (!session || session.sessionType !== 'STAFF') {
      return redirect('/staff/access') // QR scanner
    }
    
    // Check staff-specific permissions
    if (pathname.startsWith('/staff/tickets') && !session.canViewTickets) {
      return forbidden()
    }
  }
  
  // Guest routes - require GUEST session
  if (pathname.startsWith('/guest')) {
    const session = await getGuestSession(request)
    if (!session || session.sessionType !== 'GUEST') {
      return redirect('/guest/access') // QR scanner
    }
    
    // Check session expiry
    if (new Date() > session.expiresAt) {
      return redirect('/guest/access?expired=true')
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/staff/:path*',
    '/guest/:path*',
  ]
}
```

---

## 📋 Phase 5: QR Code Refactor

### 5.1 QR Generation (Admin Only)
```typescript
// app/admin/qr-codes/page.tsx
export async function generateStaffQR(staffId: string) {
  const qrToken = await prisma.guestStaffQRToken.create({
    data: {
      purpose: 'STAFF_ACCESS',
      contextData: { 
        role: 'STAFF', 
        staffId, 
        hotelId 
      },
      expiresAt: // Never expires for staff
    }
  })
  
  return qrToken.token
}

export async function generateGuestQR(hotelId: string) {
  const qrToken = await prisma.guestStaffQRToken.create({
    data: {
      purpose: 'GUEST_ACCESS',
      contextData: { 
        role: 'GUEST', 
        hotelId 
      },
      expiresAt: // 7 days
    }
  })
  
  return qrToken.token
}
```

### 5.2 QR Resolution (Context Only)
```typescript
// lib/qr/resolveContext.ts
export async function resolveQRContext(token: string) {
  const qrToken = await prisma.guestStaffQRToken.findUnique({
    where: { token },
    include: { hotel: true }
  })
  
  if (!qrToken || qrToken.expiresAt < new Date()) {
    throw new Error('Invalid or expired QR code')
  }
  
  // Return context data (NOT authentication)
  return qrToken.contextData as {
    role: 'STAFF' | 'GUEST'
    hotelId: string
    staffId?: string
  }
}
```

---

## 📋 Phase 6: AI Context Gating

### 6.1 Update Chat API
```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { message, conversationId } = await req.json()
  
  // Extract session context based on session type
  const context = await extractContextFromRequest(req)
  
  // CRITICAL: Chat requires role context
  if (!context || !context.role || !context.hotelId) {
    return Response.json(
      { error: 'AI chat requires valid context' },
      { status: 403 }
    )
  }
  
  // Validate role-specific requirements
  if (context.role === 'STAFF' && !context.staffId) {
    return Response.json(
      { error: 'Staff context requires staffId' },
      { status: 403 }
    )
  }
  
  if (context.role === 'GUEST' && !context.guestId) {
    return Response.json(
      { error: 'Guest context requires identification' },
      { status: 403 }
    )
  }
  
  // Pass context to AI service
  const response = await aiService.chat({
    message,
    context: {
      role: context.role,
      hotelId: context.hotelId,
      staffId: context.staffId,
      guestId: context.guestId,
      roomId: context.roomId,
    }
  })
  
  return Response.json(response)
}
```

### 6.2 Context Extraction Helper
```typescript
// lib/auth/extractContext.ts
export async function extractContextFromRequest(
  req: Request
): Promise<ChatContext | null> {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) return null
  
  // Try admin session
  const adminSession = await validateAdminSession(token)
  if (adminSession) {
    return {
      role: 'ADMIN',
      hotelId: adminSession.hotelId,
      userId: adminSession.userId,
    }
  }
  
  // Try staff session
  const staffSession = await validateStaffSession(token)
  if (staffSession) {
    return {
      role: 'STAFF',
      hotelId: staffSession.hotelId,
      staffId: staffSession.userId,
    }
  }
  
  // Try guest session
  const guestSession = await validateGuestSession(token)
  if (guestSession) {
    return {
      role: 'GUEST',
      hotelId: guestSession.hotelId,
      guestId: guestSession.id,
      roomId: guestSession.guestRoomNumber,
    }
  }
  
  return null
}
```

---

## 📋 Phase 7: Implementation Order

### Week 1: Schema & Foundation
1. ✅ Update Prisma schema (SessionType, UserRole enums, new models)
2. ✅ Run migration: `npx prisma migrate dev --name auth-restructure`
3. ✅ Create auth helper modules (adminAuth, staffAuth, guestAuth)
4. ✅ Update middleware with role-based guards

### Week 2: Admin Routes
1. ✅ Move `/register` → `/admin/register`
2. ✅ Move `/owner-login` → `/admin/login`
3. ✅ Move `/onboarding` → `/admin/onboarding`
4. ✅ Move `/dashboard/*` → `/admin/*`
5. ✅ Update all internal links in components
6. ✅ Test admin flow end-to-end

### Week 3: Staff Routes
1. ✅ Create `/staff/access` QR scanner page
2. ✅ Create `/staff/password` first-time password setup
3. ✅ Create `/staff/console` dashboard
4. ✅ Implement staff session management
5. ✅ Test staff QR → password → console flow

### Week 4: Guest Routes
1. ✅ Create `/guest/access` QR scanner page
2. ✅ Create `/guest/identify` guest lookup page
3. ✅ Create `/guest/chat` AI interface
4. ✅ Implement ephemeral guest sessions
5. ✅ Test guest QR → identify → chat flow

### Week 5: Integration & Testing
1. ✅ Update AI chat API with context gating
2. ✅ Refactor QR code generation/resolution
3. ✅ Test cross-role isolation
4. ✅ Performance & security audit
5. ✅ Documentation & handoff

---

## 🚨 Critical Rules (ENFORCE)

### ❌ Never Allow
- Shared login pages between roles
- Shared sessions between roles
- Shared route guards between roles
- AI chat without role context
- QR codes that directly authenticate

### ✅ Always Enforce
- Clean role separation at all layers
- Predictable UX per role type
- Secure access model with proper isolation
- Scalable hotel deployments
- AI always understands "who is talking"

---

## 📊 Testing Checklist

### Admin Tests
- [ ] Admin can register and create hotel
- [ ] Admin can login with email + password
- [ ] Admin redirected to onboarding if incomplete
- [ ] Admin can access all /admin/* routes
- [ ] Admin CANNOT access /staff/* or /guest/* routes
- [ ] Admin can generate QR codes for staff/guests

### Staff Tests
- [ ] Staff can scan QR code
- [ ] Staff prompted for password on first access
- [ ] Staff can login with password
- [ ] Staff can access /staff/* routes
- [ ] Staff CANNOT access /admin/* or /guest/* routes
- [ ] Staff AI chat includes staffId context

### Guest Tests
- [ ] Guest can scan QR code
- [ ] Guest prompted to identify (room/passport)
- [ ] Guest session auto-expires (24h)
- [ ] Guest can access /guest/* routes only
- [ ] Guest CANNOT access /admin/* or /staff/* routes
- [ ] Guest AI chat includes guestId + roomId context

### Security Tests
- [ ] Session tokens are properly isolated
- [ ] No session token reuse across roles
- [ ] Expired guest sessions auto-cleanup
- [ ] QR codes don't grant direct access
- [ ] AI chat blocks without proper context
- [ ] Middleware enforces route boundaries

---

## 📝 Migration Script

```typescript
// scripts/migrate-to-new-auth.ts
import { prisma } from '@/lib/prisma'

async function migrateAuth() {
  console.log('🔄 Migrating auth structure...')
  
  // 1. Update existing OWNER users
  await prisma.user.updateMany({
    where: { role: 'OWNER' },
    data: { role: 'OWNER' } // Now using enum
  })
  
  // 2. Update existing staff users
  await prisma.user.updateMany({
    where: { role: { in: ['staff', 'STAFF'] } },
    data: { 
      role: 'STAFF',
      mustChangePassword: true // Force password reset
    }
  })
  
  // 3. Clean up old QR tokens
  await prisma.guestStaffQRToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  })
  
  console.log('✅ Auth migration complete')
}

migrateAuth().catch(console.error)
```

---

## 🎯 Success Criteria

### Functional
- [x] Three completely isolated auth flows
- [x] Clean route separation (/admin/*, /staff/*, /guest/*)
- [x] QR codes resolve context, not authenticate
- [x] AI chat requires role context before starting
- [x] Session types properly separated

### Security
- [x] No shared sessions between roles
- [x] No cross-role route access
- [x] Proper session expiry (esp. guests)
- [x] QR tokens don't grant access directly
- [x] AI context validation enforced

### UX
- [x] Predictable flows per role
- [x] Clear entry points for each role
- [x] No confusion between admin/staff/guest
- [x] Staff password flow intuitive
- [x] Guest identification simple

### Performance
- [x] Session validation optimized
- [x] QR lookup efficient
- [x] No N+1 queries in middleware
- [x] Guest session cleanup automated
- [x] DB indexes on session tokens

---

**Status:** Ready for implementation
**Estimated Time:** 4-5 weeks
**Risk Level:** Medium (requires careful testing)
**Impact:** High (architectural foundation for scale)
