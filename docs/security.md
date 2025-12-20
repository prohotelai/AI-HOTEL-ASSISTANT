# Security Architecture - RBAC Enforcement

**Status**: ✅ Production Ready  
**Last Updated**: December 17, 2025  
**Phase**: 10 - Production Readiness  

---

## Overview

The AI Hotel Assistant implements **mandatory Role-Based Access Control (RBAC)** enforcement across all sensitive API endpoints. This document describes the security architecture, middleware patterns, and enforcement mechanisms.

## Architecture Components

### 1. Authentication Middleware (`lib/auth/withAuth.ts`)

**Purpose**: Validates user session and extracts authentication context.

**Usage**:
```typescript
import { withAuth, AuthContext } from '@/lib/auth/withAuth'

export const GET = withAuth(async (req, ctx) => {
  const { userId, hotelId, role, email } = ctx
  // Handler logic
})
```

**Returns**:
- **401 Unauthorized**: No session exists
- **403 Forbidden**: Session exists but no hotel association
- **200+ Success**: Passes `AuthContext` to handler

**Context Structure**:
```typescript
interface AuthContext {
  userId: string      // User ID from session
  hotelId: string     // Hotel ID (tenant isolation)
  role: string        // User role (owner, manager, reception, staff)
  email?: string      // User email (optional)
}
```

### 2. Permission Middleware (`lib/middleware/rbac.ts`)

**Purpose**: Enforces permission-based access control using database-backed permissions.

**Available Functions**:
- `withPermission(permission: Permission)` - Require single permission
- `withAnyPermission(permissions: Permission[])` - Require any of multiple permissions
- `withRole(roles: string[])` - Require specific role (discouraged, use permissions instead)
- `hasPermission(userId, permission, hotelId)` - Check permission programmatically

**Usage**:
```typescript
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'

export const POST = withPermission(Permission.ADMIN_MANAGE)(async (req) => {
  // Only users with 'admin:manage' permission can access
})
```

**Returns**:
- **401 Unauthorized**: No session
- **403 Forbidden**: Lacks required permission or cross-hotel access attempt
- **500 Internal Error**: Permission check failed

### 3. Permission Registry (`lib/rbac.ts`)

**Available Permissions**:

**Tickets System**:
- `TICKETS_VIEW` - View tickets
- `TICKETS_CREATE` - Create new tickets
- `TICKETS_ASSIGN` - Assign tickets to staff
- `TICKETS_UPDATE` - Update ticket status/details
- `TICKETS_COMMENT` - Add comments to tickets
- `TICKETS_INTERNAL_NOTE` - Add internal staff notes
- `TICKETS_AUTOMATION` - Configure AI automation
- `TICKETS_TAGS` - Manage ticket tags

**Knowledge Base**:
- `KNOWLEDGE_BASE_VIEW` - View KB documents
- `KNOWLEDGE_BASE_MANAGE` - Upload/edit/delete documents

**PMS Integration** ⭐ New in Phase 10:
- `PMS_VIEW` - View PMS data
- `PMS_SYNC` - Trigger PMS synchronization
- `PMS_BOOKINGS_READ` - Read booking data
- `PMS_BOOKINGS_WRITE` - Create/update bookings
- `PMS_ROOMS_READ` - Read room data
- `PMS_ROOMS_WRITE` - Update room status
- `PMS_GUESTS_READ` - Read guest data
- `PMS_GUESTS_WRITE` - Create/update guests
- `PMS_CONFIG_MANAGE` - Configure PMS connections

**Administration**:
- `ADMIN_VIEW` - View admin dashboards/data
- `ADMIN_MANAGE` - Modify system configuration

**Staff Management**:
- `STAFF_VIEW` - View staff list
- `STAFF_CREATE` - Create new staff accounts
- `STAFF_EDIT` - Edit staff details
- `STAFF_DELETE` - Delete staff accounts
- `STAFF_INVITE` - Send staff invitations
- `HR_NOTES_VIEW` - View HR notes
- `HR_NOTES_CREATE` - Create HR notes
- `PERFORMANCE_VIEW` - View performance metrics
- `PERFORMANCE_EDIT` - Edit performance reviews

### 4. Role Permission Matrix

| Role | Key Permissions |
|------|----------------|
| **owner** | ALL permissions (full system access) |
| **manager** | All except ADMIN_MANAGE, STAFF_DELETE |
| **reception** | Tickets, KB view, PMS read operations |
| **staff** | Tickets view/create/comment, KB view |
| **ai_agent** | Tickets view/create/comment, automation, KB view |

**Permission Inheritance**: Owner role automatically has all permissions. Other roles have explicit permission lists.

## Protected API Routes

### ✅ Fully Protected Routes

**Chat System**:
- `POST /api/chat` - `withAuth` (any authenticated user)

**Tickets**:
- `GET /api/tickets` - `withPermission(TICKETS_VIEW)`
- `POST /api/tickets` - `withPermission(TICKETS_CREATE)`
- `GET /api/tickets/[id]` - `withPermission(TICKETS_VIEW)`
- `PATCH /api/tickets/[id]` - `withPermission(TICKETS_UPDATE)`
- `POST /api/tickets/[id]/comments` - `withPermission(TICKETS_COMMENT)`

**Knowledge Base**:
- `GET /api/knowledge-base/sources` - `withPermission(KNOWLEDGE_BASE_VIEW)`
- `POST /api/knowledge-base/sources` - `withPermission(KNOWLEDGE_BASE_MANAGE)`
- `GET /api/knowledge-base/documents` - `withPermission(KNOWLEDGE_BASE_VIEW)`
- `POST /api/knowledge-base/documents` - `withPermission(KNOWLEDGE_BASE_MANAGE)`

**PMS Integration**:
- `GET /api/pms/bookings` - `withPermission(ADMIN_VIEW)` + plan feature guard
- `POST /api/pms/bookings` - `withPermission(ADMIN_MANAGE)` + plan feature guard
- `GET /api/pms/rooms` - `withPermission(ADMIN_VIEW)` + plan feature guard
- `POST /api/pms/sync/*` - `withPermission(ADMIN_MANAGE)`
- `GET /api/admin/pms/configuration` - `withPermission(ADMIN_VIEW)`
- `POST /api/admin/pms/configuration` - `withPermission(ADMIN_VIEW)`

**QR Token Management** ⭐ Newly Protected:
- `POST /api/qr/generate` - `withPermission(ADMIN_MANAGE)`
- `GET /api/qr/tokens` - `withPermission(ADMIN_VIEW)`
- `DELETE /api/qr/tokens/[id]` - `withPermission(ADMIN_MANAGE)`

**Admin Functions** ⭐ Newly Protected:
- `POST /api/exports` - `withPermission(ADMIN_VIEW)`
- `GET /api/jobs/[id]` - `withPermission(ADMIN_VIEW)`
- `GET /api/session/me` - `withAuth`
- `GET /api/admin/staff` - `withRole(['owner', 'manager'])`
- `GET /api/analytics` - `withPermission(ADMIN_VIEW)`

### ⚠️ Intentionally Unprotected (Public/Special Auth)

**Authentication Endpoints**:
- `POST /api/auth/[...nextauth]` - NextAuth handler
- `POST /api/auth/guest/login` - Guest authentication
- `POST /api/register` - Hotel registration

**Webhooks** (Signature Verification):
- `POST /api/webhooks/mews` - HMAC signature verification
- `POST /api/webhooks/cloudbeds` - HMAC signature verification
- `POST /api/webhooks/opera` - HMAC signature verification

**QR Scan** (Public):
- `GET /api/qr/scan` - Public QR code scanning
- `GET /api/qr/validate` - Public token validation

**Health Checks**:
- `GET /api/health` - Public health check
- `GET /api/health/db` - Public database health

**CRON Jobs** (Secret Verification):
- `POST /api/cron/*` - Verifies `CRON_SECRET` header

## Multi-Tenant Isolation

### Hotel Scoping Rules

**Every protected endpoint MUST**:
1. Extract `hotelId` from session (via `withAuth` or `withPermission`)
2. Validate request `hotelId` matches session `hotelId`
3. Filter all database queries by `hotelId`

**Example Implementation**:
```typescript
export const GET = withAuth(async (req, ctx) => {
  const { hotelId } = ctx
  const { searchParams } = req.nextUrl
  const requestedHotelId = searchParams.get('hotelId')
  
  // Enforce hotel scoping
  if (requestedHotelId && requestedHotelId !== hotelId) {
    return NextResponse.json(
      { error: 'Forbidden - Cannot access other hotels data' },
      { status: 403 }
    )
  }
  
  // Query scoped to hotel
  const data = await prisma.someModel.findMany({
    where: { hotelId }  // ALWAYS filter by hotelId
  })
  
  return NextResponse.json(data)
})
```

### Cross-Hotel Attack Prevention

**Threat**: User from Hotel A attempts to access Hotel B's data.

**Defense**:
1. Session JWT contains `hotelId` (tamper-proof, signed with `NEXTAUTH_SECRET`)
2. Middleware validates session hotelId before handler execution
3. Handler enforces hotelId matching for all data access
4. Database queries ALWAYS filter by `hotelId`

**Result**: Cross-hotel access returns **403 Forbidden** before any data query.

## Security Best Practices

### 1. Never Trust Client Input

**❌ WRONG**:
```typescript
export async function POST(req: NextRequest) {
  const { hotelId } = await req.json()  // Client-controlled!
  const data = await prisma.booking.findMany({ where: { hotelId } })
  return NextResponse.json(data)
}
```

**✅ CORRECT**:
```typescript
export const POST = withAuth(async (req, ctx) => {
  const { hotelId } = ctx  // From authenticated session
  const data = await prisma.booking.findMany({ where: { hotelId } })
  return NextResponse.json(data)
})
```

### 2. Use Permissions, Not Roles

**❌ Discouraged**:
```typescript
if (user.role === 'manager') {
  // Role-based check
}
```

**✅ Preferred**:
```typescript
export const POST = withPermission(Permission.ADMIN_MANAGE)(async (req) => {
  // Permission-based enforcement
})
```

**Why**: Permissions are more granular and flexible. Adding new roles doesn't require code changes.

### 3. Validate Request Scoping

**Always validate that requested resource belongs to user's hotel**:
```typescript
export const GET = withAuth(async (req, ctx, { params }) => {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId }
  })
  
  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  
  // Verify hotel ownership
  if (booking.hotelId !== ctx.hotelId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  return NextResponse.json(booking)
})
```

### 4. Fail Securely

**Default to denial**:
- If permission check fails → 403 Forbidden
- If session invalid → 401 Unauthorized
- If hotel mismatch → 403 Forbidden
- If error occurs → 500 Internal Error (don't leak details)

## Testing RBAC

### Unit Tests

Run RBAC middleware tests:
```bash
npm test tests/integration/rbac.test.ts
```

**Coverage**:
- ✅ withAuth authentication checks
- ✅ withPermission permission enforcement
- ✅ Hotel scoping validation
- ✅ Cross-hotel access denial

### Manual Testing

**Test Permission Denial**:
```bash
# Get session token
TOKEN="<your-jwt-token>"

# Attempt access without permission (should return 403)
curl -X POST http://localhost:3000/api/admin/pms/configuration \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pmsType": "MEWS"}'
```

**Test Cross-Hotel Access**:
```bash
# User from Hotel A attempts to access Hotel B data
curl -X GET "http://localhost:3000/api/qr/tokens?hotelId=hotel-b" \
  -H "Authorization: Bearer $TOKEN_HOTEL_A"

# Expected: 403 Forbidden
```

### Integration Tests

Create E2E tests for critical flows:
```typescript
// tests/e2e/rbac-enforcement.spec.ts
test('Staff cannot access admin functions', async ({ page }) => {
  await loginAsStaff(page)
  const response = await page.goto('/api/admin/pms/configuration')
  expect(response?.status()).toBe(403)
})

test('Manager can view but not delete staff', async ({ page }) => {
  await loginAsManager(page)
  
  // Can view
  const viewResponse = await page.goto('/api/admin/staff')
  expect(viewResponse?.status()).toBe(200)
  
  // Cannot delete
  const deleteResponse = await page.request.delete('/api/admin/staff/user-123')
  expect(deleteResponse.status()).toBe(403)
})
```

## Migration Guide

### Adding Protection to Unprotected Route

**Before** (Vulnerable):
```typescript
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Handler logic
}
```

**After** (Protected):
```typescript
import { withPermission } from '@/lib/middleware/rbac'
import { Permission } from '@/lib/rbac'

async function handleGet(req: NextRequest) {
  // Handler logic
}

export const GET = withPermission(Permission.ADMIN_VIEW)(handleGet)
```

### Choosing the Right Middleware

**Use `withAuth`** when:
- Any authenticated user should access (e.g., `/api/session/me`)
- Handler implements custom authorization logic

**Use `withPermission`** when:
- Specific permission required (e.g., admin functions, data management)
- Most API endpoints should use this

**Use `withAnyPermission`** when:
- Multiple permissions grant access (e.g., `[ADMIN_VIEW, MANAGER_VIEW]`)

**Use `withRole`** when:
- Role-specific logic absolutely required (rare, use permissions instead)

## Audit & Compliance

### Permission Changes

All permission changes are logged via Prisma audit fields:
- `UserRole.assignedAt` - When role granted
- `UserRole.assignedBy` - Who granted the role

### Access Logging

Add access logging to sensitive operations:
```typescript
export const DELETE = withPermission(Permission.STAFF_DELETE)(async (req, ctx) => {
  const { params } = context
  
  // Log deletion attempt
  await prisma.auditLog.create({
    data: {
      action: 'STAFF_DELETE',
      userId: ctx.userId,
      hotelId: ctx.hotelId,
      targetId: params.staffId,
      timestamp: new Date()
    }
  })
  
  // Proceed with deletion
})
```

## Troubleshooting

### Common Issues

**403 Forbidden Despite Having Permission**:
1. Check user has UserRole with correct Role
2. Verify Role has RolePermission with required Permission
3. Check hotelId matches between user and resource
4. Verify permission key matches exactly (case-sensitive)

**Session Expires Frequently**:
- Check `NEXTAUTH_SECRET` is consistent across deployments
- Verify session maxAge in `authOptions` (default: 30 days)
- Check JWT token size isn't exceeding limits

**Permission Not Enforced**:
- Ensure route exports wrapped handler: `export const GET = withPermission(...)(handler)`
- Verify middleware is imported correctly
- Check for typos in permission enum

## Security Checklist

Before deploying to production:

- [ ] All sensitive routes wrapped with `withAuth` or `withPermission`
- [ ] No routes bypass RBAC (except auth, webhooks, cron, health)
- [ ] All database queries filter by `hotelId`
- [ ] Request `hotelId` validated against session `hotelId`
- [ ] Error messages don't leak sensitive information
- [ ] NEXTAUTH_SECRET is 32+ characters, securely stored
- [ ] Integration tests verify permission denial (403 responses)
- [ ] Cross-hotel access tests pass (returns 403)
- [ ] Audit logging enabled for sensitive operations

## References

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [OWASP Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)
- [Multi-Tenancy Best Practices](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models)

---

**Document Status**: Production Ready ✅  
**Next Review**: Post-Launch Security Audit  
**Maintained By**: Security Team + Backend Architecture
