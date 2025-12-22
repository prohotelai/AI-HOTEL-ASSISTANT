# Staff Management - Quick Reference

## 30-Second Overview

Staff Management allows admins to create staff **records** without creating User **accounts**. Staff records are created in PENDING status, then linked to User accounts when staff members sign up.

**Key Formula:**
```
Staff Record (name, email, role) + User Account (auth) = Complete Staff Profile
```

---

## Core Concepts

### Staff Record vs User Account
| Aspect | Staff Record | User Account |
|--------|------|------|
| Created by | Admin only | Auth flow (signup/activation) |
| Contains | Name, email, role, staffId | Password, email, auth tokens |
| Linked | Optional | Required |
| Status | PENDING → ACTIVE → INACTIVE | emailVerified or suspended |

### Status Lifecycle
```
PENDING  → ACTIVE   → INACTIVE  → TERMINATED
 (new)    (has User)  (disabled)  (archived)
```

### StaffId Format
```
ST-00001, ST-00002, ST-00003, ...
```
Generated automatically, unique per hotel.

---

## API Quick Commands

### Create Staff
```bash
curl -X POST http://localhost:3000/api/staff \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@hotel.com",
    "staffRole": "RECEPTION"
  }'
```

**Response:**
```json
{
  "success": true,
  "staff": {
    "staffId": "ST-00001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@hotel.com",
    "status": "PENDING"
  }
}
```

### List Staff
```bash
curl http://localhost:3000/api/staff \
  -H "Authorization: Bearer {token}"
```

**Filter by Status:**
```bash
curl "http://localhost:3000/api/staff?status=ACTIVE" \
  -H "Authorization: Bearer {token}"
```

**Filter by Role:**
```bash
curl "http://localhost:3000/api/staff?role=HOUSEKEEPING" \
  -H "Authorization: Bearer {token}"
```

---

## Service Functions

### Import
```typescript
import {
  createStaff,
  listStaffByHotel,
  getStaffById,
  getStaffByStaffId,
  updateStaffStatus,
  updateStaffDetails,
  deactivateStaff,
  linkUserToStaff
} from '@/lib/services/staffService'
```

### Create Staff
```typescript
const staff = await createStaff(hotelId, userId, {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@hotel.com',
  staffRole: 'RECEPTION'
})
// Returns: { id, staffId: 'ST-00001', status: 'PENDING', ... }
```

### List Staff
```typescript
const { staff, total } = await listStaffByHotel(hotelId, {
  status: 'ACTIVE',
  limit: 50
})
```

### Get by ID
```typescript
const staff = await getStaffById(staffId, hotelId)
```

### Get by StaffId
```typescript
const staff = await getStaffByStaffId('ST-00001', hotelId)
```

### Update Status
```typescript
await updateStaffStatus(staffId, hotelId, 'ACTIVE', userId)
```

### Update Details
```typescript
await updateStaffDetails(staffId, hotelId, {
  firstName: 'Jonathan',
  department: 'VIP Desk'
})
```

### Deactivate
```typescript
await deactivateStaff(staffId, hotelId, userId)
```

### Link to User
```typescript
await linkUserToStaff(staffId, userAuthId, hotelId)
// Status auto-set to ACTIVE
```

---

## Permissions Required

| Operation | Permission | Allowed Roles |
|-----------|-----------|---------------|
| Create Staff | `STAFF_CREATE` | OWNER, MANAGER |
| View Staff | `STAFF_VIEW` | OWNER, MANAGER, RECEPTION, STAFF |
| Update Staff | `STAFF_EDIT` | OWNER, MANAGER |
| Delete Staff | `STAFF_DELETE` | OWNER only |

---

## StaffRole Enum

```
RECEPTION
HOUSEKEEPING
MAINTENANCE
CONCIERGE
SECURITY
MANAGER
HR
ACCOUNTING
KITCHEN
BAR
ROOM_SERVICE
OTHER
```

---

## Common Workflows

### Workflow 1: Add Staff (Admin)
```typescript
// Step 1: Create staff record
const staff = await createStaff(hotelId, adminId, {
  firstName: 'Maria',
  lastName: 'Garcia',
  email: 'maria@hotel.com',
  staffRole: 'HOUSEKEEPING'
})

// Step 2: Send invitation email (separate flow)
await sendInvitationEmail(staff.email, {
  staffName: `${staff.firstName} ${staff.lastName}`,
  staffId: staff.staffId  // Optional: for staff to reference
})

// Step 3: Maria signs up via auth flow
// (Creates User account with staff email)

// Step 4: Link after signup (in activation flow)
await linkUserToStaff(staff.id, newUserId, hotelId)
// staff.status now ACTIVE
```

### Workflow 2: View Staff Dashboard
```typescript
// Manager views all staff
const { staff, total } = await listStaffByHotel(
  hotelId,
  { status: 'ACTIVE' }
)

// Render in table
staff.forEach(s => {
  console.log(`${s.staffId}: ${s.firstName} ${s.lastName} - ${s.staffRole}`)
  // ST-00001: Maria Garcia - HOUSEKEEPING
  // ST-00002: John Doe - RECEPTION
})
```

### Workflow 3: Deactivate Staff
```typescript
// Manager deactivates Maria
await deactivateStaff(mariaStaffId, hotelId, managerId)
// staff.status now INACTIVE
// maria.user still exists (can reactivate)
```

---

## Important Security Notes

### ✅ DO
- Always use `hotelId` from auth context
- Check permissions before operations
- Use service functions (not Prisma directly)
- Validate enum values
- Scope queries to hotel

### ❌ DON'T
- Accept `hotelId` from request body
- Skip permission checks
- Query Prisma directly in controllers
- Trust user input for enums
- Return staffId in public responses

---

## Troubleshooting

### "Email already exists"
**Cause:** Email uniqueness enforced per hotel  
**Solution:** Use different email or deactivate old staff record

### "Invalid staffRole"
**Cause:** staffRole not in enum  
**Solution:** Check against `Object.values(StaffRole)`

### "Forbidden" (403)
**Cause:** User lacks permission  
**Solution:** Check user role in permission matrix

### "Hotel not found" (404)
**Cause:** Invalid hotelId  
**Solution:** Verify hotelId exists and user belongs to it

---

## File Locations

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Staff model & enums |
| `lib/services/staffService.ts` | Service layer |
| `app/api/staff/route.ts` | API endpoints |
| `lib/rbac.ts` | Permissions |

---

## Database Constraints

```sql
-- Unique per hotel
UNIQUE (hotelId, staffId)
UNIQUE (hotelId, email)

-- User link
UNIQUE (userId)  -- Each user only one staff record

-- Indexes
INDEX (hotelId)
INDEX (status)
INDEX (staffRole)
```

---

## Testing Checklist

- [ ] Create staff with valid data
- [ ] Reject create without STAFF_CREATE permission
- [ ] List staff (all, by status, by role)
- [ ] Get staff by ID
- [ ] Get staff by staffId
- [ ] Update staff status
- [ ] Update staff details
- [ ] Deactivate staff
- [ ] Link user to staff (auto ACTIVE)
- [ ] Soft delete (no hard delete)
- [ ] Email uniqueness per hotel
- [ ] Hotel scoping enforced

---

## Related Documentation

- Full Guide: [STAFF_MANAGEMENT_GUIDE.md](STAFF_MANAGEMENT_GUIDE.md)
- RBAC: [lib/rbac.ts](lib/rbac.ts)
- Auth: [lib/auth/withAuth.ts](lib/auth/withAuth.ts)
- Schema: [prisma/schema.prisma](prisma/schema.prisma)

---

**Status:** ✅ Complete  
**Build:** ✅ Passing  
**Ready:** Testing → Staging → Production
